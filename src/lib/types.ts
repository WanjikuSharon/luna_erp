// src/lib/types.ts

// --- User & Notifications ---
export type NotificationSettings = {
  receiveEmails: boolean;
  reportFrequency: 'daily' | 'weekly' | 'never';
};

// Legacy User type (for mock data compatibility)
export type LegacyUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operations_manager' | 'production_personnel';
  avatarUrl: string;
  notificationSettings?: NotificationSettings;
};

// Firestore User type (for authenticated users)
export type User = {
  uid: string; // Firebase Auth UID
  email: string;
  displayName?: string; // Made optional since it can be undefined
  name?: string; // Support legacy 'name' field
  avatarUrl?: string; // Support legacy 'avatarUrl' field
  role: 'admin' | 'sales' | 'operations' | 'production' | 'operations_manager' | 'production_personnel'; // Include legacy roles
  department?: string;
  photoURL?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: any; // Firestore Timestamp
  lastLogin: any; // Firestore Timestamp
  notificationSettings?: NotificationSettings;
};

// --- Inventory & Vendors ---
export type RawMaterial = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: 'kg' | 'liters' | 'units';
  reorderPoint: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: 'units';
  price: number;
  category?: string;
  packSize?: number;
};

// NEW: Packaging Material Type
export type PackagingMaterial = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: 'units' | 'rolls';
  reorderPoint: number;
};

// NEW: Vendor Type
export type Vendor = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
};

// --- Transactions & Logs ---
// UPDATED: Renamed and added vendor/unit
export type MaterialRequest = {
  id: string;
  materialId: string;
  quantity: number;
  unit: string; // Added
  vendorId: string; // Added
  requestedBy: string;
  requestedByName: string; // Name of requester at time of request
  status: 'pending' | 'approved' | 'awaiting_delivery' | 'delivered' | 'rejected';
  createdAt: any; // For Firestore Timestamp
  updatedAt: any; // For Firestore Timestamp
  deliveryNoteUrl?: string; // URL to the delivery note stored in Cloudinary
  supplierContacted?: boolean; // True when email sent to supplier
  supplierContactedAt?: any; // Timestamp when supplier was emailed
};

export type Activity = {
  id: string;
  user: {
    name: string;
    avatarUrl: string;
  };
  action: string;
  timestamp: any; // Firestore Timestamp
  details?: string; // Made optional since not all activities have details
};

// --- NEW: Types for Production Batch Flow ---

// From "RAW MATERIALS USED" form
export type BatchRawMaterial = {
  materialId: string;
  name: string; // For display
  quantity: number;
  weighed: boolean;
};

// From "Q.C. END PRODUCT ANALYSIS" form
export type QcAnalysisItem = {
  analysis: string; // e.g., "1. Colour appearance"
  standard: string;
  obtained: string;
};

// From "PACKAGING MATERIAL AND LABELS USED" form
export type BatchPackagingMaterial = {
  packagingId: string;
  name: string; // For display
  quantity: number;
};

// The main document that holds all production data for one batch
export type ProductionBatch = {
  id: string; // Firestore document ID
  
  // From "BATCH MANUFACTURING" form
  productId: string;
  productName: string; // For display
  dateOfMfg: any; // Firestore Timestamp
  batchNumber: string;
  batchSize: number;
  mfRef: string; // "M.F. Ref" from form
  
  // Array of materials from Form 1
  rawMaterialsUsed: BatchRawMaterial[];

  // NEW: QC Data, split into two parts
  qcRawMaterialChecks: {
    sealsOk: boolean;
    weightOk: boolean;
    materialOk: boolean;
  };
  qcEndProductAnalysis: {
    labelDetails: { // Label Details from Form 2
      dateOfMfg: any; // Firestore Timestamp
      expDate: any; // Firestore Timestamp
      batchNo: string;
      stocked: boolean;
      batchSheet: string;
      yield: string;
      expectedYield: string;
      percentYield: string;
      analysedBy: string;
      dateAnalysed: any; // Firestore Timestamp
      releaseForFilling: boolean;
    };
    analysisItems: QcAnalysisItem[];
    problems: string;
    improvement: string;
  };

  // Array of materials from Form 3
  packagingUsed: BatchPackagingMaterial[];

  // ERP System Fields
  status: 'Pending_QC' | 'Pending_Packaging' | 'Completed' | 'Rejected';
  createdBy: string; // User UID
  createdByName: string; // For display
  createdAt: any; // Firestore Timestamp
};

// --- NEW: Types for Product Recipes (Bill of Materials) ---
export type RecipeMaterial = {
  materialId: string;
  quantity: number; // Quantity of raw material needed to make ONE unit of the finished product
};

export type ProductRecipe = {
  id: string; // This will be the same as the Product ID
  materials: RecipeMaterial[];
};

// --- NEW: Types for Sales & Reconciliation ---

// Represents a salesperson
export type Salesperson = {
  id: string;
  name: string;
  phone?: string; // Added for the sales ledger
  // you can add more fields later, like 'region' or 'employeeId'
};

// Represents the data for a single product row in the reconciliation sheet
export type SalesRecordEntry = {
  productId: string;
  productName: string; // "Shower Gel - Juicy Mango"
  size: number; // 400
  openingStock: number;
  qtyIssued: number;
  qtySold: number;
  qtyReturned: number;
  defects: number;
  closingStock: number; // Will be calculated
};

// Represents the entire form submission
export type DailySalesReport = {
  id: string; // Firestore document ID
  date: any; // Firestore Timestamp
  salespersonId: string;
  salespersonName: string;
  // An array of all the product rows
  records: SalesRecordEntry[];
};

// NEW: Represents the data from the sales ledger (1000497324.jpg)
export type DailySalesLedgerEntry = {
  id: string; // Firestore document ID
  date: any; // Firestore Timestamp
  agentId: string;
  agentName: string;
  agentPhone: string;
  productsSold: number; // The "6", "3", "5"
  amountSold: number; // The "1880", "620", "11250"
  submittedBy: string; // User ID of submitter
  submittedByName: string; // Name of submitter at time of submission
  createdAt: any; // Firestore Timestamp
  // eTIMS Integration Fields
  etimsInvoiceNumber?: string; // Official KRA invoice number
  etimsQrCode?: string; // QR code data from KRA
  etimsScuReceiptNumber?: string; // SCU receipt number
  etimsSubmittedAt?: any; // Firestore Timestamp when submitted to eTIMS
  etimsVerificationUrl?: string; // URL to verify the invoice
  etimsStatus?: 'pending' | 'submitted' | 'failed'; // Status of eTIMS submission
  etimsError?: string; // Error message if submission failed
};

// NEW: Represents an item in a stock out/in log
export type VanStockItem = {
  productId: string;
  productName: string;
  quantity: number;
};

// NEW: Represents a single "Stock Out" or "Stock In" event
export type VanStockLog = {
  id: string; // Firestore document ID
  date: any; // Firestore Timestamp
  type: 'out' | 'in'; // Stock Out or Stock In
  agentId: string;
  agentName: string;
  submittedBy: string; // User ID of submitter
  submittedByName: string; // Name of submitter at time of submission
  items: VanStockItem[]; // Array of products
  createdAt: any; // Firestore Timestamp
};

// --- NEW: Types for eTIMS Integration ---

// Represents customer information for eTIMS invoice
export type EtimsCustomerInfo = {
  name: string;
  pin?: string; // Customer's PIN (optional for B2C)
  phoneNumber?: string;
  email?: string;
};

// Represents a line item for eTIMS invoice
export type EtimsInvoiceLineItem = {
  itemCode: string; // Product SKU
  itemName: string;
  quantity: number;
  unitPrice: number; // Price before tax
  taxRate: number; // e.g., 0.16 for 16% VAT
  discountAmount?: number;
};

// Represents the full eTIMS invoice data stored with sales entry
export type EtimsInvoiceData = {
  invoiceNumber: string; // Official KRA invoice number
  qrCode: string; // QR code data
  scuReceiptNumber: string; // SCU receipt number
  scuDateTime: string; // ISO timestamp from KRA
  verificationUrl: string; // URL to verify
  submittedAt: any; // Firestore Timestamp
  customer: EtimsCustomerInfo;
  items: EtimsInvoiceLineItem[];
  totals: {
    subtotal: number;
    totalTax: number;
    totalDiscount: number;
    total: number;
  };
};
