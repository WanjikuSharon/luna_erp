// src/lib/types.ts

// --- User & Notifications ---
export type NotificationSettings = {
  receiveEmails: boolean;
  reportFrequency: 'daily' | 'weekly' | 'never';
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operations_manager' | 'production_personnel';
  avatarUrl: string;
  notificationSettings?: NotificationSettings; // Added
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
  status: 'pending' | 'approved' | 'delivered' | 'rejected';
  createdAt: any; // For Firestore Timestamp
  updatedAt: any; // For Firestore Timestamp
};

export type Activity = {
  id: string;
  user: {
    name: string;
    avatarUrl: string;
  };
  action: string;
  timestamp: string;
  details: string;
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
