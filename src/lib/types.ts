// Add NotificationSettings type
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
  notificationSettings?: NotificationSettings; // NEW: Make it optional for now
};

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

export type MaterialRequest = {
  id: string;
  materialId: string;
  quantity: number;
  requestedBy: string;
  status: 'pending' | 'approved' | 'delivered' | 'rejected';
  createdAt: string;
  updatedAt: string;
};

export type MaterialRequestWithVendor = {
  id: string;
  materialId: string;
  quantity: number;
  requestedBy: string;
  status: 'pending' | 'approved' | 'delivered' | 'rejected';
  vendorId: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
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

// NEW: Add Packaging Material Type
export type PackagingMaterial = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: 'units' | 'rolls'; // Example units
  reorderPoint: number;
};

// --- NEW: Types for Production Batch Flow ---

// From "RAW MATERIALS USED" form [cite: 1000490923.jpg]
export type BatchRawMaterial = {
  materialId: string;
  name: string; // For display
  quantity: number;
  weighed: boolean;
};

// From "Q.C. END PRODUCT ANALYSIS" form [cite: 1000490926.jpg]
export type QcAnalysisItem = {
  analysis: string; // e.g., "1. Colour appearance"
  standard: string;
  obtained: string;
};

// From "PACKAGING MATERIAL AND LABELS USED" form [cite: 1000490927.jpg]
export type BatchPackagingMaterial = {
  packagingId: string;
  name: string; // For display
  quantity: number;
};

// The main document that holds all production data for one batch
export type ProductionBatch = {
  id: string; // Firestore document ID
  
  // From "BATCH MANUFACTURING" form [cite: 1000490927.jpg]
  productId: string;
  productName: string; // For display
  dateOfMfg: any; // Firestore Timestamp
  batchNumber: string;
  batchSize: number;
  mfRef: string; // "M.F. Ref" from form
  
  // Array of materials from Form 1
  rawMaterialsUsed: BatchRawMaterial[];

  // Array of QC checks from Form 2
  qcAnalysis: QcAnalysisItem[];
  qcLabelDetails: { // Label Details from Form 2 [cite: 1000490926.jpg]
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
  qcProblems: string; // "Problems encountered" from Form 2

  // Array of materials from Form 3
  packagingUsed: BatchPackagingMaterial[];

  // ERP System Fields
  status: 'Pending_QC' | 'Pending_Packaging' | 'Completed' | 'Rejected';
  createdBy: string; // User UID
  createdAt: any; // Firestore Timestamp
};
