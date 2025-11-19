// src/components/analytics/CustomReportBuilder.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import { Download, Calendar as CalendarIcon, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'sales' | 'inventory' | 'production' | 'operations' | 'activity';
type ExportFormat = 'excel' | 'pdf' | 'csv';

interface ReportField {
  id: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

const REPORT_FIELDS: Record<ReportType, ReportField[]> = {
  sales: [
    { id: 'saleDate', label: 'Sale Date', type: 'date' },
    { id: 'salespersonName', label: 'Salesperson', type: 'string' },
    { id: 'customerName', label: 'Customer', type: 'string' },
    { id: 'totalAmount', label: 'Total Amount', type: 'number' },
    { id: 'paymentMethod', label: 'Payment Method', type: 'string' },
    { id: 'items', label: 'Items', type: 'string' },
  ],
  inventory: [
    { id: 'name', label: 'Material Name', type: 'string' },
    { id: 'category', label: 'Category', type: 'string' },
    { id: 'quantity', label: 'Quantity', type: 'number' },
    { id: 'unit', label: 'Unit', type: 'string' },
    { id: 'unitCost', label: 'Unit Cost', type: 'number' },
    { id: 'reorderPoint', label: 'Reorder Point', type: 'number' },
    { id: 'supplier', label: 'Supplier', type: 'string' },
  ],
  production: [
    { id: 'batchNumber', label: 'Batch Number', type: 'string' },
    { id: 'productName', label: 'Product', type: 'string' },
    { id: 'quantityProduced', label: 'Quantity Produced', type: 'number' },
    { id: 'status', label: 'Status', type: 'string' },
    { id: 'createdAt', label: 'Created Date', type: 'date' },
    { id: 'completedAt', label: 'Completed Date', type: 'date' },
    { id: 'supervisorName', label: 'Supervisor', type: 'string' },
  ],
  operations: [
    { id: 'materialId', label: 'Material', type: 'string' },
    { id: 'vendorId', label: 'Vendor', type: 'string' },
    { id: 'quantity', label: 'Quantity', type: 'number' },
    { id: 'status', label: 'Status', type: 'string' },
    { id: 'requestedByName', label: 'Requested By', type: 'string' },
    { id: 'createdAt', label: 'Request Date', type: 'date' },
    { id: 'deliveredAt', label: 'Delivery Date', type: 'date' },
  ],
  activity: [
    { id: 'module', label: 'Module', type: 'string' },
    { id: 'action', label: 'Action', type: 'string' },
    { id: 'userName', label: 'User', type: 'string' },
    { id: 'timestamp', label: 'Timestamp', type: 'date' },
    { id: 'details', label: 'Details', type: 'string' },
  ],
};

const COLLECTION_MAP: Record<ReportType, string> = {
  sales: COLLECTIONS.SALES_LEDGER,
  inventory: COLLECTIONS.RAW_MATERIALS,
  production: COLLECTIONS.PRODUCTION_BATCHES,
  operations: COLLECTIONS.REQUESTS,
  activity: COLLECTIONS.ACTIVITIES,
};

export function CustomReportBuilder() {
  const firestore = useFirestore();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [reportName, setReportName] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [isGenerating, setIsGenerating] = useState(false);

  const availableFields = REPORT_FIELDS[reportType];

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  };

  const selectAllFields = () => {
    setSelectedFields(new Set(availableFields.map(f => f.id)));
  };

  const clearAllFields = () => {
    setSelectedFields(new Set());
  };

  const formatFieldValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'date':
        if (value?.toDate) return format(value.toDate(), 'MMM dd, yyyy');
        if (value instanceof Date) return format(value, 'MMM dd, yyyy');
        return value.toString();
      case 'number':
        return typeof value === 'number' ? value.toFixed(2) : value.toString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'string':
      default:
        if (Array.isArray(value)) {
          return value.map(item => item.productName || item.name || JSON.stringify(item)).join(', ');
        }
        return value.toString();
    }
  };

  const generateReport = async () => {
    if (selectedFields.size === 0) {
      alert('Please select at least one field');
      return;
    }

    setIsGenerating(true);
    try {
      // Build query
      const collectionRef = collection(firestore, COLLECTION_MAP[reportType]);
      let q = query(collectionRef);

      // Add date filters if applicable
      const dateField = reportType === 'sales' ? 'saleDate' : 
                       reportType === 'activity' ? 'timestamp' : 'createdAt';
      
      if (dateFrom) {
        q = query(q, where(dateField, '>=', Timestamp.fromDate(dateFrom)));
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        q = query(q, where(dateField, '<=', Timestamp.fromDate(endOfDay)));
      }

      // Fetch data
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (data.length === 0) {
        alert('No data found for the selected criteria');
        setIsGenerating(false);
        return;
      }

      // Export based on format
      const fileName = reportName || `${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}`;
      
      switch (exportFormat) {
        case 'excel':
          await exportToExcel(data, fileName);
          break;
        case 'pdf':
          await exportToPDF(data, fileName);
          break;
        case 'csv':
          await exportToCSV(data, fileName);
          break;
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToExcel = async (data: any[], fileName: string) => {
    const workbook = new XLSX.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    const headers = Array.from(selectedFields).map(fieldId => {
      const field = availableFields.find(f => f.id === fieldId);
      return field?.label || fieldId;
    });
    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    data.forEach(item => {
      const row = Array.from(selectedFields).map(fieldId => {
        const field = availableFields.find(f => f.id === fieldId);
        return formatFieldValue(item[fieldId], field?.type || 'string');
      });
      worksheet.addRow(row);
    });

    // Auto-size columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async (data: any[], fileName: string) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(reportName || `${reportType.toUpperCase()} Report`, 14, 20);
    
    // Add date range if applicable
    if (dateFrom || dateTo) {
      doc.setFontSize(10);
      const dateRange = `${dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'Start'} - ${dateTo ? format(dateTo, 'MMM dd, yyyy') : 'End'}`;
      doc.text(dateRange, 14, 28);
    }

    // Prepare table data
    const headers = Array.from(selectedFields).map(fieldId => {
      const field = availableFields.find(f => f.id === fieldId);
      return field?.label || fieldId;
    });

    const rows = data.map(item => 
      Array.from(selectedFields).map(fieldId => {
        const field = availableFields.find(f => f.id === fieldId);
        return formatFieldValue(item[fieldId], field?.type || 'string');
      })
    );

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: dateFrom || dateTo ? 32 : 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Download
    doc.save(`${fileName}.pdf`);
  };

  const exportToCSV = async (data: any[], fileName: string) => {
    const headers = Array.from(selectedFields).map(fieldId => {
      const field = availableFields.find(f => f.id === fieldId);
      return field?.label || fieldId;
    });

    const rows = data.map(item => 
      Array.from(selectedFields).map(fieldId => {
        const field = availableFields.find(f => f.id === fieldId);
        const value = formatFieldValue(item[fieldId], field?.type || 'string');
        // Escape commas and quotes for CSV
        return `"${value.replace(/"/g, '""')}"`;
      })
    );

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Report Builder</CardTitle>
        <CardDescription>
          Create custom reports by selecting data fields and date ranges
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Name */}
        <div className="space-y-2">
          <Label htmlFor="reportName">Report Name</Label>
          <Input
            id="reportName"
            placeholder="e.g., Monthly Sales Report"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
          />
        </div>

        {/* Report Type */}
        <div className="space-y-2">
          <Label htmlFor="reportType">Report Type</Label>
          <Select value={reportType} onValueChange={(value) => {
            setReportType(value as ReportType);
            setSelectedFields(new Set());
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales Report</SelectItem>
              <SelectItem value="inventory">Inventory Report</SelectItem>
              <SelectItem value="production">Production Report</SelectItem>
              <SelectItem value="operations">Operations Report</SelectItem>
              <SelectItem value="activity">Activity Log Report</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Fields Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select Fields</Label>
            <div className="space-x-2">
              <Button variant="ghost" size="sm" onClick={selectAllFields}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllFields}>
                Clear All
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 border rounded-lg p-4 max-h-64 overflow-y-auto">
            {availableFields.map(field => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={field.id}
                  checked={selectedFields.has(field.id)}
                  onCheckedChange={() => toggleField(field.id)}
                />
                <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                  {field.label}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedFields.size} field{selectedFields.size !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* Export Format */}
        <div className="space-y-2">
          <Label htmlFor="exportFormat">Export Format</Label>
          <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excel">Excel (.xlsx)</SelectItem>
              <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              <SelectItem value="csv">CSV (.csv)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={generateReport} 
          disabled={isGenerating || selectedFields.size === 0}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
