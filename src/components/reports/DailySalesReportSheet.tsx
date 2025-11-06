// src/components/reports/DailySalesReportSheet.tsx
'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import type { DailySalesReport, SalesRecordEntry } from '@/lib/types';

// This is the hard-coded list of product categories from your form.
// We need it to render the category headers (e.g., "Shower Gel")
const CATEGORY_INDICES = {
  0: 'Shower Gel',
  27: 'Dish wash', // 9 (400ml) + 9 (500ml) + 9 (800ml) = 27
  30: 'Fabric Softener', // 27 + 3
};

// This is the component that will be rendered in the slide-out sheet
export function DailySalesReportSheet({
  report,
  onOpenChange,
}: {
  report: DailySalesReport | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!report) return null;

  // This function triggers the browser's print dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <Sheet open={!!report} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Daily Sales Report</SheetTitle>
          <SheetDescription>
            Report submitted by **{report.salespersonName}** on **{format(report.date.toDate(), 'PPP')}**.
          </SheetDescription>
        </SheetHeader>
        
        {/* "Print" button (This will be hidden when printing) */}
        <div className="py-4 text-right no-print">
          <Button onClick={handlePrint}>
            <Printer className="mr-2" /> Print Report
          </Button>
        </div>

        {/* This "print-area" is what will be printed */}
        <div className="print-area">
          {/* Add a print-only header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">Luna Industries - Daily Sales Report</h1>
            <p><strong>Salesperson:</strong> {report.salespersonName}</p>
            <p><strong>Date:</strong> {format(report.date.toDate(), 'PPP')}</p>
          </div>
          
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">SIZE (ml)</TableHead>
                <TableHead className="w-[200px]">PRODUCT VARIETY</TableHead>
                <TableHead>OPEN. STK.</TableHead>
                <TableHead>QTY ISS</TableHead>
                <TableHead>QTY SOLD</TableHead>
                <TableHead>QTY RTN</TableHead>
                <TableHead>DEFECTS</TableHead>
                <TableHead>CLOSING STK.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.records.map((item: SalesRecordEntry, index: number) => {
                const categoryHeader = (CATEGORY_INDICES as Record<number, string>)[index];
                
                return (
                  <React.Fragment key={item.productId + index}>
                    {/* Add the category header row if it exists */}
                    {categoryHeader && (
                      <TableRow className="bg-muted hover:bg-muted">
                        <TableCell colSpan={8} className="font-bold text-sm">{categoryHeader}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      {/* Show size only for the first item in a group */}
                      <TableCell className="font-medium">
                        {(index % 9 === 0 || categoryHeader) ? item.size : ''}
                      </TableCell>
                      <TableCell className="font-medium">{item.productName.split(' - ')[1]}</TableCell>
                      
                      {/* Render the saved numbers as text */}
                      <TableCell>{item.openingStock}</TableCell>
                      <TableCell>{item.qtyIssued}</TableCell>
                      <TableCell>{item.qtySold}</TableCell>
                      <TableCell>{item.qtyReturned}</TableCell>
                      <TableCell>{item.defects}</TableCell>
                      <TableCell className="font-bold">{item.closingStock}</TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <SheetFooter className="mt-4 no-print">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
