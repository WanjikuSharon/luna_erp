# KRA eTIMS Integration Guide

## Overview

This document provides a complete guide to the KRA eTIMS (Electronic Tax Invoice Management System) integration in the Luna ERP system. The integration ensures all sales are compliant with Kenyan tax regulations by automatically generating official tax invoices through the Kenya Revenue Authority (KRA) API.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Setup Instructions](#setup-instructions)
4. [User Workflow](#user-workflow)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)
7. [Testing](#testing)

---

## Getting Started

### Prerequisites

Before implementing eTIMS integration, you must:

1. **Register with KRA eTIMS Portal**
   - Visit: https://etims.kra.go.ke
   - Log in with your company credentials
   - Complete the eTIMS onboarding process

2. **Request OSCU Integration**
   - Submit a Service Request through the portal
   - Select "Online Sales Control Unit (OSCU)" integration type
   - OSCU provides direct API-to-API integration (recommended for web-based ERPs)

3. **Obtain API Credentials**
   - Wait for KRA approval (typically 3-5 business days)
   - Receive API credentials via email or portal
   - Get access to the Sandbox environment for testing

---

## Architecture Overview

### Components

The eTIMS integration consists of the following components:

```
src/
├── services/
│   └── etims_service.ts          # Core eTIMS API service
├── app/api/etims/
│   ├── submit-invoice/route.ts   # Invoice submission endpoint
│   └── register-products/route.ts # Product registration endpoint
├── components/
│   ├── admin/
│   │   └── EtimsProductRegistration.tsx # Admin component for product registration
│   └── reports/
│       └── EtimsInvoice.tsx       # Invoice display and print component
└── app/(app)/sales/ledger/
    └── page.tsx                   # Sales ledger with eTIMS integration
```

### Data Flow

```
User logs sale
    ↓
Sale saved to Firestore (status: pending)
    ↓
User clicks "Generate eTIMS Invoice"
    ↓
Frontend calls /api/etims/submit-invoice
    ↓
API calls etims_service.ts → KRA eTIMS API
    ↓
KRA returns invoice number & QR code
    ↓
Firestore updated (status: submitted)
    ↓
User can view/print official invoice
```

---

## Setup Instructions

### Step 1: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# KRA eTIMS Configuration
ETIMS_USE_SANDBOX=true  # Set to false for production

# API Credentials (from KRA)
ETIMS_API_KEY=your_api_key_here
ETIMS_API_SECRET=your_api_secret_here

# Company Information
ETIMS_COMPANY_PIN=A000000000A  # Your KRA PIN
ETIMS_COMPANY_NAME=Luna Industries Ltd
ETIMS_BRANCH_ID=00  # 00 for main branch
ETIMS_DEVICE_SERIAL=LUNA-ERP-001

# Public Variables (for frontend)
NEXT_PUBLIC_ETIMS_COMPANY_NAME=Luna Industries Ltd
NEXT_PUBLIC_ETIMS_COMPANY_PIN=A000000000A

# API Endpoints (usually don't change)
ETIMS_SANDBOX_URL=https://etims-api-sbx.kra.go.ke/etims-api
ETIMS_PRODUCTION_URL=https://etims-api.kra.go.ke/etims-api
```

### Step 2: Register Products with eTIMS

Before generating invoices, all products must be registered with KRA:

1. Navigate to **Admin Panel** (add the component to an admin page)
2. Use the `EtimsProductRegistration` component
3. Click "Register All Products"
4. Wait for confirmation

**Example integration in admin page:**

```tsx
import { EtimsProductRegistration } from '@/components/admin/EtimsProductRegistration';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1>Admin Panel</h1>
      <EtimsProductRegistration />
    </div>
  );
}
```

### Step 3: Install Required Dependencies

The integration uses `crypto-js` for HMAC signatures:

```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

### Step 4: Test the Integration

1. Ensure `ETIMS_USE_SANDBOX=true`
2. Log a test sale in the Sales Ledger
3. Click "Generate eTIMS Invoice"
4. Verify the invoice is generated successfully
5. Check the KRA sandbox portal to confirm receipt

---

## User Workflow

### For Sales Staff

1. **Log a Sale**
   - Navigate to **Sales → Daily Sales Ledger**
   - Fill in the form:
     - Date
     - Sales Agent
     - Products Sold
     - Amount Sold
   - Click "Log Sale"

2. **Generate eTIMS Invoice**
   - Find the sale in the "Recent Sales Entries" table
   - Click "Generate eTIMS Invoice" button
   - Wait for confirmation toast
   - Status changes to "Submitted" with green badge

3. **View/Print Invoice**
   - Click "View Invoice" button
   - Official tax invoice opens in a dialog
   - Click "Print Invoice" to print
   - Invoice includes:
     - Company details and PIN
     - Official KRA invoice number
     - Customer details
     - Item breakdown
     - Tax calculation (16% VAT)
     - QR code for verification

### For Administrators

1. **Initial Setup**
   - Configure environment variables
   - Register all products with eTIMS
   - Test in sandbox environment

2. **Monitor Status**
   - Check eTIMS status badges in Sales Ledger
   - Failed submissions show error messages
   - Retry failed submissions if needed

---

## API Reference

### Service: `etims_service.ts`

#### `submitInvoice(request: EtimsInvoiceRequest)`

Submits a sales invoice to KRA eTIMS.

**Parameters:**
```typescript
{
  customer: {
    name: string;
    pin?: string;
    phoneNumber?: string;
    email?: string;
  },
  items: Array<{
    itemCode: string;
    itemName: string;
    quantity: number;
    unitPrice: number;  // Before tax
    taxRate: number;    // e.g., 0.16 for 16%
    discountAmount?: number;
  }>,
  paymentMode: 'CASH' | 'CARD' | 'MPESA' | 'BANK' | 'CREDIT',
  receiptType: 'SALE' | 'REFUND' | 'TRAINING',
  invoiceNumber?: string  // Internal reference
}
```

**Returns:**
```typescript
{
  success: boolean;
  invoiceNumber: string;        // Official KRA number
  qrCodeData: string;           // QR code string
  scuReceiptNumber: string;
  scuDateTime: string;
  verificationUrl: string;
  error?: string;
}
```

#### `registerProduct(product: EtimsProductRegistration)`

Registers a single product with eTIMS.

**Parameters:**
```typescript
{
  itemCode: string;     // Product SKU
  itemName: string;
  barcode?: string;
  taxType: 'A' | 'B' | 'C' | 'D';  // A=16% VAT
  unitPrice: number;
  packagingUnit: 'PC' | 'BX' | 'CT' | 'DOZ' | 'KG' | 'L';
}
```

#### `validateEtimsConfig()`

Checks if all required environment variables are configured.

**Returns:**
```typescript
{
  valid: boolean;
  errors: string[];
}
```

### API Routes

#### `POST /api/etims/submit-invoice`

Submits a sales entry to eTIMS.

**Request Body:**
```json
{
  "salesLedgerEntryId": "string",
  "customer": {
    "name": "string",
    "phoneNumber": "string"
  },
  "items": [...],
  "paymentMode": "CASH",
  "receiptType": "SALE"
}
```

#### `POST /api/etims/register-products`

Bulk registers products.

**Request Body:**
```json
{
  "products": [
    {
      "id": "string",
      "sku": "string",
      "name": "string",
      "unitPrice": 0
    }
  ]
}
```

#### `GET /api/etims/register-products`

Gets registration status.

**Response:**
```json
{
  "total": 100,
  "registered": 95,
  "notRegistered": 5
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Configuration error: ETIMS_API_KEY is not configured"

**Solution:** Add all required environment variables to `.env.local` and restart the dev server.

```bash
# Stop the server
Ctrl+C

# Restart
npm run dev
```

#### 2. "Failed to submit to eTIMS"

**Possible causes:**
- Invalid API credentials
- Products not registered
- Network connectivity issues
- KRA API downtime

**Steps to debug:**
1. Check browser console for detailed error
2. Verify credentials in `.env.local`
3. Ensure `ETIMS_USE_SANDBOX=true` for testing
4. Check if products are registered
5. Test KRA API availability

#### 3. "Product registration failed"

**Solution:**
- Verify product has valid SKU
- Check product name is not empty
- Ensure unit price is greater than 0
- Retry registration

#### 4. Invoice not printing correctly

**Solution:**
- Use Print Preview (Ctrl+P) to check layout
- Ensure QR code library is installed for production
- Check CSS print styles

### Debug Mode

Enable detailed logging:

```typescript
// In etims_service.ts
const logger = createLogger('etims-service', { level: 'debug' });
```

Check logs in browser console and server terminal.

---

## Testing

### Sandbox Testing

Always test in sandbox before production:

```env
ETIMS_USE_SANDBOX=true
```

### Test Scenarios

1. **Valid Sale Submission**
   - Create a sale
   - Submit to eTIMS
   - Verify invoice number received
   - Confirm in KRA sandbox portal

2. **Product Registration**
   - Register 1-2 test products
   - Verify success/failure responses
   - Check registration status

3. **Error Handling**
   - Try submitting with invalid data
   - Verify error messages are clear
   - Check that failed status is recorded

4. **Invoice Printing**
   - Generate invoice
   - Print preview
   - Verify all fields are populated
   - Check QR code display

### Production Checklist

Before going live:

- [ ] All products registered with eTIMS
- [ ] Environment variables configured for production
- [ ] `ETIMS_USE_SANDBOX=false`
- [ ] Valid production API credentials
- [ ] Test invoice generation in production
- [ ] Verify invoices appear in KRA portal
- [ ] Train staff on the workflow
- [ ] Set up monitoring for failed submissions

---

## Tax Types Reference

| Code | Description | Tax Rate |
|------|-------------|----------|
| A | VAT Standard | 16% |
| B | VAT Zero-Rated | 0% |
| C | VAT Exempt | N/A |
| D | Special Tax | Variable |

---

## Support

For issues related to:

- **ERP Integration:** Contact your development team
- **KRA eTIMS Portal:** Visit https://etims.kra.go.ke/support
- **API Documentation:** Check KRA developer portal

---

## Additional Resources

- [KRA eTIMS Official Portal](https://etims.kra.go.ke)
- [eTIMS User Manual](https://www.kra.go.ke/etims)
- [Tax Compliance Guide](https://www.kra.go.ke/help)

---

**Last Updated:** November 26, 2025  
**Version:** 1.0  
**Author:** Luna ERP Development Team
