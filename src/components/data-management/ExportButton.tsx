// src/components/data-management/ExportButton.tsx
'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV } from '@/lib/export/csv-export';
import { generatePDFReport } from '@/lib/export/pdf-export';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  data: any[];
  columns: { header: string; dataKey: string }[];
  filename: string;
  title: string;
}

export function ExportButton({ data, columns, filename, title }: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      const csvColumns = columns.map(col => col.dataKey);
      const csvHeaders = columns.reduce((acc, col) => {
        acc[col.dataKey] = col.header;
        return acc;
      }, {} as Record<string, string>);

      exportToCSV(data, {
        filename: `${filename}.csv`,
        columns: csvColumns,
        headers: csvHeaders,
      });

      toast({
        title: 'Export Successful',
        description: `Data exported to ${filename}.csv`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      generatePDFReport(data, columns, {
        title,
        filename: `${filename}.pdf`,
        orientation: 'landscape',
      });

      toast({
        title: 'Export Successful',
        description: `Report generated: ${filename}.pdf`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'An error occurred while generating PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
