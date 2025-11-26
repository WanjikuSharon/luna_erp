// src/components/reports/EtimsInvoice.tsx
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Printer, Download, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { DailySalesLedgerEntry } from '@/lib/types';

interface EtimsInvoiceProps {
  salesEntry: DailySalesLedgerEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EtimsInvoice({ salesEntry, open, onOpenChange }: EtimsInvoiceProps) {
  const handlePrint = () => {
    window.print();
  };

  if (!salesEntry || !salesEntry.etimsInvoiceNumber) {
    return null;
  }

  const companyInfo = {
    name: process.env.NEXT_PUBLIC_ETIMS_COMPANY_NAME || 'Luna Industries Ltd',
    pin: process.env.NEXT_PUBLIC_ETIMS_COMPANY_PIN || 'A000000000A',
    address: 'P.O. Box 12345-00100, Nairobi',
    phone: '+254 700 000 000',
    email: 'info@lunaindustries.co.ke',
  };

  // Calculate tax breakdown (assuming 16% VAT)
  const taxRate = 0.16;
  const totalWithTax = salesEntry.amountSold;
  const totalBeforeTax = totalWithTax / (1 + taxRate);
  const taxAmount = totalWithTax - totalBeforeTax;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            eTIMS Invoice Generated
          </DialogTitle>
          <DialogDescription>
            Official tax invoice submitted to KRA eTIMS
          </DialogDescription>
        </DialogHeader>

        {/* Printable Invoice Area */}
        <div className="print-area bg-white p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 border-b-2 border-gray-800 pb-4">
            <h1 className="text-2xl font-bold">{companyInfo.name}</h1>
            <p className="text-sm">{companyInfo.address}</p>
            <p className="text-sm">
              Tel: {companyInfo.phone} | Email: {companyInfo.email}
            </p>
            <p className="text-sm font-semibold">
              PIN: {companyInfo.pin}
            </p>
          </div>

          {/* Invoice Type */}
          <div className="text-center">
            <h2 className="text-xl font-bold">TAX INVOICE</h2>
            <p className="text-sm text-gray-600">eTIMS Compliant Invoice</p>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4 border-y py-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Invoice Number:</p>
              <p className="font-mono text-sm">{salesEntry.etimsInvoiceNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Date:</p>
              <p className="text-sm">{format(salesEntry.date.toDate(), 'PPP')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">SCU Receipt No:</p>
              <p className="font-mono text-sm">{salesEntry.etimsScuReceiptNumber || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Time:</p>
              <p className="text-sm">{format(salesEntry.date.toDate(), 'p')}</p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-2 border-b pb-4">
            <h3 className="font-semibold text-sm">Customer Details:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> {salesEntry.agentName}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {salesEntry.agentPhone || 'N/A'}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Items:</h3>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Sales Transaction</td>
                  <td className="py-2 text-right">{salesEntry.productsSold}</td>
                  <td className="py-2 text-right">
                    KSh {totalBeforeTax.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>KSh {totalBeforeTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>VAT (16%):</span>
              <span>KSh {taxAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>KSh {totalWithTax.toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code Section */}
          {salesEntry.etimsQrCode && (
            <div className="text-center space-y-2 border-t pt-4">
              <p className="text-xs text-gray-600">Scan to verify this invoice</p>
              {/* QR Code would be rendered here using a QR code library */}
              <div className="flex justify-center">
                <div className="border-2 border-gray-300 p-4 inline-block">
                  <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    QR Code: {salesEntry.etimsQrCode.substring(0, 20)}...
                  </div>
                </div>
              </div>
              {salesEntry.etimsVerificationUrl && (
                <p className="text-xs text-gray-600 break-all">
                  Verify at: {salesEntry.etimsVerificationUrl}
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 border-t pt-4">
            <p>This is a valid tax invoice generated through KRA eTIMS</p>
            <p className="mt-1">Thank you for your business!</p>
          </div>
        </div>

        {/* Action Buttons (Hidden when printing) */}
        <DialogFooter className="no-print gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
