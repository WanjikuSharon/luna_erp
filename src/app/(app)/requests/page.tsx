'use client';

// NEW: Import React state and form tools
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import Link from 'next/link';
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

// NEW: Import Dialog and Form components
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

// NEW: Import live data hooks and types
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { MaterialRequest, RawMaterial } from '@/lib/types';
import { users } from '@/lib/data'; // We still use mock users for names
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-500' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'bg-sky-500' },
  delivered: { label: 'Delivered', icon: Truck, color: 'bg-green-500' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'bg-red-500' },
};

// NEW: Define the form's data structure and validation rules
const requestFormSchema = z.object({
  materialId: z.string().min(1, 'Please select a material.'),
  quantity: z.coerce.number().min(0.1, 'Quantity must be positive.'),
});
type RequestFormValues = z.infer<typeof requestFormSchema>;

// This component logic is unchanged, but now reads live data
function RequestRow({ request, materialNameMap }: { request: MaterialRequest, materialNameMap: Record<string, string> }) {
  const requester = users.find(u => u.id === request.requestedBy); // Still using mock users for now
  const status = statusConfig[request.status];

  return (
    <TableRow>
      <TableCell>
        {/* Display material name and ID */}
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
      <TableCell>{requester?.name || request.requestedBy}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {request.createdAt ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true }) : 'just now'}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm">View Details</Button>
      </TableCell>
    </TableRow>
  );
}

// NEW: A skeleton loader for our table
function RequestTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Material</TableHead>
          <TableHead className="text-center">Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead className="text-right">Created</TableHead>
          <TableHead className="w-[120px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
            <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function RequestsPage() {
    const allStatuses = Object.keys(statusConfig) as (keyof typeof statusConfig)[];
    
    // NEW: State to control the dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    // NEW: Get Firebase services
    const firestore = useFirestore();
    const { user } = useUser(); // We'll need this for 'requestedBy'

    // NEW: Define and memoize Firestore collection references
    const rawMaterialsRef = useMemoFirebase(() => collection(firestore, 'raw_materials'), [firestore]);
    const requestsRef = useMemoFirebase(() => collection(firestore, 'material_requests'), [firestore]);

    // NEW: Fetch live data from Firestore
    const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
    const { data: materialRequests, isLoading: isLoadingRequests } = useCollection<MaterialRequest>(requestsRef);

    // NEW: Initialize the form
    const form = useForm<RequestFormValues>({
        resolver: zodResolver(requestFormSchema),
        defaultValues: {
            materialId: '',
            quantity: 0,
        },
    });
    
    // NEW: Handle form submission
    async function onSubmit(data: RequestFormValues) {
        if (!user) {
            toast({
                variant: "destructive",
                title: "You are not logged in!",
                description: "Please log in to make a request.",
            });
            return;
        }

        try {
            // Create a new document in the 'material_requests' collection
            await addDoc(collection(firestore, 'material_requests'), {
                materialId: data.materialId,
                quantity: data.quantity,
                requestedBy: user.uid, // This uses the REAL logged-in user's ID
                status: 'pending',
                createdAt: serverTimestamp(), // Use server's timestamp
                updatedAt: serverTimestamp(),
            });

            toast({
                title: "Request Submitted",
                description: "Your material request has been logged.",
            });
            
            form.reset(); // Clear the form
            setIsDialogOpen(false); // Close the dialog

        } catch (error) {
            console.error("Error submitting request:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "Could not save your request. Please try again.",
            });
        }
    }

    // NEW: Combine loading states
    const isLoading = isLoadingRequests || isLoadingMaterials;

    // NEW: Create a quick lookup map for material names
    const materialNameMap = useMemo(() => {
        return (rawMaterials ?? []).reduce((acc, material) => {
            acc[material.id] = material.name;
            return acc;
        }, {} as Record<string, string>);
    }, [rawMaterials]);
  
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Material Requests</h1>
                    <p className="text-muted-foreground">
                        Track and manage all raw material requests for production.
                    </p>
                </div>
                
                {/* NEW: This button now triggers the Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <FilePlus2 className="mr-2" />
                            New Request
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>New Material Request</DialogTitle>
                            <DialogDescription>
                                Select a material and the quantity you need for production.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <FormField
                                    control={form.control}
                                    name="materialId"
                                    render={({ field }) => (
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
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantity Needed</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.1" placeholder="e.g., 25.5" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="ghost">Cancel</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Submit Request
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Request History</CardTitle>
                    <CardDescription>
                       Browse and filter all material requests.
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

                        {/* NEW: Handle the main "all" tab */}
                        <TabsContent value="all">
                            {isLoadingRequests ? <RequestTableSkeleton /> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Material</TableHead>
                                            <TableHead className="text-center">Quantity</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Requester</TableHead>
                                            <TableHead className="text-right">Created</TableHead>
                                            <TableHead className="w-[120px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* NEW: Map over (materialRequests ?? []) */}
                                        {(materialRequests ?? []).map(req => (
                                            <RequestRow 
                                                key={req.id} 
                                                request={req}
                                                materialNameMap={materialNameMap}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </TabsContent>

                        {/* NEW: Handle the filtered tabs */}
                        {allStatuses.map(status => (
                            <TabsContent key={status} value={status}>
                                {isLoadingRequests ? <RequestTableSkeleton /> : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Material</TableHead>
                                                <TableHead className="text-center">Quantity</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Requester</TableHead>
                                                <TableHead className="text-right">Created</TableHead>
                                                <TableHead className="w-[120px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {/* NEW: Filter (materialRequests ?? []) */}
                                            {(materialRequests ?? []).filter(r => r.status === status).map(req => (
                                                <RequestRow 
                                                    key={req.id} 
                                                    request={req}
                                                    materialNameMap={materialNameMap}
                                                />
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
