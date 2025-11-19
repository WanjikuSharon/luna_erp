// src/lib/import/excel-import.ts
import * as ExcelJS from 'exceljs';
import { z } from 'zod';

/**
 * Excel Import Utilities
 * Provides functions to import and validate data from Excel files
 */

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

/**
 * Import data from Excel file with validation
 */
export async function importFromExcel<T>(
  file: File,
  schema: z.ZodSchema<T>,
  options: {
    sheetName?: string;
    headerRow?: number;
  } = {}
): Promise<ImportResult<T>> {
  const { sheetName, headerRow = 1 } = options;

  try {
    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get the worksheet
    const worksheet = sheetName 
      ? workbook.getWorksheet(sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, field: 'file', message: 'No worksheet found in file' }],
      };
    }

    const data: T[] = [];
    const errors: ImportError[] = [];

    // Get headers from the header row
    const headerRowData = worksheet.getRow(headerRow);
    const headers: string[] = [];
    headerRowData.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || '').trim();
    });

    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber <= headerRow) return;

      // Convert row to object
      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });

      // Skip empty rows
      if (Object.keys(rowData).length === 0) return;

      // Validate with Zod schema
      const result = schema.safeParse(rowData);
      
      if (result.success) {
        data.push(result.data);
      } else {
        // Collect validation errors
        result.error.errors.forEach(err => {
          errors.push({
            row: rowNumber,
            field: err.path.join('.'),
            message: err.message,
          });
        });
      }
    });

    return {
      success: errors.length === 0,
      data,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [
        {
          row: 0,
          field: 'file',
          message: error instanceof Error ? error.message : 'Failed to read Excel file',
        },
      ],
    };
  }
}

/**
 * Generate Excel template with headers
 */
export async function generateTemplate(
  headers: string[],
  filename: string,
  sampleData?: Record<string, any>[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Add headers
  worksheet.addRow(headers);

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add sample data if provided
  if (sampleData && sampleData.length > 0) {
    sampleData.forEach(row => {
      const values = headers.map(header => row[header] || '');
      worksheet.addRow(values);
    });
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import inventory from Excel
 */
export async function importInventory(file: File) {
  const inventorySchema = z.object({
    'Product Name': z.string().min(1, 'Product name is required'),
    'SKU': z.string().min(1, 'SKU is required'),
    'Quantity': z.number().min(0, 'Quantity must be non-negative'),
    'Unit': z.string().min(1, 'Unit is required'),
    'Reorder Level': z.number().min(0, 'Reorder level must be non-negative'),
  });

  return importFromExcel(file, inventorySchema);
}

/**
 * Generate inventory template
 */
export async function generateInventoryTemplate() {
  await generateTemplate(
    ['Product Name', 'SKU', 'Quantity', 'Unit', 'Reorder Level'],
    'inventory-template.xlsx',
    [
      {
        'Product Name': 'Example Product',
        'SKU': 'LUN-EX-001',
        'Quantity': 100,
        'Unit': 'pcs',
        'Reorder Level': 20,
      },
    ]
  );
}

// Export aliases for backward compatibility
export const importInventoryFromExcel = importInventory;

/**
 * Generate import template (legacy function for backward compatibility)
 */
export async function generateImportTemplate(type: 'inventory' | 'sales' | 'production'): Promise<void> {
  const templates = {
    inventory: {
      headers: ['name', 'sku', 'quantity', 'unit', 'reorderLevel', 'category'],
      sample: [{
        name: 'Sample Product',
        sku: 'SKU-001',
        quantity: 100,
        unit: 'pieces',
        reorderLevel: 20,
        category: 'General',
      }],
    },
    sales: {
      headers: ['orderID', 'customerName', 'products', 'totalAmount', 'status', 'date'],
      sample: [{
        orderID: 'ORD-001',
        customerName: 'John Doe',
        products: 'Product A, Product B',
        totalAmount: 150.00,
        status: 'completed',
        date: '2024-01-15',
      }],
    },
    production: {
      headers: ['batchID', 'productName', 'quantity', 'status', 'startDate', 'completionDate'],
      sample: [{
        batchID: 'BATCH-001',
        productName: 'Sample Product',
        quantity: 500,
        status: 'completed',
        startDate: '2024-01-01',
        completionDate: '2024-01-10',
      }],
    },
  };

  const config = templates[type];
  await generateTemplate(config.headers, `${type}-import-template.xlsx`, config.sample);
}
