// src/lib/schemas.ts
import { z } from 'zod';

/**
 * Centralized Zod Schemas for Luna ERP
 * 
 * This file contains all validation schemas used throughout the application.
 * Benefits:
 * - Single source of truth for data validation
 * - Reusable across forms, API routes, and Firestore operations
 * - TypeScript types automatically inferred from schemas
 * - Consistent validation logic and error messages
 */

// ============================================
// SHARED / REUSABLE SCHEMAS
// ============================================

/**
 * User role enum - prevents hardcoded string errors
 */
export const userRoleSchema = z.enum([
  'admin',
  'sales',
  'operations',
  'production',
  'operations_manager',
  'production_personnel',
]);

/**
 * Unit types for inventory items
 */
export const unitSchema = z.enum(['kg', 'liters', 'units', 'rolls']);

/**
 * Request status enum
 */
export const requestStatusSchema = z.enum([
  'pending',
  'approved',
  'delivered',
  'rejected',
]);

/**
 * Production batch status enum
 */
export const batchStatusSchema = z.enum([
  'Pending_QC',
  'Pending_Packaging',
  'Completed',
  'Rejected',
]);

/**
 * SKU validation - must follow LUN-XXX-XXX pattern
 */
export const skuSchema = z
  .string()
  .min(3, 'SKU is required')
  .regex(/^LUN-[A-Z]{2,4}-[A-Z0-9]{2,6}(-\d+)?$/, 
    'SKU format: LUN-[TYPE]-[CODE]-[NUM] (e.g., LUN-WD-ACA-01, LUN-BOT-500)');

/**
 * Positive number validation
 */
export const positiveNumberSchema = z
  .number()
  .or(z.string().transform(Number))
  .pipe(z.number().positive('Must be a positive number'));

/**
 * Non-negative number validation (allows 0)
 */
export const nonNegativeNumberSchema = z
  .number()
  .or(z.string().transform(Number))
  .pipe(z.number().min(0, 'Cannot be negative'));

// ============================================
// USER SCHEMAS
// ============================================

/**
 * User schema for Firestore documents
 */
export const userSchema = z.object({
  uid: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email address'),
  displayName: z.string().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  photoURL: z.string().url().optional().or(z.literal('')),
  role: userRoleSchema,
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
  isActive: z.boolean().default(true),
  notificationSettings: z
    .object({
      receiveEmails: z.boolean().default(true),
      reportFrequency: z.enum(['daily', 'weekly', 'never']).default('daily'),
    })
    .optional(),
});

/**
 * Schema for updating user role (admin panel)
 */
export const updateUserRoleSchema = z.object({
  role: userRoleSchema,
});

// ============================================
// INVENTORY SCHEMAS
// ============================================

/**
 * Raw material schema
 */
export const rawMaterialSchema = z.object({
  sku: skuSchema,
  name: z.string().min(2, 'Material name is required'),
  quantity: nonNegativeNumberSchema,
  unit: z.enum(['kg', 'liters', 'units']),
  reorderPoint: nonNegativeNumberSchema,
});

/**
 * Product schema
 */
export const productSchema = z.object({
  sku: skuSchema,
  name: z.string().min(2, 'Product name is required'),
  quantity: nonNegativeNumberSchema,
  unit: z.literal('units'),
  category: z.string().optional(),
  packSize: z.number().positive().optional(),
});

/**
 * Packaging material schema
 */
export const packagingMaterialSchema = z.object({
  sku: skuSchema,
  name: z.string().min(2, 'Material name is required'),
  quantity: nonNegativeNumberSchema,
  unit: z.enum(['units', 'rolls']),
  reorderPoint: nonNegativeNumberSchema,
});

/**
 * Vendor schema
 */
export const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

/**
 * Material request schema
 */
export const materialRequestSchema = z.object({
  materialId: z.string().min(1, 'Please select a material'),
  quantity: positiveNumberSchema,
  unit: unitSchema,
  vendorId: z.string().min(1, 'Please select a vendor'),
});

// ============================================
// SALES SCHEMAS
// ============================================

/**
 * Salesperson schema
 */
export const salespersonSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
});

/**
 * Stock item schema (for stock in/out)
 */
export const stockItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().min(1, 'Qty must be at least 1'),
});

/**
 * Stock out schema
 */
export const stockOutSchema = z.object({
  date: z.date(),
  agentId: z.string().min(1, 'Please select a salesperson'),
  items: z
    .array(stockItemSchema)
    .min(1, 'Add at least one product'),
});

/**
 * Stock in schema
 */
export const stockInSchema = z.object({
  date: z.date(),
  agentId: z.string().min(1, 'Please select a salesperson'),
  items: z
    .array(stockItemSchema)
    .min(1, 'Add at least one product'),
});

/**
 * Sales ledger entry schema
 */
export const salesLedgerEntrySchema = z.object({
  date: z.date(),
  agentId: z.string().min(1, 'Please select a salesperson'),
  productsSold: z.coerce.number().min(0, 'Cannot be negative'),
  amountSold: z.coerce.number().min(0, 'Cannot be negative'),
});

/**
 * Sales record entry schema (for reconciliation)
 */
export const salesRecordEntrySchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  size: z.number().positive(),
  openingStock: nonNegativeNumberSchema,
  qtyIssued: nonNegativeNumberSchema,
  qtySold: nonNegativeNumberSchema,
  qtyReturned: nonNegativeNumberSchema,
  defects: nonNegativeNumberSchema,
  closingStock: nonNegativeNumberSchema,
});

/**
 * Daily sales report schema
 */
export const dailySalesReportSchema = z.object({
  date: z.date(),
  salespersonId: z.string().min(1, 'Please select a salesperson'),
  records: z
    .array(salesRecordEntrySchema)
    .min(1, 'Add at least one product record'),
});

// ============================================
// PRODUCTION SCHEMAS
// ============================================

/**
 * Batch raw material schema
 */
export const batchRawMaterialSchema = z.object({
  materialId: z.string().min(1, 'Select a material'),
  quantity: positiveNumberSchema,
  weighed: z.boolean().default(false),
});

/**
 * QC analysis item schema
 */
export const qcAnalysisItemSchema = z.object({
  analysis: z.string().min(1, 'Analysis is required'),
  standard: z.string().min(1, 'Standard is required'),
  obtained: z.string().min(1, 'Obtained value is required'),
});

/**
 * Batch packaging material schema
 */
export const batchPackagingMaterialSchema = z.object({
  packagingId: z.string().min(1, 'Select a packaging material'),
  quantity: positiveNumberSchema,
});

/**
 * QC end label details schema
 */
export const qcEndLabelDetailsSchema = z.object({
  dateOfMfg: z.date(),
  expDate: z.date(),
  batchNo: z.string().min(1, 'Batch number is required'),
  stocked: z.boolean(),
  batchSheet: z.string().min(1, 'Batch sheet reference is required'),
  yield: z.string().min(1, 'Yield is required'),
  expectedYield: z.string().min(1, 'Expected yield is required'),
  percentYield: z.string().min(1, 'Percent yield is required'),
  analysedBy: z.string().min(1, 'Analyst name is required'),
  dateAnalysed: z.date(),
  releaseForFilling: z.boolean(),
});

/**
 * Production batch schema
 */
export const productionBatchSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  dateOfMfg: z.date(),
  batchNumber: z.string().min(1, 'Batch number is required'),
  batchSize: positiveNumberSchema,
  mfRef: z.string().min(1, 'M.F. Ref is required'),
  rawMaterialsUsed: z
    .array(batchRawMaterialSchema)
    .min(1, 'Add at least one raw material'),
  qcEndLabelDetails: qcEndLabelDetailsSchema,
  qcEndAnalysisItems: z
    .array(qcAnalysisItemSchema)
    .min(1, 'Add at least one analysis item'),
  packagingUsed: z
    .array(batchPackagingMaterialSchema)
    .min(1, 'Add at least one packaging material'),
});

/**
 * Product recipe material schema
 */
export const recipeMaterialSchema = z.object({
  materialId: z.string().min(1),
  quantity: positiveNumberSchema,
});

/**
 * Product recipe schema
 */
export const productRecipeSchema = z.object({
  materials: z
    .array(recipeMaterialSchema)
    .min(1, 'Add at least one material to the recipe'),
});

// ============================================
// INFERRED TYPES
// ============================================

export type UserRole = z.infer<typeof userRoleSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type BatchStatus = z.infer<typeof batchStatusSchema>;

export type RawMaterialFormValues = z.infer<typeof rawMaterialSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type PackagingMaterialFormValues = z.infer<typeof packagingMaterialSchema>;
export type VendorFormValues = z.infer<typeof vendorSchema>;
export type MaterialRequestFormValues = z.infer<typeof materialRequestSchema>;

export type SalespersonFormValues = z.infer<typeof salespersonSchema>;
export type StockOutFormValues = z.infer<typeof stockOutSchema>;
export type StockInFormValues = z.infer<typeof stockInSchema>;
export type SalesLedgerEntryFormValues = z.infer<typeof salesLedgerEntrySchema>;
export type DailySalesReportFormValues = z.infer<typeof dailySalesReportSchema>;

export type ProductionBatchFormValues = z.infer<typeof productionBatchSchema>;
export type ProductRecipeFormValues = z.infer<typeof productRecipeSchema>;
