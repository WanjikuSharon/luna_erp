// src/lib/export/csv-export.ts
import { unparse } from 'papaparse';

/**
 * CSV Export Utilities
 * Provides functions to export data to CSV format
 */

export interface ExportOptions {
  filename?: string;
  columns?: string[];
  headers?: Record<string, string>;
}

/**
 * Export data to CSV file
 * @param data - Array of objects to export
 * @param options - Export configuration
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const {
    filename = `export-${new Date().toISOString().split('T')[0]}.csv`,
    columns,
    headers,
  } = options;

  // Filter columns if specified
  let processedData = data;
  if (columns) {
    processedData = data.map(row => {
      const filtered: Record<string, any> = {};
      columns.forEach(col => {
        if (col in row) {
          filtered[col] = row[col];
        }
      });
      return filtered as T;
    });
  }

  // Rename headers if specified
  if (headers) {
    processedData = processedData.map(row => {
      const renamed: Record<string, any> = {};
      Object.keys(row).forEach(key => {
        const newKey = headers[key] || key;
        renamed[newKey] = row[key];
      });
      return renamed as T;
    });
  }

  // Convert to CSV
  const csv = unparse(processedData);

  // Create download link
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
 * Export inventory data to CSV
 */
export function exportInventoryToCSV(inventory: any[]) {
  exportToCSV(inventory, {
    filename: `inventory-export-${new Date().toISOString().split('T')[0]}.csv`,
    columns: ['name', 'sku', 'quantity', 'unit', 'reorderLevel', 'lastUpdated'],
    headers: {
      name: 'Product Name',
      sku: 'SKU',
      quantity: 'Quantity',
      unit: 'Unit',
      reorderLevel: 'Reorder Level',
      lastUpdated: 'Last Updated',
    },
  });
}

/**
 * Export sales data to CSV
 */
export function exportSalesToCSV(sales: any[]) {
  exportToCSV(sales, {
    filename: `sales-export-${new Date().toISOString().split('T')[0]}.csv`,
    columns: ['orderId', 'customerName', 'products', 'totalAmount', 'status', 'createdAt'],
    headers: {
      orderId: 'Order ID',
      customerName: 'Customer Name',
      products: 'Products',
      totalAmount: 'Total Amount',
      status: 'Status',
      createdAt: 'Date',
    },
  });
}

/**
 * Export production data to CSV
 */
export function exportProductionToCSV(production: any[]) {
  exportToCSV(production, {
    filename: `production-export-${new Date().toISOString().split('T')[0]}.csv`,
    columns: ['batchId', 'productName', 'quantity', 'status', 'startDate', 'completionDate'],
    headers: {
      batchId: 'Batch ID',
      productName: 'Product Name',
      quantity: 'Quantity',
      status: 'Status',
      startDate: 'Start Date',
      completionDate: 'Completion Date',
    },
  });
}
