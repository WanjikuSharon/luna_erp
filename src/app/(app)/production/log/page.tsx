// src/app/(app)/production/log/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
// UPDATED: Import ProductRecipe type
import type { RawMaterial, Product, PackagingMaterial, ProductRecipe } from '@/lib/types';
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
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import type { ProductionBatch } from '@/lib/types';

// UPDATED: Import the AI dialog and flow
import { AiSuggestionDialog } from '@/components/production/ai-suggestion-dialog';
import { suggestInventoryUpdate, type SuggestInventoryUpdateInput } from '@/ai/flows/suggest-inventory-update';

// QC Analysis Items (Unchanged)
const qcAnalysisTemplate = [
  "1. Colour appearance", "2. Feel/spread", "3. Smell", "4. Clarity", "5. Ph",
  "6. Viscosity", "7. Centrifuge stability", "8. Relative density", "9. A value",
  "10. Assay", "11. Other"
].map(item => ({ analysis: item, standard: '', obtained: '' }));


// Zod Schema (Unchanged)
const batchFormSchema = z.object({
  productId: z.string().min(1, 'Please select a product.'),
  dateOfMfg: z.date({ required_error: 'Date of manufacture is required.' }),
  batchNumber: z.string().min(1, 'Batch number is required.'),
  batchSize: z.coerce.number().min(1, 'Batch size must be at least 1.'),
  mfRef: z.string().optional(),
  rawMaterialsUsed: z.array(z.object({
    materialId: z.string().min(1, 'Select a material'),
    quantity: z.coerce.number().min(0.01, 'Qty > 0'),
    weighed: z.boolean().default(false),
  })).min(1, 'Add at least one raw material.'),
  qcRawSealsOk: z.boolean().default(false),
  qcRawWeightOk: z.boolean().default(false),
  qcRawMaterialOk: z.boolean().default(false),
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
  })).default(qcAnalysisTemplate),
  qcEndProblems: z.string().optional(),
  qcEndImprovement: z.string().optional(),
  packagingUsed: z.array(z.object({
    packagingId: z.string().min(1, 'Select packaging'),
    quantity: z.coerce.number().min(1, 'Qty > 0'),
  })).min(1, 'Add at least one packaging material.'),
});
type BatchFormValues = z.infer<typeof batchFormSchema>;

/**
 * Helper function to fetch historical usage data for a specific product and material
 * @param firestore - Firestore instance
 * @param productId - The product ID to search for
 * @param materialId - The raw material ID to search for
 * @returns A formatted string with historical usage data
 */
async function fetchHistoricalUsageData(
  firestore: any,
  productId: string,
  materialId: string
): Promise<string> {
  try {
    // Query the last 10 production batches for this product, ordered by creation date
    const batchesRef = collection(firestore, 'production_batches');
    const q = query(
      batchesRef,
      where('productId', '==', productId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 'No historical production data available for this product.';
    }

    // Extract usage data for the specific material
    const usageRecords: string[] = [];
    querySnapshot.forEach((doc) => {
      const batch = doc.data() as Omit<ProductionBatch, 'id'>;
      
      // Find the material in this batch's rawMaterialsUsed
      const materialUsage = batch.rawMaterialsUsed?.find(
        (m) => m.materialId === materialId
      );
      
      if (materialUsage && batch.batchNumber) {
        usageRecords.push(
          `Batch ${batch.batchNumber}: used ${materialUsage.quantity}${batch.rawMaterialsUsed[0]?.name ? '' : ' units'}`
        );
      }
    });

    if (usageRecords.length === 0) {
      return `This material hasn't been used in recent batches of this product.`;
    }

    // Return a formatted string
    return usageRecords.join(', ');
  } catch (error) {
    logger.error('Error fetching historical usage data:', error);
    return 'Unable to retrieve historical data at this time.';
  }
}

const logger = createLogger('production-log');

export default function LogProductionPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // --- UPDATED: Add state for the AI Dialog ---
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [discrepancyData, setDiscrepancyData] = useState<SuggestInventoryUpdateInput | null>(null);

  // --- Data Fetching (Unchanged) ---
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const productsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PRODUCTS), [firestore]);
  const packagingRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PACKAGING), [firestore]);

  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);
  const { data: packagingMaterials, isLoading: isLoadingPackaging } = useCollection<PackagingMaterial>(packagingRef);

  const isLoading = isLoadingMaterials || isLoadingProducts || isLoadingPackaging || isUserLoading;

  // --- Form Setup (Unchanged) ---
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      productId: '',
      batchNumber: '',
      mfRef: '',
      rawMaterialsUsed: [],
      packagingUsed: [],
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
      qcEndAnalysisItems: qcAnalysisTemplate,
      qcEndProblems: '',
      qcEndImprovement: '',
    },
  });

  // FieldArrays (Unchanged)
  const { fields: rawMaterialFields, append: appendRawMaterial, remove: removeRawMaterial } = useFieldArray({
    control: form.control,
    name: "rawMaterialsUsed",
  });
  const { fields: qcAnalysisFields } = useFieldArray({
      control: form.control,
      name: "qcEndAnalysisItems"
  });
  const { fields: packagingFields, append: appendPackaging, remove: removePackaging } = useFieldArray({
    control: form.control,
    name: "packagingUsed",
  });

  // --- UPDATED: onSubmit Function ---
  async function onSubmit(data: BatchFormValues) {
    // Require authentication
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "You must be logged in to log a production batch." });
      return;
    }

    const currentUserId = user.uid;
    const userName = user.displayName || user.email || 'Production User';

    // --- 1. Run the Inventory Transaction (Unchanged) ---
    try {
      await runTransaction(firestore, async (transaction) => {
        // (Decrement Raw Materials logic - unchanged)
        const rawMaterialDocs = [];
        for (const material of data.rawMaterialsUsed) {
          const matRef = doc(firestore, COLLECTIONS.RAW_MATERIALS, material.materialId);
          const matDoc = await transaction.get(matRef);
          if (!matDoc.exists() || matDoc.data().quantity < material.quantity) {
            throw new Error(`Not enough stock for ${matDoc.data()?.name || material.materialId}`);
          }
          rawMaterialDocs.push({ ref: matRef, material });
        }
        
        // (Decrement Packaging Materials logic - unchanged)
        const packagingDocs = [];
        for (const item of data.packagingUsed) {
          const pkgRef = doc(firestore, COLLECTIONS.PACKAGING, item.packagingId);
          const pkgDoc = await transaction.get(pkgRef);
          if (!pkgDoc.exists() || pkgDoc.data().quantity < item.quantity) {
            throw new Error(`Not enough stock for ${pkgDoc.data()?.name || item.packagingId}`);
          }
          packagingDocs.push({ ref: pkgRef, item });
        }

        // Decrement ALL Raw Materials
        for (const { ref, material } of rawMaterialDocs) {
          transaction.update(ref, { quantity: increment(-material.quantity) });
        }

        // Decrement ALL Packaging Materials
        for (const { ref, item } of packagingDocs) {
          transaction.update(ref, { quantity: increment(-item.quantity) });
        }

        // (Increment Product logic - unchanged)
        const prodRef = doc(firestore, COLLECTIONS.PRODUCTS, data.productId);
        transaction.update(prodRef, { quantity: increment(data.batchSize) });

        // (Create Batch Record logic - unchanged)
        const batchRef = doc(collection(firestore, 'production_batches'));
        const productName = products?.find(p => p.id === data.productId)?.name || 'Unknown Product';
        const rawMaterialsUsedWithNames = data.rawMaterialsUsed.map(m => ({...m, name: rawMaterials?.find(rm => rm.id === m.materialId)?.name || 'Unknown'}));
        const packagingUsedWithNames = data.packagingUsed.map(p => ({...p, name: packagingMaterials?.find(pm => pm.id === p.packagingId)?.name || 'Unknown'}));
        const newBatchData = {
          productId: data.productId,
          productName: productName,
          dateOfMfg: data.dateOfMfg,
          batchNumber: data.batchNumber,
          batchSize: data.batchSize,
          mfRef: data.mfRef || '',
          rawMaterialsUsed: rawMaterialsUsedWithNames,
          packagingUsed: packagingUsedWithNames,
          qcRawMaterialChecks: {
              sealsOk: data.qcRawSealsOk,
              weightOk: data.qcRawWeightOk,
              materialOk: data.qcRawMaterialOk,
          },
          qcEndProductAnalysis: {
              labelDetails: {
                  ...data.qcEndLabelDetails,
                  batchNo: data.batchNumber,
              },
              analysisItems: data.qcEndAnalysisItems,
          problems: data.qcEndProblems || '',
          improvement: data.qcEndImprovement || '',
          },
          status: 'Completed' as const,
          createdBy: currentUserId,
          createdByName: userName,
          createdAt: serverTimestamp(),
        };
        transaction.set(batchRef, newBatchData);
      });

      // --- 2. Transaction Successful: Check for Discrepancies ---
      logger.debug('Transaction successful. Checking for discrepancies...');
      let discrepancyFound = false;

      // Fetch the recipe for the product
      const recipeRef = doc(firestore, 'product_recipes', data.productId);
      const recipeSnap = await getDoc(recipeRef);

      if (!recipeSnap.exists()) {
        // No recipe found, so we can't check. Just show success.
        logger.warn(`No recipe found for product ${data.productId}. Skipping discrepancy check.`);
      } else {
        const recipe = recipeSnap.data() as Omit<ProductRecipe, 'id'>;
        
        // Loop over all raw materials the user said they used
        for (const usedMaterial of data.rawMaterialsUsed) {
          // Find this material in the recipe
          const recipeMaterial = recipe.materials.find(m => m.materialId === usedMaterial.materialId);
          
          if (!recipeMaterial) continue; // Material isn't in the recipe, skip check

          // Calculate what *should* have been used
          const expectedQuantityUsed = recipeMaterial.quantity * data.batchSize;
          const reportedQuantityUsed = usedMaterial.quantity;

          // Check for a significant discrepancy (e.g., more than 1% difference)
          if (Math.abs(reportedQuantityUsed - expectedQuantityUsed) / expectedQuantityUsed > 0.01) {
            logger.info(`Discrepancy found for ${usedMaterial.materialId}!`);
            const materialName = rawMaterials?.find(rm => rm.id === usedMaterial.materialId)?.name || 'Unknown Material';
            
            // Fetch real historical usage data from Firestore
            const historicalData = await fetchHistoricalUsageData(
              firestore,
              data.productId,
              usedMaterial.materialId
            );
            
            // Set the data for the AI dialog
            setDiscrepancyData({
              rawMaterial: materialName,
              reportedQuantityUsed: reportedQuantityUsed,
              expectedQuantityUsed: expectedQuantityUsed,
              historicalUsageData: historicalData,
            });
            setIsAiDialogOpen(true); // Open the AI dialog
            discrepancyFound = true;
            break; // Stop checking after the first discrepancy is found
          }
        }
      }

      // If no discrepancy was found, show the normal success toast
      if (!discrepancyFound) {
        toast({
          title: 'Production Logged Successfully',
          description: `Batch ${data.batchNumber} created and stock updated.`,
        });
      }
      form.reset();

    } catch (e: any) {
      // --- Transaction Failed ---
      logger.error("Transaction failed: ", e);
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: e.message || "Could not update stock. Please try again.",
      });
    }
  }

  // --- Main Render (UPDATED) ---
  return (
    <> {/* UPDATED: Wrap in fragment */}
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
                  <FormField control={form.control} name="productId" render={({ field }) => (
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
                    <FormField control={form.control} name="dateOfMfg" render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Manufacture</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
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
                    <FormField control={form.control} name="batchNumber" render={({ field }) => (
                        <FormItem><FormLabel>Batch Number</FormLabel>
                          <FormControl><Input placeholder="e.g., B-1045" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField control={form.control} name="batchSize" render={({ field }) => (
                        <FormItem><FormLabel>Batch Size (Units)</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField control={form.control} name="mfRef" render={({ field }) => (
                      <FormItem><FormLabel>M.F. Ref</FormLabel>
                        <FormControl><Input placeholder="Manufacturing Reference..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* --- TAB 2: Raw Materials Used --- */}
                <TabsContent value="materials" className="space-y-4">
                  <div className="space-y-2">
                    {rawMaterialFields.map((item, index) => (
                      <div key={item.id} className="flex gap-4 items-end p-2 border rounded-md">
                        <FormField control={form.control} name={`rawMaterialsUsed.${index}.materialId`} render={({ field }) => (
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
                        <FormField control={form.control} name={`rawMaterialsUsed.${index}.quantity`} render={({ field }) => (
                            <FormItem className="w-24">
                              <FormLabel>Quantity</FormLabel>
                              <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField control={form.control} name={`rawMaterialsUsed.${index}.weighed`} render={({ field }) => (
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
                
                {/* --- TAB 3: Quality Control --- */}
                <TabsContent value="qc" className="space-y-4">
                   <CardDescription>
                      Log all quality control checks for raw materials and the final product.
                   </CardDescription>
                   <Tabs defaultValue="rawMaterial" className="w-full">
                      <TabsList>
                        <TabsTrigger value="rawMaterial">Raw Material QC</TabsTrigger>
                        <TabsTrigger value="endProduct">End Product QC</TabsTrigger>
                      </TabsList>
                      <TabsContent value="rawMaterial" className="pt-4 space-y-4">
                        <FormField control={form.control} name="qcRawSealsOk" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal">No broken seals</FormLabel>
                            </FormItem>
                          )}
                        />
                         <FormField control={form.control} name="qcRawWeightOk" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal">Weight matches requested quantity</FormLabel>
                            </FormItem>
                          )}
                        />
                         <FormField control={form.control} name="qcRawMaterialOk" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal">Correct material type as ordered</FormLabel>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="endProduct" className="pt-4">
                        <div className="space-y-6">
                          <div className="border p-4 rounded-md space-y-4">
                            <h4 className="font-semibold">Label Details & Yield</h4>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="qcEndLabelDetails.dateOfMfg" render={({ field }) => (
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
                                <FormField control={form.control} name="qcEndLabelDetails.expDate" render={({ field }) => (
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
                                <FormField control={form.control} name="qcEndLabelDetails.yield" render={({ field }) => (
                                    <FormItem><FormLabel>Yield</FormLabel>
                                      <FormControl><Input placeholder="e.g., 500kg" {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField control={form.control} name="qcEndLabelDetails.expectedYield" render={({ field }) => (
                                    <FormItem><FormLabel>Expected Yield</FormLabel>
                                      <FormControl><Input placeholder="e.g., 510kg" {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                 <FormField control={form.control} name="qcEndLabelDetails.percentYield" render={({ field }) => (
                                    <FormItem><FormLabel>% Yield</FormLabel>
                                      <FormControl><Input placeholder="e.g., 98%" {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField control={form.control} name="qcEndLabelDetails.batchSheet" render={({ field }) => (
                                    <FormItem><FormLabel>Batch Sheet</FormLabel>
                                      <FormControl><Input {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField control={form.control} name="qcEndLabelDetails.stocked" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10 mt-9">
                                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                      <FormLabel className="font-normal">Stocked (yes/no)</FormLabel>
                                    </FormItem>
                                  )}
                                />
                             </div>
                          </div>
                          <div className="border p-4 rounded-md">
                            <h4 className="font-semibold">Analysis</h4>
                            {qcAnalysisFields.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-1">
                                    <Label className="col-span-3 text-xs">{item.analysis}</Label>
                                    <FormField control={form.control} name={`qcEndAnalysisItems.${index}.standard`} render={({ field }) => (
                                        <FormItem className="col-span-4">
                                          <FormControl><Input placeholder="Standard" {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField control={form.control} name={`qcEndAnalysisItems.${index}.obtained`} render={({ field }) => (
                                        <FormItem className="col-span-5">
                                          <FormControl><Input placeholder="Obtained" {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                </div>
                            ))}
                          </div>
                          <div className="border p-4 rounded-md space-y-4">
                             <h4 className="font-semibold">Analysis Summary</h4>
                             <FormField control={form.control} name="qcEndProblems" render={({ field }) => (
                                  <FormItem><FormLabel>Problems encountered/suggested</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField control={form.control} name="qcEndImprovement" render={({ field }) => (
                                  <FormItem><FormLabel>Improvement</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="qcEndLabelDetails.analysedBy" render={({ field }) => (
                                    <FormItem><FormLabel>Analysed By</FormLabel>
                                      <FormControl><Input {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField control={form.control} name="qcEndLabelDetails.dateAnalysed" render={({ field }) => (
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
                              <FormField control={form.control} name="qcEndLabelDetails.releaseForFilling" render={({ field }) => (
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
      </div>

      {/* --- UPDATED: Add the AI Suggestion Dialog --- */}
      <AiSuggestionDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        discrepancyData={discrepancyData}
      />
    </>
  );
}
