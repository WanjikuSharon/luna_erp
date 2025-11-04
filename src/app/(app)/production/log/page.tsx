// src/app/(app)/production/log/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  FormDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { RawMaterial, Product } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import {
  collection,
  doc,
  runTransaction,
  increment,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import { users as mockUsers } from '@/lib/data'; // For user names

// NEW: Packaging type and mock data
import type { PackagingMaterial } from '@/lib/types';
const MOCK_PACKAGING: PackagingMaterial[] = [
    { id: 'p1', name: '500ml Bottle', sku: 'LUN-BOT-500', quantity: 10000, unit: 'units', reorderPoint: 1000 },
    { id: 'p2', name: 'Dish Wash Label', sku: 'LUN-LBL-DW', quantity: 20000, unit: 'units', reorderPoint: 2000 },
    { id: 'p3', name: 'Shower Gel Pump', sku: 'LUN-PMP-SGL', quantity: 5000, unit: 'units', reorderPoint: 500 },
];

// NEW: QC Analysis Items from Form 2
const qcAnalysisTemplate = [
  "1. Colour appearance", "2. Feel/spread", "3. Smell", "4. Clarity", "5. Ph",
  "6. Viscosity", "7. Centrifuge stability", "8. Relative density", "9. A value",
  "10. Assay", "11. Other"
].map(item => ({ analysis: item, standard: '', obtained: '' }));


// --- UPDATED: Zod Schema with all QC fields ---
const batchFormSchema = z.object({
  // Tab 1: Batch Details
  productId: z.string().min(1, 'Please select a product.'),
  dateOfMfg: z.date({ required_error: 'Date of manufacture is required.' }),
  batchNumber: z.string().min(1, 'Batch number is required.'),
  batchSize: z.coerce.number().min(1, 'Batch size must be at least 1.'),
  mfRef: z.string().optional(),

  // Tab 2: Raw Materials Used
  rawMaterialsUsed: z.array(z.object({
    materialId: z.string().min(1, 'Select a material'),
    quantity: z.coerce.number().min(0.01, 'Qty > 0'),
    weighed: z.boolean().default(false),
  })).min(1, 'Add at least one raw material.'),

  // Tab 3, Sub-Tab 1: Raw Material QC
  qcRawSealsOk: z.boolean().default(false),
  qcRawWeightOk: z.boolean().default(false),
  qcRawMaterialOk: z.boolean().default(false),
  
  // Tab 3, Sub-Tab 2: End Product QC (from Form 2)
  qcEndLabelDetails: z.object({
      dateOfMfg: z.date({ required_error: 'QC Mfg Date is required.'}),
      expDate: z.date({ required_error: 'QC Exp Date is required.'}),
      stocked: z.boolean().default(false),
      batchSheet: z.string().optional(),
      yield: z.string().optional(),
      expectedYield: z.string().optional(),
      percentYield: z.string().optional(),
      analysedBy: z.string().min(1, 'Analysed By is required.'),
      dateAnalysed: z.date({ required_error: 'Analysis Date is required.'}),
      releaseForFilling: z.boolean().default(false),
  }),
  qcEndAnalysisItems: z.array(z.object({
      analysis: z.string(),
      standard: z.string().optional(),
      obtained: z.string().optional(),
  })).default(qcAnalysisTemplate), // Set default values
  qcEndProblems: z.string().optional(),
  qcEndImprovement: z.string().optional(),
  
  // Tab 4: Packaging
  packagingUsed: z.array(z.object({
    packagingId: z.string().min(1, 'Select packaging'),
    quantity: z.coerce.number().min(1, 'Qty > 0'),
  })).min(1, 'Add at least one packaging material.'),
});
type BatchFormValues = z.infer<typeof batchFormSchema>;


export default function LogProductionPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // --- Data Fetching ---
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const productsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PRODUCTS), [firestore]);
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);
  const packagingMaterials = MOCK_PACKAGING;
  const isLoadingPackaging = false;
  const isLoading = isLoadingMaterials || isLoadingProducts || isLoadingPackaging;

  // --- Form Setup ---
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      productId: '',
      batchNumber: '',
      mfRef: '',
      rawMaterialsUsed: [],
      packagingUsed: [],
      // NEW: Set defaults for QC fields
      qcRawSealsOk: false,
      qcRawWeightOk: false,
      qcRawMaterialOk: false,
      qcEndLabelDetails: {
          stocked: false,
          releaseForFilling: false,
          batchSheet: '',
          yield: '',
          expectedYield: '',
          percentYield: '',
          analysedBy: '',
      },
      qcEndAnalysisItems: qcAnalysisTemplate, // Use the template
      qcEndProblems: '',
      qcEndImprovement: '',
    },
  });

  // FieldArray for Raw Materials
  const { fields: rawMaterialFields, append: appendRawMaterial, remove: removeRawMaterial } = useFieldArray({
    control: form.control,
    name: "rawMaterialsUsed",
  });

  // FieldArray for QC Analysis Items
  const { fields: qcAnalysisFields } = useFieldArray({
      control: form.control,
      name: "qcEndAnalysisItems"
  });

  // FieldArray for Packaging
  const { fields: packagingFields, append: appendPackaging, remove: removePackaging } = useFieldArray({
    control: form.control,
    name: "packagingUsed",
  });

  // --- onSubmit Function ---
  async function onSubmit(data: BatchFormValues) {
    const fakeUserId = 'user-3';
    const currentUserId = user ? user.uid : fakeUserId;
    const currentUser = mockUsers.find(u => u.id === currentUserId || u.id === fakeUserId);

    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. Decrement Raw Materials
        for (const material of data.rawMaterialsUsed) {
          const matRef = doc(firestore, COLLECTIONS.RAW_MATERIALS, material.materialId);
          const matDoc = await transaction.get(matRef);
          if (!matDoc.exists()) {
            throw new Error(`Raw material not found: ${material.materialId}`);
          }
          const matData = matDoc.data();
          if (matData.quantity < material.quantity) {
            throw new Error(`Not enough stock for ${matData.name || material.materialId}`);
          }
          transaction.update(matRef, { quantity: increment(-material.quantity) });
        }

        // 2. Decrement Packaging Materials (Simulated logic, replace with real transaction.get)
        for (const item of data.packagingUsed) {
          const pkgItem = packagingMaterials.find(p => p.id === item.packagingId);
          if (!pkgItem || pkgItem.quantity < item.quantity) {
             throw new Error(`Not enough stock for ${pkgItem?.name || item.packagingId}`);
          }
          // const pkgRef = doc(firestore, COLLECTIONS.PACKAGING, item.packagingId);
          // const pkgDoc = await transaction.get(pkgRef);
          // if (!pkgDoc.exists() || pkgDoc.data().quantity < item.quantity) {
          //   throw new Error(`Not enough stock for ${pkgDoc.data().name || item.packagingId}`);
          // }
          // transaction.update(pkgRef, { quantity: increment(-item.quantity) });
          console.log(`(Simulated) Debiting ${item.quantity} of ${pkgItem.name}`);
        }

        // 3. Increment Finished Product
        const prodRef = doc(firestore, COLLECTIONS.PRODUCTS, data.productId);
        transaction.update(prodRef, { 
          quantity: increment(data.batchSize) 
        });

        // 4. Create the Batch Manufacturing Record
        const batchRef = doc(collection(firestore, 'production_batches'));
        
        const productName = products?.find(p => p.id === data.productId)?.name || 'Unknown Product';
        const rawMaterialsUsedWithNames = data.rawMaterialsUsed.map(m => ({...m, name: rawMaterials?.find(rm => rm.id === m.materialId)?.name || 'Unknown'}));
        const packagingUsedWithNames = data.packagingUsed.map(p => ({...p, name: packagingMaterials?.find(pm => pm.id === p.packagingId)?.name || 'Unknown'}));

        const newBatchData = {
          // Batch Info
          productId: data.productId,
          productName: productName,
          dateOfMfg: data.dateOfMfg,
          batchNumber: data.batchNumber,
          batchSize: data.batchSize,
          mfRef: data.mfRef || '',
          
          // Materials
          rawMaterialsUsed: rawMaterialsUsedWithNames,
          packagingUsed: packagingUsedWithNames,
          
          // QC Info
          qcRawMaterialChecks: {
              sealsOk: data.qcRawSealsOk,
              weightOk: data.qcRawWeightOk,
              materialOk: data.qcRawMaterialOk,
          },
          qcEndProductAnalysis: {
              labelDetails: {
                  ...data.qcEndLabelDetails,
                  batchNo: data.batchNumber, // Copy batch number
              },
              analysisItems: data.qcEndAnalysisItems,
              problems: data.qcEndProblems || '',
              improvement: data.qcEndImprovement || '',
          },

          // System Info
          status: 'Completed' as const,
          createdBy: currentUserId,
          createdByName: currentUser?.name || 'Unknown User',
          createdAt: serverTimestamp(),
        };
        
        transaction.set(batchRef, newBatchData);
      });

      // --- Transaction Successful ---
      toast({
        title: 'Production Logged Successfully',
        description: `Batch ${data.batchNumber} created and stock updated.`,
      });
      form.reset();

    } catch (e: any) {
      // --- Transaction Failed ---
      console.error("Transaction failed: ", e);
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
        <h1 className="text-3xl font-bold font-headline tracking-tight">Batch Manufacturing Record</h1>
        <p className="text-muted-foreground">
          Log all details for a new production batch, from raw materials to final packaging.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>New Batch Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="batch">
                <TabsList className="mb-4">
                  <TabsTrigger value="batch">1. Batch Details</TabsTrigger>
                  <TabsTrigger value="materials">2. Raw Materials Used</TabsTrigger>
                  <TabsTrigger value="qc">3. Quality Control</TabsTrigger>
                  <TabsTrigger value="packaging">4. Packaging Used</TabsTrigger>
                </TabsList>

                {/* --- TAB 1: Batch Details --- */}
                <TabsContent value="batch" className="space-y-4">
                  {/* (This part is unchanged from last time) */}
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Finished Product</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a product..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {isLoadingProducts ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                             (products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfMfg"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Manufacture</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
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
                      name="batchNumber"
                      render={({ field }) => (
                        <FormItem><FormLabel>Batch Number</FormLabel>
                          <FormControl><Input placeholder="e.g., B-1045" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="batchSize"
                      render={({ field }) => (
                        <FormItem><FormLabel>Batch Size (Units)</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="mfRef"
                    render={({ field }) => (
                      <FormItem><FormLabel>M.F. Ref</FormLabel>
                        <FormControl><Input placeholder="Manufacturing Reference..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* --- TAB 2: Raw Materials Used --- */}
                <TabsContent value="materials" className="space-y-4">
                  {/* (This part is unchanged from last time) */}
                  <div className="space-y-2">
                    {rawMaterialFields.map((item, index) => (
                      <div key={item.id} className="flex gap-4 items-end p-2 border rounded-md">
                        <FormField
                          control={form.control}
                          name={`rawMaterialsUsed.${index}.materialId`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Raw Material</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select material..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {isLoadingMaterials ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                  (rawMaterials ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name} (Stock: {m.quantity})</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`rawMaterialsUsed.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="w-24">
                              <FormLabel>Quantity</FormLabel>
                              <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`rawMaterialsUsed.${index}.weighed`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col items-center justify-center pb-2">
                              <FormLabel>Weighed (✓)</FormLabel>
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5" /></FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeRawMaterial(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendRawMaterial({ materialId: '', quantity: 0, weighed: false })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Material
                  </Button>
                </TabsContent>
                
                
                {/* --- TAB 3: Quality Control (with Nested Tabs) --- */}
                <TabsContent value="qc" className="space-y-4">
                   <CardDescription>
                      Log all quality control checks for raw materials and the final product.
                   </CardDescription>
                   
                   <Tabs defaultValue="rawMaterial" className="w-full">
                      <TabsList>
                        <TabsTrigger value="rawMaterial">Raw Material QC</TabsTrigger>
                        <TabsTrigger value="endProduct">End Product QC</TabsTrigger>
                      </TabsList>
                      
                      {/* Sub-Tab 1: Raw Material QC */}
                      <TabsContent value="rawMaterial" className="pt-4 space-y-4">
                        <p className="text-sm text-muted-foreground">Confirm checks performed when raw materials were received.</p>
                        <FormField
                          control={form.control}
                          name="qcRawSealsOk"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal">No broken seals</FormLabel>
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="qcRawWeightOk"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal">Weight matches requested quantity</FormLabel>
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="qcRawMaterialOk"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal">Correct material type as ordered</FormLabel>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      {/* Sub-Tab 2: End Product QC (from Form 2) */}
                      <TabsContent value="endProduct" className="pt-4">
                        <div className="space-y-6">
                          
                          {/* Label Details Section */}
                          <div className="border p-4 rounded-md space-y-4">
                            <h4 className="font-semibold">Label Details & Yield</h4>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField
                                  control={form.control}
                                  name="qcEndLabelDetails.dateOfMfg"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Date of Mfg</FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
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
                                  name="qcEndLabelDetails.expDate"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Exp. Date</FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
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
                                  name="qcEndLabelDetails.yield"
                                  render={({ field }) => (
                                    <FormItem><FormLabel>Yield</FormLabel>
                                      <FormControl><Input placeholder="e.g., 500kg" {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="qcEndLabelDetails.expectedYield"
                                  render={({ field }) => (
                                    <FormItem><FormLabel>Expected Yield</FormLabel>
                                      <FormControl><Input placeholder="e.g., 510kg" {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                 <FormField
                                  control={form.control}
                                  name="qcEndLabelDetails.percentYield"
                                  render={({ field }) => (
                                    <FormItem><FormLabel>% Yield</FormLabel>
                                      <FormControl><Input placeholder="e.g., 98%" {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="qcEndLabelDetails.batchSheet"
                                  render={({ field }) => (
                                    <FormItem><FormLabel>Batch Sheet</FormLabel>
                                      <FormControl><Input {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="qcEndLabelDetails.stocked"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10 mt-9">
                                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                      <FormLabel className="font-normal">Stocked (yes/no)</FormLabel>
                                    </FormItem>
                                  )}
                                />
                             </div>
                          </div>
                          
                          {/* Analysis Table Section */}
                          <div className="border p-4 rounded-md">
                            <h4 className="font-semibold">Analysis</h4>
                            {qcAnalysisFields.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-1">
                                    <label className="col-span-3 text-xs">{item.analysis}</label>
                                    <FormField
                                      control={form.control}
                                      name={`qcEndAnalysisItems.${index}.standard`}
                                      render={({ field }) => (
                                        <FormItem className="col-span-4">
                                          <FormControl><Input placeholder="Standard" {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`qcEndAnalysisItems.${index}.obtained`}
                                      render={({ field }) => (
                                        <FormItem className="col-span-5">
                                          <FormControl><Input placeholder="Obtained" {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                </div>
                            ))}
                          </div>
                          
                          {/* Final Details Section */}
                          <div className="border p-4 rounded-md space-y-4">
                             <h4 className="font-semibold">Analysis Summary</h4>
                             <FormField
                                control={form.control}
                                name="qcEndProblems"
                                render={({ field }) => (
                                  <FormItem><FormLabel>Problems encountered/suggested</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="qcEndImprovement"
                                render={({ field }) => (
                                  <FormItem><FormLabel>Improvement</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="qcEndLabelDetails.analysedBy"
                                  render={({ field }) => (
                                    <FormItem><FormLabel>Analysed By</FormLabel>
                                      <FormControl><Input {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="qcEndLabelDetails.dateAnalysed"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Date Analysed</FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                        </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name="qcEndLabelDetails.releaseForFilling"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <FormLabel className="font-normal">Release for filling (yes/no)</FormLabel>
                                  </FormItem>
                                )}
                              />
                          </div>
                        </div>
                      </TabsContent>
                   </Tabs>
                </TabsContent>

                {/* --- TAB 4: Packaging Used --- */}
                <TabsContent value="packaging" className="space-y-4">
                  {/* (This part is unchanged from last time) */}
                  <div className="space-y-2">
                    {packagingFields.map((item, index) => (
                      <div key={item.id} className="flex gap-4 items-end p-2 border rounded-md">
                        <FormField
                          control={form.control}
                          name={`packagingUsed.${index}.packagingId`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Packaging Material</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {isLoadingPackaging ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                  (packagingMaterials ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name} (Stock: {m.quantity})</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`packagingUsed.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="w-24">
                              <FormLabel>Quantity</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removePackaging(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendPackaging({ packagingId: '', quantity: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Packaging Item
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Button type="submit" size="lg" className="w-full md:w-auto" disabled={form.formState.isSubmitting || isLoading}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Batch & Update All Stock
          </Button>
        </form>
      </Form>
      
      {/* This is where the Activity Log card from the original file would go.
        It's complex and we can add it back later to keep this file focused on the form.
      */}
    </div>
  );
}