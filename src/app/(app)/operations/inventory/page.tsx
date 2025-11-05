// src/app/(app)/operations/inventory/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { PlusCircle, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import type { RawMaterial, Vendor } from '@/lib/types'; 
import { COLLECTIONS } from '@/services/inventory_service';
import { sendRequestEmail } from '@/ai/flows/send-request-email';
import { users as mockUsers } from '@/lib/data'; 

// --- Schemas ---
const requestFormSchema = z.object({
  materialId: z.string().min(1, 'Please select a material.'),
  quantity: z.coerce.number().min(0.1, 'Quantity must be positive.'),
  unit: z.string().min(1, 'Please select units.'),
  vendorId: z.string().min(1, 'Please select a vendor.'),
});
type RequestFormValues = z.infer<typeof requestFormSchema>;

const vendorFormSchema = z.object({
  name: z.string().min(2, 'Vendor name is required.'),
  email: z.string().email('Please enter a valid email.'),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type VendorFormValues = z.infer<typeof vendorFormSchema>;

const rawMaterialFormSchema = z.object({
    sku: z.string().min(3, 'SKU is required (e.g., LUN-WD-ACA-01)'),
    name: z.string().min(2, 'Material name is required.'),
    quantity: z.coerce.number().min(0, 'Initial quantity must be 0 or more.'),
    unit: z.enum(['kg', 'liters', 'units']), 
    reorderPoint: z.coerce.number().min(0, 'Reorder point must be 0 or more.'),
});
type RawMaterialFormValues = z.infer<typeof rawMaterialFormSchema>;


export default function VendorsAndMaterialsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = useState(false);
  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<RawMaterial | null>(null);

  // --- Data Fetching ---
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const vendorsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.VENDORS), [firestore]); 
  
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: vendors, isLoading: isLoadingVendors } = useCollection<Vendor>(vendorsRef); 

  const filteredVendors = useMemo(() => {
    if (!vendors) return [];
    if (!vendorSearchTerm) return vendors;
    return vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(vendorSearchTerm.toLowerCase())
    );
  }, [vendors, vendorSearchTerm]);

  // --- Forms ---
  const requestForm = useForm<RequestFormValues>({ 
    defaultValues: { materialId: '', vendorId: '', quantity: 0, unit: 'kg' }
  });
  const vendorForm = useForm<VendorFormValues>({ 
    defaultValues: { name: '', email: '', phone: '', address: '' }
  });
  const materialForm = useForm<RawMaterialFormValues>({ 
    defaultValues: { sku: '', name: '', quantity: 0, unit: 'kg', reorderPoint: 0 }
  });

  // --- UPDATED: Centralized Activity Logger ---
  const { user: authUser } = useUser();
  const logOperationActivity = async (action: string) => {
    // Find the user's name from the mock data list (since we bypassed login)
    // In a real app, you'd get this from the 'users' collection using user.uid
    const fakeUserId = 'user-2'; // Mercy (Operations)
    const currentUserId = authUser ? authUser.uid : fakeUserId;
    const currentUser = mockUsers.find(u => u.id === currentUserId || u.id === fakeUserId);

    const userName = currentUser?.name || 'System';
    const userAvatar = currentUser?.avatarUrl || '';

    try {
      await addDoc(collection(firestore, 'operations_activities'), {
        action: action,
        user: { name: userName, avatarUrl: userAvatar },
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
      // Don't block the main action, just log the error
    }
  };

  // --- UPDATED: onSubmit Functions (now with logging) ---
  async function onSubmitRequest(data: RequestFormValues) {
    const fakeUserId = 'user-2';
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

      // UPDATED: Log this action
      await logOperationActivity(`created a new delivery request for ${data.quantity} ${data.unit} of ${material?.name || 'material'}.`);

      toast({ title: "Delivery Request Sent", description: "Your request has been logged." });
      requestForm.reset();
      setIsRequestDialogOpen(false);
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

  async function onSubmitAddVendor(data: VendorFormValues) {
    try {
      await addDoc(collection(firestore, COLLECTIONS.VENDORS), {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        address: data.address || '',
      });

      // UPDATED: Log this action
      await logOperationActivity(`added new vendor: ${data.name}`);

      toast({ title: "Vendor Added", description: `${data.name} has been added to the vendor list.` });
      vendorForm.reset();
      setIsAddVendorDialogOpen(false);
    } catch (error) {
      console.error("Error adding vendor:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not add vendor. Please try again." });
    }
  }

  async function onSubmitAddMaterial(data: RawMaterialFormValues) {
    try {
        await addDoc(collection(firestore, COLLECTIONS.RAW_MATERIALS), {
            sku: data.sku,
            name: data.name,
            quantity: data.quantity,
            unit: data.unit,
            reorderPoint: data.reorderPoint,
        });

        // UPDATED: Log this action
        await logOperationActivity(`added new material: ${data.name} (SKU: ${data.sku})`);
        
        toast({ title: "Material Added", description: `${data.name} has been added to inventory.` });
        materialForm.reset();
        setIsAddMaterialDialogOpen(false);
    } catch (error) {
         console.error("Error adding material:", error);
         toast({ variant: "destructive", title: "Save Failed", description: "Could not add material. Please try again." });
    }
  }
  
  // Helper function
  function getStatus(item: RawMaterial) {
    if (item.quantity === 0) return { text: 'Out of Stock', variant: 'destructive' as const };
    if (item.quantity < item.reorderPoint) return { text: 'Low Stock', variant: 'outline' as const };
    return { text: 'In Stock', variant: 'secondary' as const };
  }

  // --- UPDATED: Handle Delete Vendor (with logging) ---
  async function handleDeleteVendor() {
    if (!deletingVendor) return;
    try {
      const docRef = doc(firestore, COLLECTIONS.VENDORS, deletingVendor.id);
      await deleteDoc(docRef);
      
      // UPDATED: Log this action
      await logOperationActivity(`deleted vendor: ${deletingVendor.name}`);

      toast({ title: "Vendor Deleted", description: `${deletingVendor.name} has been deleted.` });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete vendor." });
    } finally {
      setDeletingVendor(null);
    }
  }

  // --- UPDATED: Handle Delete Material (with logging) ---
  async function handleDeleteMaterial() {
    if (!deletingMaterial) return;
    
    try {
      const docRef = doc(firestore, COLLECTIONS.RAW_MATERIALS, deletingMaterial.id);
      await deleteDoc(docRef);

      // UPDATED: Log this action
      await logOperationActivity(`deleted material: ${deletingMaterial.name}`);
      
      toast({ title: "Material Deleted", description: `${deletingMaterial.name} has been deleted.` });
    } catch (error) {
      console.error("Error deleting material:", error);
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete material." });
    } finally {
      setDeletingMaterial(null); // Close the dialog
    }
  }

  // --- Main Render ---
  return (
    <div className="flex flex-col gap-6">
      {/* Page Header and "New Request" Dialog (Unchanged) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Vendors & Materials</h1>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          {/* ... "Create New Delivery Request" button and dialog content (Omitted for brevity) ... */}
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Delivery Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>New Delivery Request</DialogTitle></DialogHeader>
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(onSubmitRequest)} className="space-y-4 py-4">
                <FormField control={requestForm.control} name="materialId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raw Material</FormLabel>
                      <Select onValueChange={(value) => {
                          field.onChange(value);
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
                <div className="grid grid-cols-3 gap-4">
                   <FormField control={requestForm.control} name="quantity" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Quantity</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="e.g., 500" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField control={requestForm.control} name="unit" render={({ field }) => (
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
                 <FormField control={requestForm.control} name="vendorId" render={({ field }) => (
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

        {/* --- Vendors Tab (Unchanged) --- */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                  <div className="space-y-1">
                      <CardTitle>Manage Vendors</CardTitle>
                      <CardDescription>Add, view, or edit supplier information.</CardDescription>
                  </div>
                   <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
                     {/* ... "Add Vendor" button and dialog content (Omitted for brevity) ... */}
                     <DialogTrigger asChild>
                       <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Vendor</Button>
                     </DialogTrigger>
                     <DialogContent>
                         <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
                         <Form {...vendorForm}>
                            <form onSubmit={vendorForm.handleSubmit(onSubmitAddVendor)} className="space-y-4 py-4">
                              <FormField control={vendorForm.control} name="name" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Vendor Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Tech Supplies Inc." {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField control={vendorForm.control} name="email" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Contact Email</FormLabel>
                                    <FormControl><Input placeholder="e.g., contact@techsupplies.com" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField control={vendorForm.control} name="phone" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phone Number (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., +254 700 000 000" {...field} value={field.value || ''} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField control={vendorForm.control} name="address" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Address (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., 123 Biashara St, Nairobi" {...field} value={field.value || ''} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="button" variant="ghost" onClick={()=>setIsAddVendorDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={vendorForm.formState.isSubmitting}>
                                  {vendorForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Save Vendor
                                </Button>
                              </DialogFooter>
                            </form>
                         </Form>
                     </DialogContent>
                   </Dialog>
              </div>
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
              {isLoadingVendors ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
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
                        <TableRow><TableCell colSpan={3} className="text-center">No vendors found. Add one to get started!</TableCell></TableRow>
                    )}
                    {filteredVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.email}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="px-2" onClick={() => setEditingVendor(vendor)}>
                            View/Edit
                          </Button>
                          <Button variant="link" className="px-2 text-destructive hover:text-destructive" onClick={() => setDeletingVendor(vendor)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Raw Materials Tab (UPDATED) --- */}
        <TabsContent value="rawMaterials">
           <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Manage Raw Materials</CardTitle>
                    <CardDescription>View stock levels and add new materials.</CardDescription>
                  </div>
                   {/* "Add Material" Dialog (Unchanged) */}
                   <Dialog open={isAddMaterialDialogOpen} onOpenChange={setIsAddMaterialDialogOpen}>
                     {/* ... "Add Material" button and dialog content (Omitted for brevity) ... */}
                     <DialogTrigger asChild>
                       <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Material</Button>
                     </DialogTrigger>
                     <DialogContent>
                         <DialogHeader><DialogTitle>Add New Raw Material</DialogTitle></DialogHeader>
                         <Form {...materialForm}>
                            <form onSubmit={materialForm.handleSubmit(onSubmitAddMaterial)} className="space-y-4 py-4">
                               <FormField control={materialForm.control} name="sku" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>SKU</FormLabel>
                                    <FormControl><Input placeholder="e.g., LUN-WD-ACA-01" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField control={materialForm.control} name="name" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Material Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Acacia Wood" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField control={materialForm.control} name="quantity" render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Initial Quantity</FormLabel>
                                      <FormControl><Input type="number" {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField control={materialForm.control} name="unit" render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Unit</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                          <SelectItem value="kg">kg</SelectItem>
                                          <SelectItem value="liters">liters</SelectItem>
                                          <SelectItem value="units">units</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField control={materialForm.control} name="reorderPoint" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Reorder Point</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="button" variant="ghost" onClick={()=>setIsAddMaterialDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={materialForm.formState.isSubmitting}>
                                  {materialForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Save Material
                                </Button>
                              </DialogFooter>
                            </form>
                         </Form>
                     </DialogContent>
                   </Dialog>
                </div>
            </CardHeader>
            <CardContent>
              {isLoadingMaterials ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
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
                           {/* UPDATED: Added onClick handlers */}
                           <TableCell className="text-right">
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMaterial(item)}>
                                <Edit className="h-4 w-4"/>
                             </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingMaterial(item)}>
                                <Trash2 className="h-4 w-4"/>
                             </Button>
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

      {/* --- UPDATED: Pass logger function to Edit Dialogs --- */}
      <EditVendorDialog
        vendor={editingVendor}
        onOpenChange={() => setEditingVendor(null)}
        onVendorUpdated={(name) => logOperationActivity(`updated vendor: ${name}`)} 
      />
      <DeleteVendorAlert
        vendor={deletingVendor}
        onOpenChange={() => setDeletingVendor(null)}
        onDelete={handleDeleteVendor}
      />
      
      <EditMaterialDialog
        material={editingMaterial}
        onOpenChange={() => setEditingMaterial(null)}
        onMaterialUpdated={(name) => logOperationActivity(`updated material: ${name}`)} 
      />
      <DeleteMaterialAlert
        material={deletingMaterial}
        onOpenChange={() => setDeletingMaterial(null)}
        onDelete={handleDeleteMaterial}
      />
    </div>
  );
}

// --- UPDATED: EditVendorDialog (now accepts onVendorUpdated prop) ---
function EditVendorDialog({
  vendor,
  onOpenChange,
  onVendorUpdated,
}: {
  vendor: Vendor | null;
  onOpenChange: () => void;
  onVendorUpdated: (name: string) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const editVendorForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: { name: '', email: '', phone: '', address: '' }
  });

  useEffect(() => {
    if (vendor) {
      editVendorForm.reset(vendor);
    }
  }, [vendor, editVendorForm]);

  async function onSubmitEditVendor(data: VendorFormValues) {
    if (!vendor) return;
    try {
      const docRef = doc(firestore, COLLECTIONS.VENDORS, vendor.id);
      await updateDoc(docRef, { ...data }); 
      
      // UPDATED: Call the logger
      await onVendorUpdated(data.name);

      toast({ title: "Vendor Updated", description: `${data.name} has been updated.` });
      onOpenChange(); 
    } catch (error) {
      console.error("Error updating vendor:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update vendor." });
    }
  }

  return (
    <Dialog open={!!vendor} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
          <DialogDescription>
            Make changes to the vendor's details and click save.
          </DialogDescription>
        </DialogHeader>
        <Form {...editVendorForm}>
          <form onSubmit={editVendorForm.handleSubmit(onSubmitEditVendor)} className="space-y-4 py-4">
            {/* ... form fields for vendor ... */}
            <FormField control={editVendorForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={editVendorForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={editVendorForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={editVendorForm.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onOpenChange}>Cancel</Button>
              <Button type="submit" disabled={editVendorForm.formState.isSubmitting}>
                {editVendorForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- DeleteVendorAlert Component (Unchanged) ---
// (Omitted for brevity)
function DeleteVendorAlert({
  vendor,
  onOpenChange,
  onDelete,
}: {
  vendor: Vendor | null;
  onOpenChange: () => void;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  }
  return (
    <AlertDialog open={!!vendor} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the vendor
            <strong className="mx-1">{vendor?.name}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, delete vendor
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- UPDATED: New EditMaterialDialog Component ---
function EditMaterialDialog({
  material,
  onOpenChange,
}: {
  material: RawMaterial | null;
  onOpenChange: () => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();

  // Form for editing the material
  const editMaterialForm = useForm<RawMaterialFormValues>({
    resolver: zodResolver(rawMaterialFormSchema),
    defaultValues: { sku: '', name: '', quantity: 0, unit: 'kg', reorderPoint: 0 }
  });

  // Pre-fill the form when the `material` prop changes
  useEffect(() => {
    if (material) {
      editMaterialForm.reset(material);
    }
  }, [material, editMaterialForm]);

  async function onSubmitEditMaterial(data: RawMaterialFormValues) {
    if (!material) return;

    try {
      const docRef = doc(firestore, COLLECTIONS.RAW_MATERIALS, material.id);
      await updateDoc(docRef, {
        sku: data.sku,
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        reorderPoint: data.reorderPoint,
      });
      toast({ title: "Material Updated", description: `${data.name} has been updated.` });
      onOpenChange(); // Close the dialog
    } catch (error) {
      console.error("Error updating material:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update material." });
    }
  }

  return (
    <Dialog open={!!material} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Raw Material</DialogTitle>
          <DialogDescription>
            Make changes to the material's details and click save.
          </DialogDescription>
        </DialogHeader>
        <Form {...editMaterialForm}>
          <form onSubmit={editMaterialForm.handleSubmit(onSubmitEditMaterial)} className="space-y-4 py-4">
            <FormField
              control={editMaterialForm.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editMaterialForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={editMaterialForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Quantity</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMaterialForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="liters">liters</SelectItem>
                        <SelectItem value="units">units</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={editMaterialForm.control}
              name="reorderPoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Point</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onOpenChange}>Cancel</Button>
              <Button type="submit" disabled={editMaterialForm.formState.isSubmitting}>
                {editMaterialForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- UPDATED: New DeleteMaterialAlert Component ---
function DeleteMaterialAlert({
  material,
  onOpenChange,
  onDelete,
}: {
  material: RawMaterial | null;
  onOpenChange: () => void;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  }

  return (
    <AlertDialog open={!!material} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the material
            <strong className="mx-1">{material?.name}</strong>
            from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, delete material
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}