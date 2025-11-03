// src/app/(app)/production/log/page.tsx
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
              {(productionActivities ?? []).map((activity: Activity) => (
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
                      {/* Check if timestamp is a Firestore timestamp */}
                      {activity.timestamp.toDate ? 
                        format(activity.timestamp.toDate(), "MM/dd/yyyy 'at' h:mm a") :
                        format(new Date(activity.timestamp), "MM/dd/yyyy 'at' h:mm a")
                      }
                    </p>
                  </div>
                </div>
              ))}
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
