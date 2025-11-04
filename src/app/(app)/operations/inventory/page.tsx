// src/app/(app)/operations/inventory/page.tsx
'use client';

// Basic React/Next imports
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Shadcn UI Components
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Keep for Raw Materials status
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Icons
import { PlusCircle, Search, Edit, Trash2, Loader2 } from 'lucide-react';

// Firebase & Data
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { RawMaterial, Vendor } from '@/lib/types';
import { COLLECTIONS } from '@/services/inventory_service';
import { sendRequestEmail } from '@/ai/flows/send-request-email';
import { users as mockUsers } from '@/lib/data'; // For requester name

// --- Form Schema for "New Delivery Request" (matches screenshot) ---
const requestFormSchema = z.object({
  materialId: z.string().min(1, 'Please select a material.'),
  quantity: z.coerce.number().min(0.1, 'Quantity must be positive.'),
  unit: z.string().min(1, 'Please select units.'),
  vendorId: z.string().min(1, 'Please select a vendor.'),
});
type RequestFormValues = z.infer<typeof requestFormSchema>;

// --- Mock Data (Replace with Firestore later) ---
// TODO: Replace this with a useCollection hook for COLLECTIONS.VENDORS
const MOCK_VENDORS: Vendor[] = [
    { id: 'v1', name: 'Tech Supplies Inc.', email: 'techsupplies@example.com' },
    { id: 'v2', name: 'Global Materials Co.', email: 'globalmaterials@example.com' },
    { id: 'v3', name: 'Quality Components Ltd.', email: 'qualityparts@example.com' },
    { id: 'v4', name: 'Industrial Solutions LLC', email: 'industrialsolutions@example.com' },
    { id: 'v5', name: 'Precision Parts Corp.', email: 'precisionparts@example.com' },
];

// --- Main Page Component ---
export default function VendorsAndMaterialsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser(); // Needed for submitting requests

  // State for the "New Delivery Request" dialog
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  // State for the "Add Vendor" dialog (stubbed for now)
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = useState(false);
  // State for the "Add Raw Material" dialog (stubbed for now)
  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false);

  // State for vendor search term
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');

  // Fetch live Raw Materials data
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);

  // Use mock vendors for now, add Firestore fetch later
  const vendors = MOCK_VENDORS; // Replace with useCollection later
  const isLoadingVendors = false; // Set to true when using useCollection

  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    if (!vendorSearchTerm) return vendors;
    return vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(vendorSearchTerm.toLowerCase())
    );
  }, [vendors, vendorSearchTerm]);

  // Form for the "New Delivery Request" Dialog
  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: { materialId: '', quantity: 0, unit: '', vendorId: '' },
  });

  // Handle Submission of "New Delivery Request"
  async function onSubmitRequest(data: RequestFormValues) {
    const fakeUserId = 'user-2'; // TEMPORARY BYPASS FOR AUTH
    const currentUserId = user ? user.uid : fakeUserId;
    
    const requester = mockUsers.find(u => u.id === currentUserId || u.id === fakeUserId);
    const material = rawMaterials?.find(m => m.id === data.materialId);
    const vendor = vendors?.find(v => v.id === data.vendorId);

    if (!requester || !material || !vendor) {
        toast({ variant: "destructive", title: "Data Error", description: "Could not find user, material, or vendor details." });
        return;
    }

    let newRequestId: string | null = null;

    try {
      const docRef = await addDoc(collection(firestore, COLLECTIONS.REQUESTS), {
        materialId: data.materialId,
        quantity: data.quantity,
        unit: data.unit,
        vendorId: data.vendorId,
        requestedBy: currentUserId,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      newRequestId = docRef.id;
      toast({ title: "Delivery Request Sent", description: "Your request has been logged." });
      requestForm.reset();
      setIsRequestDialogOpen(false);

      // --- Call Genkit Flow (as planned by senior dev) ---
      sendRequestEmail({
          requestId: newRequestId,
          materialName: material.name,
          quantity: data.quantity,
          requesterName: requester.name,
          vendorName: vendor.name,
          requestUrl: `${window.location.origin}/operations/requests?requestId=${newRequestId}`,
      }).catch(flowError => {
          console.error("Error invoking sendRequestEmail flow:", flowError);
      });

    } catch (error) {
      console.error("Error submitting request:", error);
      toast({ variant: "destructive", title: "Submission Failed", description: "Could not save request." });
    }
  }

  // Helper for raw material status
  function getStatus(item: RawMaterial) {
    if (item.quantity === 0) return { text: 'Out of Stock', variant: 'destructive' as const };
    if (item.quantity < item.reorderPoint) return { text: 'Low Stock', variant: 'outline' as const };
    return { text: 'In Stock', variant: 'secondary' as const };
  }

  // --- Main Render ---
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <h1 className="text-3xl font-bold font-headline tracking-tight">Vendors & Materials</h1>

        {/* --- Create New Delivery Request Button + Dialog --- */}
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Delivery Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Delivery Request</DialogTitle>
            </DialogHeader>
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(onSubmitRequest)} className="space-y-4 py-4">
                {/* Raw Material Select */}
                <FormField
                  control={requestForm.control}
                  name="materialId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raw Material</FormLabel>
                      <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Automatically set unit based on selected material
                          const selectedMat = rawMaterials?.find(m => m.id === value);
                          if (selectedMat) requestForm.setValue('unit', selectedMat.unit);
                      }} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a material..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {isLoadingMaterials ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                           (rawMaterials ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Quantity and Units Side-by-Side */}
                <div className="grid grid-cols-3 gap-4">
                   <FormField
                    control={requestForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Quantity</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="e.g., 500" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={requestForm.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Units</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="liters">liters</SelectItem>
                            <SelectItem value="units">units</SelectItem>
                            <SelectItem value="rolls">rolls</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Vendor Select */}
                 <FormField
                  control={requestForm.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a vendor..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {isLoadingVendors ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                           (vendors ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={requestForm.formState.isSubmitting}>
                    {requestForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Request
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- Tabs for Vendors and Raw Materials --- */}
      <Tabs defaultValue="vendors">
        <TabsList className="mb-4">
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="rawMaterials">Raw Materials</TabsTrigger>
        </TabsList>

        {/* --- Vendors Tab --- */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                  <div className="space-y-1">
                      <CardTitle>Manage Vendors</CardTitle>
                      <CardDescription>Add, view, or edit supplier information.</CardDescription>
                  </div>
                  {/* Add Vendor Button + Dialog (Stubbed) */}
                   <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
                     <DialogTrigger asChild>
                       <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Vendor</Button>
                     </DialogTrigger>
                     <DialogContent>
                         <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
                         <p>Form for adding a new vendor will go here.</p>
                         <DialogFooter>
                            <Button variant="ghost" onClick={()=>setIsAddVendorDialogOpen(false)}>Cancel</Button>
                            <Button onClick={()=> { /* Add save logic here */ setIsAddVendorDialogOpen(false); }}>Save Vendor</Button>
                         </DialogFooter>
                     </DialogContent>
                   </Dialog>
              </div>
              {/* Search Input */}
              <div className="relative mt-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search vendors..."
                    className="pl-8 w-full sm:w-[300px]"
                    value={vendorSearchTerm}
                    onChange={(e) => setVendorSearchTerm(e.target.value)}
                  />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingVendors ? <p>Loading vendors...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center">No vendors found.</TableCell></TableRow>
                    )}
                    {filteredVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.email}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="px-2">View/Edit</Button>
                          <Button variant="link" className="px-2 text-destructive hover:text-destructive">Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Raw Materials Tab --- */}
        <TabsContent value="rawMaterials">
           <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Manage Raw Materials</CardTitle>
                    <CardDescription>View stock levels and add new materials.</CardDescription>
                  </div>
                  {/* Add Raw Material Button + Dialog (Stubbed) */}
                   <Dialog open={isAddMaterialDialogOpen} onOpenChange={setIsAddMaterialDialogOpen}>
                     <DialogTrigger asChild>
                       <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Material</Button>
                     </DialogTrigger>
                     <DialogContent>
                         <DialogHeader><DialogTitle>Add New Raw Material</DialogTitle></DialogHeader>
                         <p>Form for adding a new material will go here.</p>
                          <DialogFooter>
                            <Button variant="ghost" onClick={()=>setIsAddMaterialDialogOpen(false)}>Cancel</Button>
                            <Button onClick={()=> { /* Add save logic here */ setIsAddMaterialDialogOpen(false); }}>Save Material</Button>
                         </DialogFooter>
                     </DialogContent>
                   </Dialog>
                </div>
            </CardHeader>
            <CardContent>
              {isLoadingMaterials ? <p>Loading materials...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Reorder At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rawMaterials ?? []).map((item) => {
                      const status = getStatus(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className={status.variant === 'outline' ? 'border-amber-500 text-amber-500' : ''}>
                              {status.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                          <TableCell className="text-muted-foreground">{item.reorderPoint}</TableCell>
                           <TableCell className="text-right">
                             <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4"/></Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                           </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
