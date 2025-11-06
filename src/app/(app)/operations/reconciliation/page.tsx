// src/app/(app)/operations/reconciliation/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { format } from 'date-fns';
import type { Product, Salesperson } from '@/lib/types';
import { Loader2, CalendarIcon, Printer, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import { users as mockUsers } from '@/lib/data'; // For user names
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// --- This list defines the exact structure of your form ---
// Based on the uploaded image: 1000495841.jpg
const RECONCILIATION_PRODUCTS = [
  // Shower Gels
  { name: 'Shower Gel - Juicy Mango', size: 400 },
  { name: 'Shower Gel - Creamy Vanilla', size: 400 },
  { name: 'Shower Gel - Ocean breeze', size: 400 },
  { name: 'Shower Gel - Zesty Lemon', size: 400 },
  { name: 'Shower Gel - Tingly mint', size: 400 },
  { name: 'Shower Gel - Zingy Lime', size: 400 },
  { name: 'Shower Gel - Cocoa butter', size: 400 },
  { name: 'Shower Gel - Sweet Raspberry', size: 400 },
  { name: 'Shower Gel - Laid-back Lavender', size: 400 },

  { name: 'Shower Gel - Juicy Mango', size: 500 },
  { name: 'Shower Gel - Creamy Vanilla', size: 500 },
  { name: 'Shower Gel - Ocean breeze', size: 500 },
  { name: 'Shower Gel - Zesty Lemon', size: 500 },
  { name: 'Shower Gel - Tingly mint', size: 500 },
  { name: 'Shower Gel - Zingy Lime', size: 500 },
  { name: 'Shower Gel - Cocoa butter', size: 500 },
  { name: 'Shower Gel - Sweet Raspberry', size: 500 },
  { name: 'Shower Gel - Laid-back Lavender', size: 500 },

  { name: 'Shower Gel - Juicy Mango', size: 800 },
  { name: 'Shower Gel - Creamy Vanilla', size: 800 },
  { name: 'Shower Gel - Ocean breeze', size: 800 },
  { name: 'Shower Gel - Zesty Lemon', size: 800 },
  { name: 'Shower Gel - Tingly mint', size: 800 },
  { name: 'Shower Gel - Zingy Lime', size: 800 },
  { name: 'Shower Gel - Cocoa butter', size: 800 },
  { name: 'Shower Gel - Sweet Raspberry', size: 800 },
  { name: 'Shower Gel - Laid-back Lavender', size: 800 },

  // Dish wash
  { name: 'Dish wash - Citrus Bloom', size: 500 },
  { name: 'Dish wash - Fruity Orange', size: 500 },
  { name: 'Dish wash - Lime Glow', size: 500 },

  // Fabric Softener
  { name: 'Fabric Softener - Apricot luxe', size: 750 }, // Assuming 'Apricot Peach'
  { name: 'Fabric Softener - Cool Lavender', size: 750 }, // Assuming 'Lavender'
];

// Zod Schema for the form
const reconciliationSchema = z.object({
  date: z.date({ required_error: 'Please select a date.' }),
  salespersonId: z.string().min(1, 'Please select a salesperson.'),
  records: z.array(z.object({
      productId: z.string(),
      productName: z.string(),
      size: z.number(),
      openingStock: z.number(),
      qtyIssued: z.coerce.number().min(0).default(0),
      qtySold: z.coerce.number().min(0).default(0),
      qtyReturned: z.coerce.number().min(0).default(0),
      defects: z.coerce.number().min(0).default(0),
      closingStock: z.number(),
      // The "PACKET" and "SIGN" columns are omitted for now
      // as they seem to be for manual sign-off
  })),
});
type ReconciliationFormValues = z.infer<typeof reconciliationSchema>;

// Helper function to find a product in your live stock
const findProductStock = (products: Product[], name: string) => {
    // This matching is fragile. A better way is to store size/variety
    // as separate fields in your 'products' collection.
    // For now, we'll do our best by matching the name.
    const product = products.find(p => p.name.includes(name.split(' - ')[1]));
    return product ? product.quantity : 0;
};

export default function ReconciliationPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  // --- Data Fetching ---
  const productsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PRODUCTS), [firestore]);
  const salespeopleRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.SALESPEOPLE), [firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);
  const { data: salespeople, isLoading: isLoadingSalespeople } = useCollection<Salesperson>(salespeopleRef);

  const isLoading = isLoadingProducts || isLoadingSalespeople;

  // --- Form Setup ---
  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues: {
      date: new Date(),
      salespersonId: '',
      records: [],
    }
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "records",
  });

  // This effect populates the form once live data is ready
  useEffect(() => {
    if (products) {
      const initialRecords = RECONCILIATION_PRODUCTS.map(p => {
        const matchingProduct = products.find(liveProd => liveProd.name === p.name);
        const openingStock = matchingProduct ? matchingProduct.quantity : 0;
        
        return {
          productId: matchingProduct?.id || p.name, // Use real ID if found
          productName: p.name,
          size: p.size,
          openingStock: openingStock,
          qtyIssued: 0,
          qtySold: 0,
          qtyReturned: 0,
          defects: 0,
          closingStock: openingStock, // Initial closing stock = opening stock
        };
      });
      replace(initialRecords); // Set the form's field array
    }
  }, [products, replace]);


  // Watch all record fields to recalculate closing stock
  const watchedRecords = form.watch("records");
  useEffect(() => {
    watchedRecords.forEach((record, index) => {
        const opening = record.openingStock || 0;
        const issued = record.qtyIssued || 0;
        const sold = record.qtySold || 0;
        const returned = record.qtyReturned || 0;
        const defects = record.defects || 0;
        
        const closing = opening + issued - sold - returned - defects;
        
        // Update the form value without triggering a re-render
        form.setValue(`records.${index}.closingStock`, closing, { shouldDirty: true });
    });
  }, [watchedRecords, form]);

  // --- Form Submit Handler ---
  async function onSubmit(data: ReconciliationFormValues) {
    const selectedSalesperson = salespeople?.find(s => s.id === data.salespersonId);
    if (!selectedSalesperson) {
        toast({ variant: "destructive", title: "Error", description: "Invalid salesperson selected."});
        return;
    }

    try {
      await addDoc(collection(firestore, 'daily_sales_records'), {
        date: Timestamp.fromDate(data.date),
        salespersonId: data.salespersonId,
        salespersonName: selectedSalesperson.name,
        records: data.records,
        createdAt: serverTimestamp(),
      });
      
      toast({ title: "Report Saved", description: "The daily sales report has been saved." });
      form.reset();
      // We might need to re-fetch the opening stock here
      if (products) {
          const initialRecords = RECONCILIATION_PRODUCTS.map(p => {
            const matchingProduct = products.find(liveProd => liveProd.name === p.name);
            const openingStock = matchingProduct ? matchingProduct.quantity : 0;
            return {
              productId: matchingProduct?.id || p.name,
              productName: p.name,
              size: p.size,
              openingStock: openingStock,
              qtyIssued: 0, qtySold: 0, qtyReturned: 0, defects: 0,
              closingStock: openingStock,
            };
          });
          replace(initialRecords);
      }
      form.setValue('date', new Date());
      form.setValue('salespersonId', '');


    } catch (error) {
      console.error("Error saving report:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save the report." });
    }
  }

  // --- Print Handler ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* --- Header & Controls --- */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            <div>
              <h1 className="text-3xl font-bold font-headline tracking-tight">Daily Reconciliation</h1>
              <p className="text-muted-foreground">
                Fill out this form to reconcile stock for a salesperson.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handlePrint}>
                <Printer className="mr-2" /> Print Report
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                <Save className="mr-2" /> Save Report
              </Button>
            </div>
          </div>

          {/* --- Top Form Fields --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
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
              name="salespersonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salesperson</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a salesperson..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingSalespeople ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                       (salespeople ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* --- Main Reconciliation Table --- */}
          <Card className="print-area"> {/* This 'print-area' class is key for printing */}
            <CardHeader>
              <CardTitle>Reconciliation Sheet</CardTitle>
              <CardDescription>
                Date: {format(form.watch('date') || new Date(), 'PPP')} | 
                Salesperson: {salespeople?.find(s => s.id === form.watch('salespersonId'))?.name || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 w-full bg-muted animate-pulse rounded" />
              ) : (
                <div className="overflow-x-auto">
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
                      {fields.map((item, index) => {
                        // This logic adds the "Shower Gel" / "Dish wash" headers
                        let categoryHeader = null;
                        if (index === 0) {
                            categoryHeader = 'Shower Gel';
                        } else if (index === 27) { // 9*3
                            categoryHeader = 'Dish wash';
                        } else if (index === 30) { // 27 + 3
                            categoryHeader = 'Fabric Softener';
                        }
                        
                        return (
                          <React.Fragment key={item.id}>
                            {categoryHeader && (
                                <TableRow className="bg-muted hover:bg-muted">
                                    <TableCell colSpan={8} className="font-bold text-sm">{categoryHeader}</TableCell>
                                </TableRow>
                            )}
                            <TableRow>
                              {/* We only show the size for the first item in that size group */}
                              <TableCell className="font-medium">
                                {(index % 9 === 0 || categoryHeader) ? item.size : ''}
                              </TableCell>
                              <TableCell className="font-medium">{item.productName.split(' - ')[1]}</TableCell>
                              
                              {/* Opening Stock (Read-only) */}
                              <TableCell>
                                <Input type="number" readOnly value={item.openingStock} className="bg-muted" />
                              </TableCell>
                              
                              {/* QTY ISS */}
                              <FormField
                                control={form.control}
                                name={`records.${index}.qtyIssued`}
                                render={({ field }) => (
                                  <TableCell><FormControl><Input type="number" {...field} /></FormControl></TableCell>
                                )}
                              />
                              {/* QTY SOLD */}
                              <FormField
                                control={form.control}
                                name={`records.${index}.qtySold`}
                                render={({ field }) => (
                                  <TableCell><FormControl><Input type="number" {...field} /></FormControl></TableCell>
                                )}
                              />
                              {/* QTY RTN */}
                              <FormField
                                control={form.control}
                                name={`records.${index}.qtyReturned`}
                                render={({ field }) => (
                                  <TableCell><FormControl><Input type="number" {...field} /></FormControl></TableCell>
                                )}
                              />
                              {/* DEFECTS */}
                              <FormField
                                control={form.control}
                                name={`records.${index}.defects`}
                                render={({ field }) => (
                                  <TableCell><FormControl><Input type="number" {...field} /></FormControl></TableCell>
                                )}
                              />

                              {/* Closing Stock (Calculated) */}
                              <FormField
                                control={form.control}
                                name={`records.${index}.closingStock`}
                                render={({ field }) => (
                                  <TableCell>
                                    <FormControl><Input type="number" readOnly {...field} className="font-bold bg-muted" /></FormControl>
                                  </TableCell>
                                )}
                              />
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
