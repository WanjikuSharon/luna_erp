// src/app/(app)/sales/stock-in/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createLogger } from '@/lib/logger';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
// UPDATED: Import PackageCheck icon
import { Loader2, CalendarIcon, PlusCircle, Save, PackageCheck, Trash2 } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';

// Zod Schema for the Stock In form
const stockInSchema = z.object({
  date: z.date({ required_error: 'Please select a date.' }),
  agentId: z.string().min(1, 'Please select a salesperson.'),
  items: z.array(z.object({
    productId: z.string().min(1, 'Select a product'),
    quantity: z.coerce.number().min(1, 'Qty must be at least 1'),
  })).min(1, 'Add at least one product.'),
});
type StockInFormValues = z.infer<typeof stockInSchema>;

const logger = createLogger('sales-stock-in');

export default function StockInPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();

  // --- Data Fetching (Same as Stock Out) ---
  const productsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PRODUCTS), [firestore]);
  const salespeopleRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.SALESPEOPLE), [firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);
  const { data: salespeople, isLoading: isLoadingSalespeople } = useCollection<Salesperson>(salespeopleRef);

  const isLoading = isLoadingProducts || isLoadingSalespeople || isUserLoading;

  // --- Form Setup ---
  const form = useForm<StockInFormValues>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      date: new Date(),
      agentId: '',
      items: [{ productId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // --- Form Submit Handler (with Transaction) ---
  async function onSubmit(data: StockInFormValues) {
    const selectedSalesperson = salespeople?.find(s => s.id === data.agentId);
    if (!selectedSalesperson) {
      toast({ variant: "destructive", title: "Error", description: "Invalid salesperson selected."});
      return;
    }

    // Require authentication
    const submitterId = authUser?.uid;
    const submitterName = authUser?.displayName || authUser?.email || 'Unknown User';
    if (!submitterId) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to receive stock." });
      return;
    }
    
    try {
      // --- This is the Firebase Transaction ---
      await runTransaction(firestore, async (transaction) => {
        logger.debug("Starting Stock In transaction...");
        
        const itemsWithNames: { productId: string, productName: string, quantity: number }[] = [];

        // 1. Check stock and prepare transaction
        for (const item of data.items) {
          const prodRef = doc(firestore, COLLECTIONS.PRODUCTS, item.productId);
          const prodDoc = await transaction.get(prodRef);

          if (!prodDoc.exists()) {
            throw new Error(`Product with ID ${item.productId} not found!`);
          }
          
          const productName = prodDoc.data().name;

          // UPDATED: This is the main change. We are now ADDING stock.
          transaction.update(prodRef, { quantity: increment(item.quantity) });
          itemsWithNames.push({ ...item, productName });
        }
        logger.debug("All products checked and credited.");

        // 2. Create the Van Stock Log
        const logRef = doc(collection(firestore, 'van_stock_logs'));
        transaction.set(logRef, {
          date: Timestamp.fromDate(data.date),
          type: 'in', // UPDATED: The type is now 'in'
          agentId: data.agentId,
          agentName: selectedSalesperson.name,
          submittedBy: submitterId,
          submittedByName: submitterName,
          items: itemsWithNames, // Save the array of items
          createdAt: serverTimestamp(),
        });
        logger.info("Stock In log created.");
      });

      // --- Transaction Successful ---
      toast({
        title: 'Stock Returned!',
        description: `Stock from ${selectedSalesperson.name} has been returned to main inventory.`,
      });
      form.reset({
        date: new Date(),
        agentId: '',
        items: [{ productId: '', quantity: 1 }],
      });

    } catch (e: any) {
      // --- Transaction Failed ---
      logger.error("Stock In Transaction failed: ", e);
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: e.message || "Could not update stock. Please try again.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Receive Stock (Stock In)</h1>
        <p className="text-muted-foreground">
          Return unsold stock from a salesperson. This will **add** to the main inventory.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* --- Header Fields (Same as Stock Out) --- */}
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Return</FormLabel>
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
                  <FormItem>
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
            </CardContent>
          </Card>

          {/* --- Items List (Same as Stock Out, but label is "Returned") --- */}
          <Card>
            <CardHeader>
              <CardTitle>Products to Return</CardTitle>
              <CardDescription>
                Add each product and the quantity being returned to main stock.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {fields.map((item, index) => (
                  <div key={item.id} className="flex gap-4 items-end p-2 border rounded-md">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Product</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {isLoadingProducts ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                              (products ?? []).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormLabel>Quantity Returned</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 5" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: 1 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product Row
              </Button>
            </CardContent>
          </Card>
          
          <Button type="submit" size="lg" className="w-full md:w-auto" disabled={form.formState.isSubmitting || isLoading}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <PackageCheck className="mr-2" />
            Receive Stock & Update Inventory
          </Button>
        </form>
      </Form>
    </div>
  );
}
