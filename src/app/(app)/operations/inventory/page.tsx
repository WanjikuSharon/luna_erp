// src/app/(app)/operations/inventory/page.tsx
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
import { FilePlus2, CheckCircle, XCircle, Clock, Truck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { RawMaterial } from '@/lib/types';
import { users } from '@/lib/data'; // Still using mock users for names
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { sendRequestEmail } from '@/ai/flows/send-request-email';

// Define a type for the updated Material Request structure including vendor
export type MaterialRequestWithVendor = {
  id: string; // Added by useCollection
  materialId: string;
  quantity: number;
  requestedBy: string; // Should be Firebase UID
  status: 'pending' | 'approved' | 'delivered' | 'rejected';
  vendorId: string; // NEW: Added vendor ID
  createdAt: any; // Use 'any' for Firestore Timestamp compatibility for now
  updatedAt: any;
};

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-500' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'bg-sky-500' },
  delivered: { label: 'Delivered', icon: Truck, color: 'bg-green-500' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'bg-red-500' },
};

// NEW: Add vendorId to the form schema
const requestFormSchema = z.object({
  materialId: z.string().min(1, 'Please select a material.'),
  quantity: z.coerce.number().min(0.1, 'Quantity must be positive.'),
  vendorId: z.string().min(1, 'Please select a vendor.'), // NEW
});
type RequestFormValues = z.infer<typeof requestFormSchema>;

// NEW: Placeholder for vendor data (replace with Firestore fetch later)
const vendors = [
    { id: 'vendor-1', name: 'Kenya Craft Supplies' },
    { id: 'vendor-2', name: 'East Africa Metals Ltd.' },
    { id: 'vendor-3', name: 'Nairobi Textiles Co.' },
];

// Updated RequestRow component
function RequestRow({ request, materialNameMap, vendorNameMap }: {
  request: MaterialRequestWithVendor,
  materialNameMap: Record<string, string>,
  vendorNameMap: Record<string, string> // NEW: Pass vendor names
}) {
  const requester = users.find(u => u.id === request.requestedBy); // Still mock users
  const status = statusConfig[request.status];

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{materialNameMap[request.materialId] || 'Unknown Material'}</div>
        <div className="text-xs text-muted-foreground">{request.materialId}</div>
      </TableCell>
      <TableCell className="text-center">{request.quantity}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="font-normal">
          <status.icon className="mr-2 h-3.5 w-3.5" />
          {status.label}
        </Badge>
      </TableCell>
      {/* NEW: Vendor column */}
      <TableCell>{vendorNameMap[request.vendorId] || 'Unknown Vendor'}</TableCell>
      <TableCell>{requester?.name || request.requestedBy}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {/* Handle potential Firestore Timestamp object */}
        {request.createdAt?.toDate ? formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true }) : 'Processing...'}
      </TableCell>
      {/* <TableCell className="text-right">
        <Button variant="outline" size="sm">View Details</Button>
      </TableCell> */}
    </TableRow>
  );
}

// Update Skeleton
function RequestTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Material</TableHead>
          <TableHead className="text-center">Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Vendor</TableHead> {/* NEW */}
          <TableHead>Requester</TableHead>
          <TableHead className="text-right">Created</TableHead>
          {/* <TableHead className="w-[120px]"></TableHead> */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell> {/* NEW */}
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
            {/* <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell> */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Main page component
export default function InventoryRequestPage() {
  const allStatuses = Object.keys(statusConfig) as (keyof typeof statusConfig)[];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser(); // Still needed for 'requestedBy'

  // Fetch live data
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, 'raw_materials'), [firestore]);
  const requestsRef = useMemoFirebase(() => collection(firestore, 'material_requests'), [firestore]); // Assuming we keep this collection name

  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: materialRequests, isLoading: isLoadingRequests } = useCollection<MaterialRequestWithVendor>(requestsRef); // Use updated type

  // Form setup
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: { materialId: '', quantity: 0, vendorId: '' }, // NEW: Added vendorId default
  });

  // Submit handler
  async function onSubmit(data: RequestFormValues) {
    // ---- TEMPORARY BYPASS FOR AUTH ----
    const fakeUserId = 'user-2'; // Use Mercy's mock ID if user is null
    const currentUserId = user ? user.uid : fakeUserId;
    // ---- REMOVE THIS WHEN AUTH IS ENABLED ----

    // if (!user) { // Keep this check for production
    //    toast({ variant: "destructive", title: "Not logged in!", description: "Please log in." });
    //   return;
    // }

    // Find user and material names for the email
    const requester = users.find(u => u.id === currentUserId); // Still using mock users array for names
    const material = rawMaterials?.find(m => m.id === data.materialId);
    const vendor = vendors.find(v => v.id === data.vendorId);

    if (!requester || !material || !vendor) {
        toast({ variant: "destructive", title: "Data Error", description: "Could not find user, material, or vendor details." });
        return;
    }

    let newRequestId: string | null = null; // Variable to store the new request ID

    try {
      // Save to Firestore
      const docRef = await addDoc(collection(firestore, 'material_requests'), {
        materialId: data.materialId,
        quantity: data.quantity,
        vendorId: data.vendorId, // NEW: Save vendorId
        requestedBy: currentUserId, // Use real UID or fake ID
        status: 'pending' as const, // Ensure type safety
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      newRequestId = docRef.id; // Get the ID of the newly created document

      toast({ title: "Request Submitted", description: "Inventory request logged successfully." });
      form.reset();
      setIsDialogOpen(false);

      // --- NEW: Trigger the email flow ---
      console.log("Calling sendRequestEmail flow for ID:", newRequestId);
      // Construct the URL (adjust base URL if needed)
      const requestUrl = `${window.location.origin}/operations/inventory?requestId=${newRequestId}`;

      sendRequestEmail({
          requestId: newRequestId,
          materialName: material.name,
          quantity: data.quantity,
          requesterName: requester.name,
          vendorName: vendor.name,
          requestUrl: requestUrl, // Optional: Link back to the request
      }).then((result: { success: boolean }) => {
          if (result.success) {
              console.log("Admin notification email process initiated successfully.");
          } else {
              console.error("Admin notification email process failed.");
              // Optional: Show a less critical toast here?
          }
      }).catch((flowError: Error) => {
          console.error("Error invoking sendRequestEmail flow:", flowError);
          // Optional: Show a toast about notification failure
      });
      // Note: We don't await the flow call here - it runs in the background.

    } catch (error) {
      console.error("Error submitting request:", error);
      toast({ variant: "destructive", title: "Submission Failed", description: "Could not save your request." });
      // Don't try to send email if saving failed
    }
  }

  const isLoading = isLoadingRequests || isLoadingMaterials;

  // Create lookup maps
  const materialNameMap = useMemo(() => {
    return (rawMaterials ?? []).reduce((acc, material) => {
      acc[material.id] = material.name;
      return acc;
    }, {} as Record<string, string>);
  }, [rawMaterials]);

  // NEW: Vendor name map
  const vendorNameMap = useMemo(() => {
    return vendors.reduce((acc, vendor) => {
        acc[vendor.id] = vendor.name;
        return acc;
    }, {} as Record<string, string>)
  }, []); // vendors is static for now


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          {/* Updated Title */}
          <h1 className="text-3xl font-bold font-headline tracking-tight">Inventory Requests</h1>
          <p className="text-muted-foreground">
            Create new requests for raw materials from vendors.
          </p>
        </div>

        {/* Dialog Trigger */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
             {/* Updated Button Text */}
            <Button>
              <FilePlus2 className="mr-2" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              {/* Updated Title */}
              <DialogTitle>Create Inventory Request List</DialogTitle>
              <DialogDescription>
                Select materials, quantity, and vendor.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="materialId"
                  render={({ field }) => ( /* Material Select - Unchanged */
                    <FormItem>
                      <FormLabel>Raw Material</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a material..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {isLoadingMaterials ? (
                             <SelectItem value="loading" disabled>Loading...</SelectItem>
                           ) : (
                             (rawMaterials ?? []).map((material) => (
                               <SelectItem key={material.id} value={material.id}>
                                 {material.name} ({material.quantity} {material.unit} in stock)
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
                  name="quantity"
                  render={({ field }) => ( /* Quantity Input - Unchanged */
                    <FormItem>
                      <FormLabel>Quantity Needed</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 25.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* NEW: Vendor Select Field */}
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a vendor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                  {/* Updated Button Text */}
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send List
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table Display Card */}
      <Card>
        <CardHeader>
          {/* Updated Title */}
          <CardTitle>Sent Inventory Lists</CardTitle>
          <CardDescription>
            History of all material requests sent to vendors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              {allStatuses.map(status => (
                <TabsTrigger key={status} value={status}>{statusConfig[status].label}</TabsTrigger>
              ))}
            </TabsList>

            {/* Content Tabs */}
            <TabsContent value="all">
              {isLoadingRequests ? <RequestTableSkeleton /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vendor</TableHead> {/* NEW */}
                      <TableHead>Requester</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                      {/* <TableHead className="w-[120px]"></TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(materialRequests ?? []).map(req => (
                      <RequestRow key={req.id} request={req} materialNameMap={materialNameMap} vendorNameMap={vendorNameMap} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {allStatuses.map(status => (
              <TabsContent key={status} value={status}>
                {isLoadingRequests ? <RequestTableSkeleton /> : (
                  <Table>
                    <TableHeader>
                      {/* (Same header row as above) */}
                       <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Requester</TableHead>
                          <TableHead className="text-right">Created</TableHead>
                          {/* <TableHead className="w-[120px]"></TableHead> */}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(materialRequests ?? []).filter(r => r.status === status).map(req => (
                        <RequestRow key={req.id} request={req} materialNameMap={materialNameMap} vendorNameMap={vendorNameMap}/>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
