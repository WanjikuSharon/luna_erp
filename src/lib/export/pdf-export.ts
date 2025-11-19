// src/lib/export/pdf-export.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * PDF Export Utilities
 * Provides functions to generate PDF reports
 */

export interface PDFReportOptions {
  title: string;
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
}

/**
 * Generate PDF report from table data
 * @param data - Array of objects to include in PDF
 * @param columns - Column definitions
 * @param options - PDF configuration
 */
export function generatePDFReport<T extends Record<string, any>>(
  data: T[],
  columns: { header: string; dataKey: keyof T }[],
  options: PDFReportOptions
): void {
  const {
    title,
    filename = `report-${new Date().toISOString().split('T')[0]}.pdf`,
    orientation = 'portrait',
    pageSize = 'a4',
  } = options;

  // Create new PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Add generation date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  // Prepare table data
  const headers = columns.map(col => col.header);
  const body = data.map(row =>
    columns.map(col => {
      const value = row[col.dataKey];
      return value !== null && value !== undefined ? String(value) : '';
    })
  );

  // Add table
  autoTable(doc, {
    head: [headers],
    body: body,
    startY: 35,
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Add page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  doc.save(filename);
}

/**
 * Generate Inventory PDF Report
 */
export function generateInventoryPDFReport(inventory: any[]) {
  generatePDFReport(
    inventory,
    [
      { header: 'Product Name', dataKey: 'name' },
      { header: 'SKU', dataKey: 'sku' },
      { header: 'Quantity', dataKey: 'quantity' },
      { header: 'Unit', dataKey: 'unit' },
      { header: 'Reorder Level', dataKey: 'reorderLevel' },
      { header: 'Status', dataKey: 'status' },
    ],
    {
      title: 'Inventory Report',
      filename: `inventory-report-${new Date().toISOString().split('T')[0]}.pdf`,
      orientation: 'landscape',
    }
  );
}

/**
 * Generate Sales PDF Report
 */
export function generateSalesPDFReport(sales: any[]) {
  generatePDFReport(
    sales,
    [
      { header: 'Order ID', dataKey: 'orderId' },
      { header: 'Customer', dataKey: 'customerName' },
      { header: 'Amount', dataKey: 'totalAmount' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Date', dataKey: 'createdAt' },
    ],
    {
      title: 'Sales Report',
      filename: `sales-report-${new Date().toISOString().split('T')[0]}.pdf`,
      orientation: 'landscape',
    }
  );
}

/**
 * Generate Production PDF Report
 */
export function generateProductionPDFReport(production: any[]) {
  generatePDFReport(
    production,
    [
      { header: 'Batch ID', dataKey: 'batchId' },
      { header: 'Product', dataKey: 'productName' },
      { header: 'Quantity', dataKey: 'quantity' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Start Date', dataKey: 'startDate' },
      { header: 'Completion Date', dataKey: 'completionDate' },
    ],
    {
      title: 'Production Report',
      filename: `production-report-${new Date().toISOString().split('T')[0]}.pdf`,
      orientation: 'landscape',
    }
  );
}

/**
 * Generate Daily Sales Summary PDF
 */
export function generateDailySalesSummaryPDF(summary: {
  date: string;
  totalSales: number;
  totalRevenue: number;
  topProducts: any[];
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Title
  doc.setFontSize(20);
  doc.text('Daily Sales Summary', 14, 22);

  // Date
  doc.setFontSize(12);
  doc.text(`Date: ${summary.date}`, 14, 32);

  // Summary stats
  doc.setFontSize(14);
  doc.text('Overview', 14, 45);
  doc.setFontSize(11);
  doc.text(`Total Sales: ${summary.totalSales}`, 20, 53);
  doc.text(`Total Revenue: $${summary.totalRevenue.toFixed(2)}`, 20, 60);

  // Top products table
  doc.setFontSize(14);
  doc.text('Top Products', 14, 75);

  autoTable(doc, {
    head: [['Product', 'Quantity Sold', 'Revenue']],
    body: summary.topProducts.map(p => [
      p.name,
      p.quantity,
      `$${p.revenue.toFixed(2)}`,
    ]),
    startY: 80,
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [66, 66, 66],
    },
  });

  doc.save(`daily-sales-summary-${summary.date}.pdf`);
}
