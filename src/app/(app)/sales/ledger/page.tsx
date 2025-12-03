// src/app/(app)/sales/ledger/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createLogger } from '@/lib/logger';
import {
  salesLedgerEntrySchema,
  type SalesLedgerEntryFormValues,
} from '@/lib/schemas';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import type { Salesperson, DailySalesLedgerEntry } from '@/lib/types';
import { Loader2, CalendarIcon, PlusCircle, Save, FileCheck, Eye, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EtimsInvoice } from '@/components/reports/EtimsInvoice';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, query, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';

const logger = createLogger('sales-ledger');

export default function SalesLedgerPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  // State for eTIMS integration
  const [isSubmittingToEtims, setIsSubmittingToEtims] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<DailySalesLedgerEntry | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // --- Data Fetching ---
  const salespeopleRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.SALESPEOPLE), [firestore]);
  const ledgerRef = useMemoFirebase(
    () => query(collection(firestore, 'daily_sales_ledger'), orderBy('date', 'desc')), 
    [firestore]
  );

  const { data: salespeople, isLoading: isLoadingSalespeople } = useCollection<Salesperson>(salespeopleRef);
  const { data: ledgerEntries, isLoading: isLoadingLedger } = useCollection<DailySalesLedgerEntry>(ledgerRef);

  // --- Form Setup ---
  const form = useForm<SalesLedgerEntryFormValues>({
    resolver: zodResolver(salesLedgerEntrySchema),
    defaultValues: {
      date: new Date(),
      agentId: '',
      productsSold: 0,
      amountSold: 0,
    },
  });

  // --- Form Submit Handler ---
  async function onSubmit(data: SalesLedgerEntryFormValues) {
    const selectedSalesperson = salespeople?.find(s => s.id === data.agentId);
    if (!selectedSalesperson) {
      toast({ variant: "destructive", title: "Error", description: "Invalid salesperson selected."});
      return;
    }

    // Get the person submitting the form (Maina Kinyua)
    const fakeSubmitterId = 'user-5'; // Maina Kinyua's mock ID
    const submitterId = authUser ? authUser.uid : fakeSubmitterId;

    try {
      await addDoc(collection(firestore, 'daily_sales_ledger'), {
        date: Timestamp.fromDate(data.date),
        agentId: data.agentId,
        agentName: selectedSalesperson.name,
        agentPhone: selectedSalesperson.phone || '', // Assuming phone is on the salesperson doc
        productsSold: data.productsSold,
        amountSold: data.amountSold,
        submittedBy: submitterId,
        createdAt: serverTimestamp(),
        etimsStatus: 'pending', // Initialize eTIMS status
      });

      toast({ title: "Record Saved", description: `Sale for ${selectedSalesperson.name} has been logged.` });
      form.reset({ date: new Date(), agentId: '', productsSold: 0, amountSold: 0 });

    } catch (error) {
      logger.error("Error saving ledger entry:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save the record." });
    }
  }

  // --- eTIMS Invoice Submission Handler ---
  async function handleGenerateEtimsInvoice(entry: DailySalesLedgerEntry) {
    setIsSubmittingToEtims(entry.id);

    try {
      const response = await fetch('/api/etims/submit-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesLedgerEntryId: entry.id,
          customer: {
            name: entry.agentName,
            phoneNumber: entry.agentPhone,
          },
          items: [
            {
              itemCode: 'SALES-TRANSACTION',
              itemName: 'Sales Transaction',
              quantity: entry.productsSold,
              unitPrice: entry.amountSold / entry.productsSold,
              taxRate: 0.16, // 16% VAT
            },
          ],
          paymentMode: 'CASH',
          receiptType: 'SALE',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate eTIMS invoice');
      }

      toast({
        title: "eTIMS Invoice Generated",
        description: `Invoice Number: ${data.invoiceNumber}`,
      });

      // Refresh the entry data to show updated eTIMS info
      // In a real app, you'd refetch the data here
      
    } catch (error: any) {
      logger.error('eTIMS invoice generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'eTIMS Submission Failed',
        description: error.message,
      });
    } finally {
      setIsSubmittingToEtims(null);
    }
  }

  // --- View eTIMS Invoice ---
  function handleViewInvoice(entry: DailySalesLedgerEntry) {
    setSelectedInvoice(entry);
    setShowInvoice(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* --- Header --- */}
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Daily Sales Ledger</h1>
        <p className="text-muted-foreground">
          Log daily sales totals for each agent (from form `1000497324.jpg`).
        </p>
      </div>

      {/* --- New Entry Form --- */}
      <Card>
        <CardHeader>
          <CardTitle>New Ledger Entry</CardTitle>
          <CardDescription>
            Fill out the form below to log a salesperson's total for the day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Sales Agent</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select an agent..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {isLoadingSalespeople ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                         (salespeople ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productsSold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Products Sold</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 6" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amountSold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Sold (KSh)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 1880" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="md:col-start-5" disabled={form.formState.isSubmitting || isLoadingSalespeople}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                <Save className="mr-2" /> Log Sale
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* --- Recent Entries Table --- */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales Entries</CardTitle>
          <CardDescription>
            Click "Generate eTIMS Invoice" to submit the sale to KRA and get an official tax invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Agent Phone</TableHead>
                <TableHead className="text-center">Products Sold</TableHead>
                <TableHead className="text-right">Amount (KSh)</TableHead>
                <TableHead className="text-center">eTIMS Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingLedger && (
                <TableRow><TableCell colSpan={7}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
              )}
              {(ledgerEntries ?? []).length === 0 && !isLoadingLedger && (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No sales logged yet.</TableCell></TableRow>
              )}
              {(ledgerEntries ?? []).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{format(entry.date.toDate(), 'PPP')}</TableCell>
                  <TableCell>{entry.agentName}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.agentPhone || 'N/A'}</TableCell>
                  <TableCell className="text-center font-medium">{entry.productsSold}</TableCell>
                  <TableCell className="text-right font-medium">{entry.amountSold.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    {entry.etimsStatus === 'submitted' && (
                      <Badge variant="default" className="bg-green-600">
                        <FileCheck className="mr-1 h-3 w-3" />
                        Submitted
                      </Badge>
                    )}
                    {entry.etimsStatus === 'failed' && (
                      <Badge variant="destructive">
                        Failed
                      </Badge>
                    )}
                    {(!entry.etimsStatus || entry.etimsStatus === 'pending') && (
                      <Badge variant="outline">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {entry.etimsStatus === 'submitted' && entry.etimsInvoiceNumber ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(entry)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View Invoice
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateEtimsInvoice(entry)}
                          disabled={isSubmittingToEtims === entry.id}
                        >
                          {isSubmittingToEtims === entry.id && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          <FileCheck className="mr-1 h-3 w-3" />
                          Generate eTIMS Invoice
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* eTIMS Invoice Dialog */}
      <EtimsInvoice
        salesEntry={selectedInvoice}
        open={showInvoice}
        onOpenChange={setShowInvoice}
      />
    </div>
  );
}
