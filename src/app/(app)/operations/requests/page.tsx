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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, Truck, FileCheck, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { MaterialRequest, RawMaterial, Vendor } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { COLLECTIONS } from '@/services/inventory_service';
import { VerifyDeliveryDialog } from '@/components/operations/VerifyDeliveryDialog';

// Status config remains the same
const statusConfig = {
  pending: { label: 'Pending', icon: Clock },
  approved: { label: 'Approved', icon: CheckCircle },
  awaiting_delivery: { label: 'Awaiting Delivery', icon: Truck },
  delivered: { label: 'Delivered', icon: FileCheck },
  rejected: { label: 'Rejected', icon: XCircle },
};

// UPDATED: RequestRow to show all new info
function RequestRow({ request, materialNameMap, vendorNameMap, onVerifyClick }: {
  request: MaterialRequest,
  materialNameMap: Record<string, string>,
  vendorNameMap: Record<string, string>,
  onVerifyClick: (request: MaterialRequest) => void;
}) {
  const status = statusConfig[request.status];

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{materialNameMap[request.materialId] || 'Unknown Material'}</div>
      </TableCell>
      <TableCell className="text-center">{request.quantity} {request.unit}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="font-normal">
          <status.icon className="mr-2 h-3.5 w-3.5" />
          {status.label}
        </Badge>
        {request.supplierContacted && request.status === 'approved' && (
          <div className="text-xs text-muted-foreground mt-1">Supplier contacted</div>
        )}
      </TableCell>
      <TableCell>{vendorNameMap[request.vendorId] || 'Unknown Supplier'}</TableCell>
      <TableCell className="text-sm">{request.requestedByName || request.requestedBy || 'Unknown'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {request.createdAt?.toDate ? formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true }) : 'Processing...'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          {/* Operations can only verify delivery when status is awaiting_delivery */}
          {request.status === 'awaiting_delivery' && (
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
          {request.status === 'pending' && (
            <span className="text-sm text-muted-foreground">Pending admin approval</span>
          )}
          {request.status === 'approved' && !request.supplierContacted && (
            <span className="text-sm text-muted-foreground">Approved - awaiting supplier contact</span>
          )}
          {request.status === 'approved' && request.supplierContacted && (
            <span className="text-sm text-muted-foreground">Supplier contacted - awaiting scheduling</span>
          )}
          {request.status === 'rejected' && (
            <span className="text-sm text-muted-foreground">Rejected by admin</span>
          )}
        </div>
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
          <TableHead>Raw Material</TableHead>
          <TableHead className="text-center">Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Supplier</TableHead>
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

  const [verifyingRequest, setVerifyingRequest] = useState<MaterialRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  // --- Data Fetching ---
  const requestsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.REQUESTS), [firestore]);
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const vendorsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.VENDORS), [firestore]);
  
  const { data: materialRequests, isLoading: isLoadingRequests } = useCollection<MaterialRequest>(requestsRef);
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: vendors, isLoading: isLoadingVendors } = useCollection<Vendor>(vendorsRef);

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

  // Filtered requests based on search and vendor
  const filteredRequests = useMemo(() => {
    if (!materialRequests) return [];
    
    let filtered = materialRequests;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(request => {
        const materialName = materialNameMap[request.materialId] || '';
        const vendorName = vendorNameMap[request.vendorId] || '';
        const requesterName = request.requestedByName || request.requestedBy || '';
        
        return (
          materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          requesterName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    
    // Apply vendor filter
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(request => request.vendorId === vendorFilter);
    }
    
    return filtered;
  }, [materialRequests, searchTerm, vendorFilter, materialNameMap, vendorNameMap]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Raw Material Requests List</h1>
        <p className="text-muted-foreground">
          Track all raw material requests. Admins handle approvals and supplier contact. Operations verify deliveries.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>
            Browse and filter all raw material requests.
          </CardDescription>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by raw material, supplier, or requester..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {(vendors ?? []).map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                      <TableHead>Raw Material</TableHead>
                      <TableHead className="text-center">Quantity & Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {searchTerm || vendorFilter !== 'all'
                            ? 'No requests match your filters'
                            : 'No raw material requests found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map(req => (
                        <RequestRow
                          key={req.id}
                          request={req}
                          materialNameMap={materialNameMap}
                          vendorNameMap={vendorNameMap}
                          onVerifyClick={setVerifyingRequest}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {allStatuses.map(status => {
              const statusRequests = filteredRequests.filter(r => r.status === status);
              return (
                <TabsContent key={status} value={status}>
                {isLoading ? <RequestTableSkeleton /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raw Material</TableHead>
                        <TableHead className="text-center">Quantity & Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            {searchTerm || vendorFilter !== 'all'
                              ? `No ${statusConfig[status].label.toLowerCase()} requests match your filters`
                              : `No ${statusConfig[status].label.toLowerCase()} requests`}
                          </TableCell>
                        </TableRow>
                      ) : (
                        statusRequests.map(req => (
                          <RequestRow
                            key={req.id}
                            request={req}
                            materialNameMap={materialNameMap}
                            vendorNameMap={vendorNameMap}
                            onVerifyClick={setVerifyingRequest}
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* NEW: Add the dialog component here */}
      <VerifyDeliveryDialog
        request={verifyingRequest}
        onOpenChange={(open) => {
          if (!open) setVerifyingRequest(null);
        }}
      />
    </div>
  );
}
