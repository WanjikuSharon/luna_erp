// src/app/(app)/operations/requests/page.tsx
'use client';

import { useMemo, useState } from 'react';
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
import { CheckCircle, XCircle, Clock, Truck, FileCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { MaterialRequest, RawMaterial, Vendor } from '@/lib/types';
import { users as mockUsers } from '@/lib/data'; // For user names
import { Skeleton } from '@/components/ui/skeleton';
import { COLLECTIONS } from '@/services/inventory_service';
import { VerifyDeliveryDialog } from '@/components/operations/VerifyDeliveryDialog';

// Status config remains the same
const statusConfig = {
  pending: { label: 'Pending', icon: Clock },
  approved: { label: 'Approved', icon: CheckCircle },
  delivered: { label: 'Delivered', icon: Truck },
  rejected: { label: 'Rejected', icon: XCircle },
};

// --- Mock Data (for vendors) ---
const MOCK_VENDORS: Vendor[] = [
    { id: 'v1', name: 'Tech Supplies Inc.', email: 'techsupplies@example.com' },
    { id: 'v2', name: 'Global Materials Co.', email: 'globalmaterials@example.com' },
    { id: 'v3', name: 'Quality Components Ltd.', email: 'qualityparts@example.com' },
];

// UPDATED: RequestRow to show all new info
function RequestRow({ request, materialNameMap, vendorNameMap, onVerifyClick }: {
  request: MaterialRequest,
  materialNameMap: Record<string, string>,
  vendorNameMap: Record<string, string>,
  onVerifyClick: (request: MaterialRequest) => void;
}) {
  const requester = mockUsers.find(u => u.id === request.requestedBy); // Still mock users
  const status = statusConfig[request.status];

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{materialNameMap[request.materialId] || 'Unknown Material'}</div>
      </TableCell>
      <TableCell className="text-center">{request.quantity} {request.unit}</TableCell> {/* Added unit */}
      <TableCell>
        <Badge variant="secondary" className="font-normal">
          <status.icon className="mr-2 h-3.5 w-3.5" />
          {status.label}
        </Badge>
      </TableCell>
      <TableCell>{vendorNameMap[request.vendorId] || 'Unknown Vendor'}</TableCell> {/* Added vendor */}
      <TableCell>{requester?.name || request.requestedBy}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {request.createdAt?.toDate ? formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true }) : 'Processing...'}
      </TableCell>
      {/* UPDATED: This cell now shows different buttons based on status */}
      <TableCell className="text-right">
        {request.status === 'pending' && (
          <Button variant="outline" size="sm" onClick={() => onVerifyClick(request)}>
            Verify Delivery
          </Button>
        )}
        {request.status === 'delivered' && request.deliveryNoteUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={request.deliveryNoteUrl} target="_blank" rel="noopener noreferrer">
              <FileCheck className="mr-2 h-4 w-4" />
              View Note
            </a>
          </Button>
        )}
        {(request.status === 'approved' || request.status === 'rejected') && (
          <Button variant="ghost" size="sm" disabled>
            {request.status}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// UPDATED: Skeleton for new table structure
function RequestTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Material</TableHead>
          <TableHead className="text-center">Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead className="text-right">Created</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
            <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function RequestsPage() {
  const allStatuses = Object.keys(statusConfig) as (keyof typeof statusConfig)[];
  const firestore = useFirestore();

  // NEW: Add state to control the dialog
  const [verifyingRequest, setVerifyingRequest] = useState<MaterialRequest | null>(null);

  // --- Data Fetching ---
  const requestsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.REQUESTS), [firestore]);
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  // TODO: Fetch vendors from Firestore
  // const vendorsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.VENDORS), [firestore]);
  
  const { data: materialRequests, isLoading: isLoadingRequests } = useCollection<MaterialRequest>(requestsRef);
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  // const { data: vendors, isLoading: isLoadingVendors } = useCollection<Vendor>(vendorsRef);
  const vendors = MOCK_VENDORS; // Using mock
  const isLoadingVendors = false; // Using mock

  const isLoading = isLoadingRequests || isLoadingMaterials || isLoadingVendors;

  // --- Create Lookup Maps ---
  const materialNameMap = useMemo(() => {
    return (rawMaterials ?? []).reduce((acc, material) => {
      acc[material.id] = material.name;
      return acc;
    }, {} as Record<string, string>);
  }, [rawMaterials]);

  const vendorNameMap = useMemo(() => {
    return (vendors ?? []).reduce((acc, vendor) => {
        acc[vendor.id] = vendor.name;
        return acc;
    }, {} as Record<string, string>)
  }, [vendors]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Material Requests List</h1>
        <p className="text-muted-foreground">
          Track and manage all raw material requests for production.
        </p>
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

            {/* UPDATED: Table Headers in all tabs */}
            <TabsContent value="all">
              {isLoading ? <RequestTableSkeleton /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-center">Quantity & Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(materialRequests ?? []).map(req => (
                      <RequestRow 
                        key={req.id} 
                        request={req} 
                        materialNameMap={materialNameMap} 
                        vendorNameMap={vendorNameMap}
                        onVerifyClick={setVerifyingRequest}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {allStatuses.map(status => (
              <TabsContent key={status} value={status}>
                {isLoading ? <RequestTableSkeleton /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-center">Quantity & Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
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
