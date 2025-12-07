// src/services/etims_service.ts
/**
 * KRA eTIMS Integration Service
 * 
 * This service handles all communication with the Kenya Revenue Authority (KRA)
 * eTIMS Online Sales Control Unit (OSCU) API.
 * 
 * IMPORTANT: Before using this service:
 * 1. Register at etims.kra.go.ke
 * 2. Submit a Service Request for OSCU integration
 * 3. Get API credentials from KRA
 * 4. Add credentials to .env.local
 * 
 * API Documentation: https://etims.kra.go.ke/developer-portal
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('etims-service');

// ============================================
// TYPE DEFINITIONS
// ============================================

export type EtimsConfig = {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  deviceSerialNumber: string; // Your registered device/system identifier
  tin: string; // Your company's Tax Identification Number (PIN)
  branchId: string; // Your branch ID from KRA
  useSandbox: boolean; // true for testing, false for production
};

export type EtimsInvoiceItem = {
  itemCode: string; // Product SKU or eTIMS item code
  itemName: string;
  quantity: number;
  unitPrice: number; // Price per unit before tax
  taxRate: number; // VAT rate (typically 16% in Kenya = 0.16)
  discountAmount?: number; // Optional discount
};

export type EtimsCustomer = {
  name: string;
  pin?: string; // Customer's PIN (optional for B2C)
  phoneNumber?: string;
  email?: string;
};

export type EtimsInvoiceRequest = {
  customer: EtimsCustomer;
  items: EtimsInvoiceItem[];
  paymentMode: 'CASH' | 'CARD' | 'MPESA' | 'BANK' | 'CREDIT';
  receiptType: 'SALE' | 'REFUND' | 'TRAINING'; // Use 'TRAINING' for sandbox testing
  salesDate?: Date; // Defaults to current date/time
  invoiceNumber?: string; // Internal invoice number (if you have one)
};

export type EtimsInvoiceResponse = {
  success: boolean;
  invoiceNumber: string; // Official KRA invoice number
  internalInvoiceNumber: string; // Your internal invoice number
  qrCodeData: string; // QR code string to be rendered
  scuReceiptNumber: string; // Receipt number from the SCU
  scuDateTime: string; // ISO timestamp from KRA
  verificationUrl: string; // URL for customers to verify the invoice
  rawResponse?: any; // Full API response for debugging
  error?: string;
};

export type EtimsProductRegistration = {
  itemCode: string; // Your product SKU
  itemName: string;
  barcode?: string;
  taxType: 'A' | 'B' | 'C' | 'D'; // A=Exempt, B=VAT 16%, C=Zero Rated, D=Special
  unitPrice: number;
  packagingUnit: 'NT' | 'PC' | 'BX' | 'CT' | 'DOZ' | 'KG' | 'L'; // NT=Net, PC=Piece, BX=Box, CT=Carton, DOZ=Dozen, KG=Kilogram, L=Liter
};

// ============================================
// CONFIGURATION
// ============================================

/**
 * Load eTIMS configuration from environment variables
 */
function getEtimsConfig(): EtimsConfig {
  const useSandbox = process.env.ETIMS_USE_SANDBOX === 'true';
  
  return {
    apiUrl: useSandbox 
      ? (process.env.ETIMS_SANDBOX_URL || 'https://etims-api-sbx.kra.go.ke/etims-api')
      : (process.env.ETIMS_PRODUCTION_URL || 'https://etims-api.kra.go.ke/etims-api'),
    apiKey: process.env.ETIMS_API_KEY || '',
    apiSecret: process.env.ETIMS_API_SECRET || '',
    deviceSerialNumber: process.env.ETIMS_DEVICE_SERIAL || '',
    tin: process.env.ETIMS_COMPANY_PIN || '',
    branchId: process.env.ETIMS_BRANCH_ID || '00',
    useSandbox,
  };
}

/**
 * Validate that all required eTIMS credentials are configured
 */
export function validateEtimsConfig(): { valid: boolean; errors: string[] } {
  const config = getEtimsConfig();
  const errors: string[] = [];

  if (!config.apiKey) errors.push('ETIMS_API_KEY is not configured');
  if (!config.apiSecret) errors.push('ETIMS_API_SECRET is not configured');
  if (!config.deviceSerialNumber) errors.push('ETIMS_DEVICE_SERIAL is not configured');
  if (!config.tin) errors.push('ETIMS_COMPANY_PIN is not configured');

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// API UTILITIES
// ============================================

/**
 * Make a request to the eTIMS API
 */
async function etimsApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: any
): Promise<T> {
  const config = getEtimsConfig();
  const url = `${config.apiUrl}${endpoint}`;
  
  try {
    logger.info(`Making ${method} request to eTIMS: ${url}`);
    
    const requestBody = body ? {
      ...body,
      tin: config.tin,
      bhfId: config.branchId,
    } : undefined;
    
    logger.info('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'tin': config.tin,
        'bhfId': config.branchId,
        'cmcKey': config.apiSecret,
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const responseText = await response.text();
    logger.info('Response status:', response.status);
    logger.info('Response text:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logger.error('Failed to parse response as JSON:', responseText.substring(0, 200));
      throw new Error(`Invalid API response: ${responseText.substring(0, 100)}`);
    }

    logger.info('eTIMS API response:', data);
    return data as T;
  } catch (error) {
    logger.error('Failed to communicate with eTIMS API:', error);
    throw error;
  }
}

// ============================================
// PRODUCT REGISTRATION
// ============================================

/**
 * Register a product with eTIMS
 * This should be done once for each product before it can be included in invoices
 */
export async function registerProduct(
  product: EtimsProductRegistration
): Promise<{ success: boolean; itemCode: string; error?: string }> {
  const validation = validateEtimsConfig();
  if (!validation.valid) {
    logger.error('eTIMS not configured:', validation.errors);
    return {
      success: false,
      itemCode: product.itemCode,
      error: `Configuration error: ${validation.errors.join(', ')}`,
    };
  }

  try {
    // KRA eTIMS API format for product registration
    const response = await etimsApiRequest<any>('/saveItem', 'POST', {
      itemCd: product.itemCode,
      itemClsCd: '50101501', // Default HS Code - should be fetched from /selectItemClsList
      itemTyCd: '2', // 2=Finished Product
      itemNm: product.itemName,
      itemStdNm: product.itemName,
      orgnNatCd: 'KE', // Kenya
      pkgUnitCd: 'NT', // NT=Net (valid code for OSCU)
      qtyUnitCd: 'U', // U=Unit
      taxTyCd: product.taxType, // B=16% VAT (A=Exempt, B=16%, C=Zero Rated)
      btchNo: null,
      bcd: product.barcode || null,
      dftPrc: product.unitPrice,
      isrcAplcbYn: 'N',
      useYn: 'Y',
      regrId: 'System',
      regrNm: 'Luna ERP System',
      modrId: 'System',
      modrNm: 'Luna ERP System'
    });

    // Check KRA response
    if (response.resultCd === '000') {
      return {
        success: true,
        itemCode: product.itemCode,
      };
    } else {
      return {
        success: false,
        itemCode: product.itemCode,
        error: response.resultMsg || 'Registration failed',
      };
    }
  } catch (error: any) {
    logger.error(`Failed to register product ${product.itemCode}:`, error);
    return {
      success: false,
      itemCode: product.itemCode,
      error: error.message,
    };
  }
}

/**
 * Bulk register multiple products
 */
export async function registerProducts(
  products: EtimsProductRegistration[]
): Promise<{ succeeded: string[]; failed: { itemCode: string; error: string }[] }> {
  const results = await Promise.all(
    products.map(product => registerProduct(product))
  );

  return {
    succeeded: results.filter(r => r.success).map(r => r.itemCode),
    failed: results.filter(r => !r.success).map(r => ({ 
      itemCode: r.itemCode, 
      error: r.error || 'Unknown error' 
    })),
  };
}

// ============================================
// INVOICE SUBMISSION
// ============================================

/**
 * Calculate totals for an invoice
 */
function calculateInvoiceTotals(items: EtimsInvoiceItem[]) {
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  for (const item of items) {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discountAmount || 0;
    const itemTaxableAmount = itemSubtotal - itemDiscount;
    const itemTax = itemTaxableAmount * item.taxRate;

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalTax += itemTax;
  }

  const total = subtotal - totalDiscount + totalTax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Submit a sales invoice to eTIMS
 * This is the main function that will be called from the sales page
 */
export async function submitInvoice(
  request: EtimsInvoiceRequest
): Promise<EtimsInvoiceResponse> {
  const validation = validateEtimsConfig();
  if (!validation.valid) {
    logger.error('eTIMS not configured:', validation.errors);
    return {
      success: false,
      invoiceNumber: '',
      internalInvoiceNumber: request.invoiceNumber || '',
      qrCodeData: '',
      scuReceiptNumber: '',
      scuDateTime: '',
      verificationUrl: '',
      error: `Configuration error: ${validation.errors.join(', ')}`,
    };
  }

  try {
    const config = getEtimsConfig();
    const totals = calculateInvoiceTotals(request.items);
    const salesDate = request.salesDate || new Date();

    // Prepare the request body according to eTIMS API spec
    const requestBody = {
      branchId: config.branchId,
      receiptType: request.receiptType,
      paymentMode: request.paymentMode,
      salesDate: salesDate.toISOString(),
      customer: {
        name: request.customer.name,
        pin: request.customer.pin || null,
        phoneNumber: request.customer.phoneNumber || null,
        email: request.customer.email || null,
      },
      items: request.items.map(item => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discountAmount: item.discountAmount || 0,
      })),
      totals: {
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        totalTax: totals.totalTax,
        total: totals.total,
      },
      internalInvoiceNumber: request.invoiceNumber || null,
    };

    logger.info('Submitting invoice to eTIMS:', requestBody);

    const response = await etimsApiRequest<any>('/v1/invoices/submit', 'POST', requestBody);

    // Extract the key information from the response
    const invoiceNumber = response.data?.invoiceNumber || response.invoiceNumber;
    const qrCodeData = response.data?.qrCode || response.qrCode || '';
    const scuReceiptNumber = response.data?.receiptNumber || response.receiptNumber;
    const scuDateTime = response.data?.dateTime || new Date().toISOString();

    return {
      success: true,
      invoiceNumber,
      internalInvoiceNumber: request.invoiceNumber || '',
      qrCodeData,
      scuReceiptNumber,
      scuDateTime,
      verificationUrl: `https://etims.kra.go.ke/verify/${invoiceNumber}`,
      rawResponse: response,
    };
  } catch (error: any) {
    logger.error('Failed to submit invoice to eTIMS:', error);
    return {
      success: false,
      invoiceNumber: '',
      internalInvoiceNumber: request.invoiceNumber || '',
      qrCodeData: '',
      scuReceiptNumber: '',
      scuDateTime: '',
      verificationUrl: '',
      error: error.message || 'Unknown error occurred',
    };
  }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Verify an invoice by its number
 */
export async function verifyInvoice(invoiceNumber: string): Promise<{
  success: boolean;
  valid: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const response = await etimsApiRequest<any>(`/v1/invoices/verify/${invoiceNumber}`, 'GET');
    
    return {
      success: true,
      valid: response.valid || false,
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Check eTIMS service status
 */
export async function checkServiceStatus(): Promise<{
  online: boolean;
  message?: string;
}> {
  try {
    const response = await etimsApiRequest<any>('/v1/status', 'GET');
    return {
      online: response.status === 'online',
      message: response.message,
    };
  } catch (error: any) {
    return {
      online: false,
      message: error.message,
    };
  }
}
