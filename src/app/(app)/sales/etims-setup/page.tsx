// src/app/(app)/sales/etims-setup/page.tsx
'use client';

import { EtimsProductRegistration } from '@/components/admin/EtimsProductRegistration';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileCheck, Info } from 'lucide-react';

export default function EtimsSetupPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">eTIMS Setup</h1>
        <p className="text-muted-foreground">
          Configure and manage your KRA eTIMS integration for tax-compliant invoicing.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>One-time setup:</strong> Register your products with KRA eTIMS before you can generate invoices.
          This only needs to be done once, or when you add new products.
        </AlertDescription>
      </Alert>

      {/* Product Registration Card */}
      <EtimsProductRegistration />

      {/* How to Use Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            How to Generate eTIMS Invoices
          </CardTitle>
          <CardDescription>
            Follow these steps to generate official KRA tax invoices for your sales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-medium">Log Your Sale</p>
                <p className="text-sm text-muted-foreground">
                  Go to Sales → Daily Sales Ledger and log the sale as usual (date, agent, products sold, amount)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-medium">Generate eTIMS Invoice</p>
                <p className="text-sm text-muted-foreground">
                  Find the sale in the table and click the "Generate eTIMS Invoice" button. Wait for the success message.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-medium">View & Print</p>
                <p className="text-sm text-muted-foreground">
                  Once submitted, click "View Invoice" to see the official tax invoice with QR code. Print it for your customer.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              💡 Tip: Every sale must have an eTIMS invoice for KRA compliance
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Make sure to generate invoices within 24 hours of the sale
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Badges Explained */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Status Badges</CardTitle>
          <CardDescription>
            Here's what each status means in the Sales Ledger
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full border border-gray-300 bg-white text-sm">
                Pending
              </div>
              <p className="text-sm text-muted-foreground">
                Sale logged but invoice not yet generated. Click "Generate eTIMS Invoice"
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-green-600 text-white text-sm flex items-center gap-1">
                <FileCheck className="h-3 w-3" />
                Submitted
              </div>
              <p className="text-sm text-muted-foreground">
                Invoice successfully submitted to KRA. You can view and print it.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-red-600 text-white text-sm">
                Failed
              </div>
              <p className="text-sm text-muted-foreground">
                Submission error. Check the error message and try again.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
