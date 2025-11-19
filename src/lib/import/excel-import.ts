// src/lib/import/excel-import.ts
import * as XLSX from 'xlsx';
import { z } from 'zod';

/**
 * Excel Import Utilities
 * Provides functions to import and validate data from Excel files
 */

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ImportWarning {
  row: number;
  field?: string;
  message: string;
}

/**
 * Read Excel file and convert to JSON
 * @param file - Excel file to read
 * @returns Promise with parsed data
 */
export async function readExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
}

/**
 * Validate and import data with schema
 * @param data - Raw data from Excel
 * @param schema - Zod schema for validation
 * @returns Import result with validated data and errors
 */
export function validateImportData<T>(
  data: any[],
  schema: z.ZodSchema<T>
): ImportResult<T> {
  const validData: T[] = [];
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because Excel is 1-indexed and has header row

    try {
      const validated = schema.parse(row);
      validData.push(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          errors.push({
            row: rowNumber,
            field: err.path.join('.'),
            message: err.message,
          });
        });
      } else {
        errors.push({
          row: rowNumber,
          message: 'Unknown validation error',
        });
      }
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors,
    warnings,
  };
}

/**
 * Inventory Import Schema
 */
export const inventoryImportSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  unit: z.string().min(1, 'Unit is required'),
  reorderLevel: z.number().int().min(0, 'Reorder level must be non-negative'),
  category: z.string().optional(),
});

export type InventoryImport = z.infer<typeof inventoryImportSchema>;

/**
 * Import inventory from Excel file
 */
export async function importInventoryFromExcel(
  file: File
): Promise<ImportResult<InventoryImport>> {
  const data = await readExcelFile(file);
  return validateImportData(data, inventoryImportSchema);
}

/**
 * Sales Import Schema
 */
export const salesImportSchema = z.object({
  orderID: z.string().min(1, 'Order ID is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  products: z.string().min(1, 'Products are required'),
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  status: z.enum(['pending', 'completed', 'cancelled']),
  date: z.string().min(1, 'Date is required'),
});

export type SalesImport = z.infer<typeof salesImportSchema>;

/**
 * Import sales from Excel file
 */
export async function importSalesFromExcel(
  file: File
): Promise<ImportResult<SalesImport>> {
  const data = await readExcelFile(file);
  return validateImportData(data, salesImportSchema);
}

/**
 * Production Import Schema
 */
export const productionImportSchema = z.object({
  batchID: z.string().min(1, 'Batch ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  startDate: z.string().min(1, 'Start date is required'),
  completionDate: z.string().optional(),
});

export type ProductionImport = z.infer<typeof productionImportSchema>;

/**
 * Import production from Excel file
 */
export async function importProductionFromExcel(
  file: File
): Promise<ImportResult<ProductionImport>> {
  const data = await readExcelFile(file);
  return validateImportData(data, productionImportSchema);
}

/**
 * Generate Excel template for import
 * @param type - Type of template to generate
 */
export function generateImportTemplate(type: 'inventory' | 'sales' | 'production'): void {
  let headers: string[] = [];
  let sampleData: any[] = [];

  switch (type) {
    case 'inventory':
      headers = ['name', 'sku', 'quantity', 'unit', 'reorderLevel', 'category'];
      sampleData = [
        {
          name: 'Sample Product',
          sku: 'SKU-001',
          quantity: 100,
          unit: 'pieces',
          reorderLevel: 20,
          category: 'General',
        },
      ];
      break;

    case 'sales':
      headers = ['orderID', 'customerName', 'products', 'totalAmount', 'status', 'date'];
      sampleData = [
        {
          orderID: 'ORD-001',
          customerName: 'John Doe',
          products: 'Product A, Product B',
          totalAmount: 150.00,
          status: 'completed',
          date: '2024-01-15',
        },
      ];
      break;

    case 'production':
      headers = ['batchID', 'productName', 'quantity', 'status', 'startDate', 'completionDate'];
      sampleData = [
        {
          batchID: 'BATCH-001',
          productName: 'Sample Product',
          quantity: 500,
          status: 'completed',
          startDate: '2024-01-01',
          completionDate: '2024-01-10',
        },
      ];
      break;
  }

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  // Download
  XLSX.writeFile(workbook, `${type}-import-template.xlsx`);
}
