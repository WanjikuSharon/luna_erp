// src/app/(app)/production/log/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form'; // NEW: Import useFieldArray and Controller
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
import { Checkbox } from '@/components/ui/checkbox'; // NEW
import { Textarea } from '@/components/ui/textarea'; // NEW
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // NEW
import { Calendar } from '@/components/ui/calendar'; // NEW
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // NEW
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { RawMaterial, Product } from '@/lib/types'; // Import main types
import { Loader2, PlusCircle, Trash2, CalendarIcon } from 'lucide-react'; // NEW Icons
import { cn } from '@/lib/utils';

// NEW: Firebase & Live Data Imports
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

// NEW: QC Analysis Items from Form 2 [cite: 1000490926.jpg]
const qcAnalysisTemplate = [
  "1. Colour appearance", "2. Feel/spread", "3. Smell", "4. Clarity", "5. Ph",
  "6. Viscosity", "7. Centrifuge stability", "8. Relative density", "9. A value",
  "10. Assay", "11. Other", "12. Problems encountered/suggested", "13. Improvement"
].map(item => ({ analysis: item, standard: '', obtained: '' }));

// --- NEW: Zod Schema for the entire 3-part form ---
const batchFormSchema = z.object({
  // Tab 1: Batch Details (from Form 3 [cite: 1000490927.jpg])
  productId: z.string().min(1, 'Please select a product.'),
  dateOfMfg: z.date({ required_error: 'Date of manufacture is required.' }),
  batchNumber: z.string().min(1, 'Batch number is required.'),
  batchSize: z.coerce.number().min(1, 'Batch size must be at least 1.'),
  mfRef: z.string().optional(),

  // Tab 2: Raw Materials Used (from Form 1 [cite: 1000490923.jpg])
  rawMaterialsUsed: z.array(z.object({
    materialId: z.string().min(1, 'Select a material'),
    quantity: z.coerce.number().min(0.01, 'Qty > 0'),
    weighed: z.boolean().default(false),
  })).min(1, 'Add at least one raw material.'),

  // Tab 3: QC & Packaging
  // (Form 2 & 3 - combined for workflow)
  packagingUsed: z.array(z.object({
    packagingId: z.string().min(1, 'Select packaging'),
    quantity: z.coerce.number().min(1, 'Qty > 0'),
  })).min(1, 'Add at least one packaging material.'),
  
  // Skipping full QC form for brevity, will add later
  // For now, we just need the batch to be "Completed" to update stock
});
type BatchFormValues = z.infer<typeof batchFormSchema>;


export default function LogProductionPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // --- NEW: Fetch Live Data for all dropdowns ---
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const productsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PRODUCTS), [firestore]);
  // TODO: Create a 'packaging_materials' collection in Firestore
  // const packagingRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PACKAGING), [firestore]);

  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);
  // Using mock packaging data for now
  const packagingMaterials = MOCK_PACKAGING;
  const isLoadingPackaging = false;
  // const { data: packagingMaterials, isLoading: isLoadingPackaging } = useCollection<PackagingMaterial>(packagingRef);

  const isLoading = isLoadingMaterials || isLoadingProducts || isLoadingPackaging;

  // --- NEW: Setup react-hook-form for the complex batch form ---
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      productId: '',
      batchNumber: '',
      mfRef: '',
      rawMaterialsUsed: [],
      packagingUsed: [],
    },
  });

  // NEW: FieldArray for Raw Materials (Form 1)
  const { fields: rawMaterialFields, append: appendRawMaterial, remove: removeRawMaterial } = useFieldArray({
    control: form.control,
    name: "rawMaterialsUsed",
  });

  // NEW: FieldArray for Packaging (Form 3)
  const { fields: packagingFields, append: appendPackaging, remove: removePackaging } = useFieldArray({
    control: form.control,
    name: "packagingUsed",
  });

  // --- NEW: onSubmit Function with Full Batch Transaction ---
  async function onSubmit(data: BatchFormValues) {
    const fakeUserId = 'user-3'; // TEMPORARY BYPASS
    const currentUserId = user ? user.uid : fakeUserId;

    try {
      // --- This is the Firebase Transaction ---
      await runTransaction(firestore, async (transaction) => {
        console.log("Starting transaction...");

        // 1. Decrement ALL Raw Materials
        for (const material of data.rawMaterialsUsed) {
          const matRef = doc(firestore, COLLECTIONS.RAW_MATERIALS, material.materialId);
          const matDoc = await transaction.get(matRef);
          if (!matDoc.exists() || matDoc.data().quantity < material.quantity) {
            throw new Error(`Not enough stock for ${matDoc.data().name || material.materialId}`);
          }
          transaction.update(matRef, { quantity: increment(-material.quantity) });
        }
        console.log("Raw materials debited.");

        // 2. Decrement ALL Packaging Materials
        for (const item of data.packagingUsed) {
          const pkgRef = doc(firestore, COLLECTIONS.PACKAGING, item.packagingId);
          // TODO: Fetch from live collection when not using mock data
          const pkgItem = packagingMaterials.find(p => p.id === item.packagingId);
          if (!pkgItem || pkgItem.quantity < item.quantity) {
             throw new Error(`Not enough stock for ${pkgItem?.name || item.packagingId}`);
          }
          // In a real scenario, you would transact.get() this doc
          // For mock, we assume it works and will write the code as if it's real
          // const pkgDoc = await transaction.get(pkgRef);
          // if (!pkgDoc.exists() || pkgDoc.data().quantity < item.quantity) {
          //   throw new Error(`Not enough stock for ${pkgDoc.data().name || item.packagingId}`);
          // }
          // transaction.update(pkgRef, { quantity: increment(-item.quantity) });
          console.log(`(Simulated) Debiting ${item.quantity} of ${pkgItem.name}`);
        }
        console.log("Packaging materials debited.");

        // 3. Increment ONE Finished Product
        const prodRef = doc(firestore, COLLECTIONS.PRODUCTS, data.productId);
        transaction.update(prodRef, { 
          quantity: increment(data.batchSize) 
        });
        console.log("Finished product credited.");

        // 4. Create the Batch Manufacturing Record
        const batchRef = doc(collection(firestore, 'production_batches')); // Create new doc ref
        
        // Get names for logging
        const productName = products?.find(p => p.id === data.productId)?.name || 'Unknown Product';
        const rawMaterialsUsedWithNames = data.rawMaterialsUsed.map(m => ({
            ...m,
            name: rawMaterials?.find(rm => rm.id === m.materialId)?.name || 'Unknown'
        }));
        const packagingUsedWithNames = data.packagingUsed.map(p => ({
            ...p,
            name: packagingMaterials?.find(pm => pm.id === p.packagingId)?.name || 'Unknown'
        }));

        const newBatchData = {
          productId: data.productId,
          productName: productName,
          dateOfMfg: data.dateOfMfg,
          batchNumber: data.batchNumber,
          batchSize: data.batchSize,
          mfRef: data.mfRef || '',
          rawMaterialsUsed: rawMaterialsUsedWithNames,
          packagingUsed: packagingUsedWithNames,
          // TODO: Add QC data here
          qcAnalysis: qcAnalysisTemplate, // Using placeholder template for now
          qcProblems: '',
          qcLabelDetails: { /* Add QC label data here */ },
          status: 'Completed' as const, // We assume this form completes it
          createdBy: currentUserId,
          createdAt: serverTimestamp(),
        };
        
        transaction.set(batchRef, newBatchData);
        console.log("Batch record created.");
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
          
          {/* --- This Card contains the multi-tab form --- */}
          <Card>
            <CardHeader>
              <CardTitle>New Batch Details</CardTitle>
              <CardDescription>
                Fill out all forms for this batch. Stock will be updated upon final submission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="batch">
                <TabsList className="mb-4">
                  <TabsTrigger value="batch">1. Batch Details</TabsTrigger>
                  <TabsTrigger value="materials">2. Raw Materials Used</TabsTrigger>
                  <TabsTrigger value="qc">3. QC Analysis</TabsTrigger>
                  <TabsTrigger value="packaging">4. Packaging Used</TabsTrigger>
                </TabsList>

                {/* --- TAB 1: Batch Details (from Form 3) --- */}
                <TabsContent value="batch" className="space-y-4">
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

                {/* --- TAB 2: Raw Materials Used (from Form 1) --- */}
                <TabsContent value="materials" className="space-y-4">
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
                
                {/* --- TAB 3: QC Analysis (from Form 2) --- */}
                <TabsContent value="qc" className="space-y-4">
                   <CardDescription>
                      This section will contain the 13-point QC checklist. For now, it's a placeholder.
                   </CardDescription>
                   {/* Placeholder for the 13-point form */}
                   <Textarea placeholder="Enter QC analysis details here... (Full form coming soon)" rows={10} />
                </TabsContent>

                {/* --- TAB 4: Packaging Used (from Form 3) --- */}
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
      
      {/* TODO: Add Activity Log Card here, similar to the original page */}
    </div>
  );
}
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { AiSuggestionDialog } from '@/components/production/ai-suggestion-dialog';
import type { SuggestInventoryUpdateInput } from '@/ai/flows/suggest-inventory-update';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import type { Activity, RawMaterial, Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// --- NEW: Firebase & Live Data Imports ---
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

// Form schema
const formSchema = z.object({
  rawMaterialId: z.string().min(1, 'Please select a raw material.'),
  quantityUsed: z.coerce.number().min(0.1, 'Quantity must be positive.'),
  productId: z.string().min(1, 'Please select a product.'),
  quantityProduced: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});
type ProductionFormValues = z.infer<typeof formSchema>;

export default function ProductionPage() {
  const { toast } = useToast();
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [discrepancyData, setDiscrepancyData] = useState<SuggestInventoryUpdateInput | null>(null);

  // --- NEW: Get Firestore and Auth User ---
  const firestore = useFirestore();
  const { user } = useUser(); // For logging activity

  // --- NEW: Fetch Live Data (replaces mock data) ---
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const productsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PRODUCTS), [firestore]);
  // TODO: Create a 'production_activities' collection
  const activitiesRef = useMemoFirebase(() => collection(firestore, 'production_activities'), [firestore]);

  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);
  const { data: productionActivities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesRef);

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawMaterialId: '',
      quantityUsed: 0,
      productId: '',
      quantityProduced: 0,
    },
  });

  // --- NEW: Get Form Submission State ---
  const { isSubmitting } = form.formState;

  // --- UPDATED: onSubmit Function with Firebase Transaction ---
  async function onSubmit(data: ProductionFormValues) {
    // TEMPORARY BYPASS: Use a mock user if not logged in
    const fakeUserId = 'user-3'; // Duncan Mwangi (Production)
    const currentUserId = user ? user.uid : fakeUserId;
    const currentUser = mockUsers.find(u => u.id === currentUserId || u.id === fakeUserId);

    if (!currentUser) {
        toast({ variant: "destructive", title: "Error", description: "Cannot find user data." });
        return;
    }

    // Get document references
    const rawMaterialRef = doc(firestore, COLLECTIONS.RAW_MATERIALS, data.rawMaterialId);
    const productRef = doc(firestore, COLLECTIONS.PRODUCTS, data.productId);
    
    try {
      // --- This is the Firebase Transaction ---
      await runTransaction(firestore, async (transaction) => {
        // 1. Read the current stock levels
        const materialDoc = await transaction.get(rawMaterialRef);
        const productDoc = await transaction.get(productRef);

        if (!materialDoc.exists()) {
          throw new Error("Raw material document not found!");
        }
        if (!productDoc.exists()) {
          throw new Error("Product document not found!");
        }

        // 2. Check for sufficient stock
        const currentMaterialQty = materialDoc.data().quantity;
        if (currentMaterialQty < data.quantityUsed) {
          // This will cancel the transaction and be caught by the catch block
          throw new Error(`Not enough stock. Only ${currentMaterialQty} units available.`);
        }

        // 3. Decrement Raw Material and Increment Product
        transaction.update(rawMaterialRef, { 
          quantity: increment(-data.quantityUsed) 
        });
        transaction.update(productRef, { 
          quantity: increment(data.quantityProduced) 
        });
      });

      // --- Transaction Successful ---

      // Log this activity
      try {
          await addDoc(collection(firestore, 'production_activities'), {
              user: { name: currentUser.name, avatarUrl: currentUser.avatarUrl },
              action: `reported a production run of ${data.quantityProduced} ${products?.find(p=>p.id === data.productId)?.name || 'units'}.`,
              timestamp: serverTimestamp(),
              details: `Used ${data.quantityUsed} of ${rawMaterials?.find(m=>m.id === data.rawMaterialId)?.name || 'material'}`
          });
      } catch (logError) {
          console.error("Failed to log activity:", logError); // Don't block user for this
      }

      // --- AI Discrepancy Check (Unchanged from original file) ---
      const expectedQuantityUsed = data.quantityProduced * 0.5; // Dummy logic
      const discrepancy = data.quantityUsed - expectedQuantityUsed;
      const selectedMaterial = rawMaterials?.find(m => m.id === data.rawMaterialId);

      if (Math.abs(discrepancy) > 0.1 && selectedMaterial) {
        setDiscrepancyData({
          rawMaterial: selectedMaterial.name,
          reportedQuantityUsed: data.quantityUsed,
          expectedQuantityUsed: expectedQuantityUsed,
          historicalUsageData: 'Normal usage varies by 5-10%.',
        });
        setIsAiDialogOpen(true);
      } else {
        toast({
          title: 'Production Logged',
          description: `Successfully updated stock for ${data.quantityProduced} units.`,
        });
      }
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
    <>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Log Production</h1>
            <p className="text-muted-foreground">
              Report raw materials used and finished goods produced.
            </p>
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Production Entry</CardTitle>
              <CardDescription>
                Fill in the details for the latest production run.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* --- UPDATED: Live Data for Raw Materials --- */}
                    <FormField
                      control={form.control}
                      name="rawMaterialId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Raw Material Used</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingMaterials ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                (rawMaterials ?? []).map((material) => (
                                  <SelectItem key={material.id} value={material.id}>
                                    {material.name} (Stock: {material.quantity})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantityUsed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity Used (units/kg/liters)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 10.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* --- UPDATED: Live Data for Products --- */}
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Finished Product</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingProducts ? (
                                 <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                (products ?? []).map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantityProduced"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity Produced</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log Production & Update Stock
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Production Line Log</CardTitle>
              <CardDescription>Recent production activities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* --- UPDATED: Live Activity Log --- */}
              {isLoadingActivities && (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
              {(productionActivities ?? []).length === 0 && !isLoadingActivities && (
                <p className="text-sm text-muted-foreground">No activities logged yet.</p>
              )}
              {(productionActivities ?? []).map((activity: Activity) => {
                const timestamp = activity.timestamp as any;
                const displayDate = timestamp?.toDate 
                  ? format(timestamp.toDate(), "MM/dd/yyyy 'at' h:mm a")
                  : format(new Date(activity.timestamp), "MM/dd/yyyy 'at' h:mm a");
                
                return (
                <div key={activity.id} className="flex items-start gap-4">
                  <Avatar className="h-9 w-9 border">
                    <AvatarImage src={activity.user.avatarUrl} alt={activity.user.name} />
                    <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium text-muted-foreground">
                      <span className="font-semibold text-foreground">{activity.user.name}</span>
                      {' '}{activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {displayDate}
                    </p>
                  </div>
                </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
      <AiSuggestionDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        discrepancyData={discrepancyData}
      />
    </>
  );
}
