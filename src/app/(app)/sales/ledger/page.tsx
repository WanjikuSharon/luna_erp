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
import { Loader2, CalendarIcon, PlusCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      });

      toast({ title: "Record Saved", description: `Sale for ${selectedSalesperson.name} has been logged.` });
      form.reset({ date: new Date(), agentId: '', productsSold: 0, amountSold: 0 });

    } catch (error) {
      logger.error("Error saving ledger entry:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save the record." });
    }
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
                <TableHead className="text-right">Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingLedger && (
                <TableRow><TableCell colSpan={6}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
              )}
              {(ledgerEntries ?? []).length === 0 && !isLoadingLedger && (
                <TableRow><TableCell colSpan={6} className="text-center h-24">No sales logged yet.</TableCell></TableRow>
              )}
              {(ledgerEntries ?? []).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{format(entry.date.toDate(), 'PPP')}</TableCell>
                  <TableCell>{entry.agentName}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.agentPhone || 'N/A'}</TableCell>
                  <TableCell className="text-center font-medium">{entry.productsSold}</TableCell>
                  <TableCell className="text-right font-medium">{entry.amountSold.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {formatDistanceToNow(entry.createdAt.toDate(), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
