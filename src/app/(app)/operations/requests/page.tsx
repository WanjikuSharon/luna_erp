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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, Truck, FileCheck, Search, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { MaterialRequest, RawMaterial, Vendor } from '@/lib/types';
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

// UPDATED: RequestRow to show all new info
function RequestRow({ request, materialNameMap, vendorNameMap, onVerifyClick, isSelected, onToggleSelect }: {
  request: MaterialRequest,
  materialNameMap: Record<string, string>,
  vendorNameMap: Record<string, string>,
  onVerifyClick: (request: MaterialRequest) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  // Display the user ID directly (or could be enhanced with a users collection lookup)
  const status = statusConfig[request.status];

  return (
    <TableRow>
      {onToggleSelect && (
        <TableCell>
          <Checkbox
            checked={isSelected || false}
            onCheckedChange={() => onToggleSelect(request.id)}
          />
        </TableCell>
      )}
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
      <TableCell className="text-sm">{request.requestedByName || request.requestedBy || 'Unknown'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
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
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [batchStatus, setBatchStatus] = useState<'approved' | 'rejected' | null>(null);

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

  // Batch selection handlers
  const toggleRequestSelection = (id: string) => {
    setSelectedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (requests: MaterialRequest[]) => {
    const requestIds = requests.map(r => r.id);
    if (selectedRequests.size === requestIds.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(requestIds));
    }
  };

  const clearSelection = () => {
    setSelectedRequests(new Set());
  };

  // Batch status update
  const handleBatchStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (selectedRequests.size === 0) return;
    
    setIsBatchUpdating(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const updatePromises = Array.from(selectedRequests).map(async (id) => {
        try {
          const docRef = doc(firestore, COLLECTIONS.REQUESTS, id);
          await updateDoc(docRef, { status });
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to update request ${id}:`, error);
        }
      });

      await Promise.all(updatePromises);

      // Success notification would go here
      console.log(`Batch update complete: ${successCount} updated, ${failCount} failed`);
      
      clearSelection();
    } catch (error) {
      console.error('Batch update failed:', error);
    } finally {
      setIsBatchUpdating(false);
      setBatchStatus(null);
    }
  };

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
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by material, vendor, or requester..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {(vendors ?? []).map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Batch Actions */}
          {selectedRequests.size > 0 && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                {selectedRequests.size} request{selectedRequests.size > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => handleBatchStatusUpdate('approved')}
                  disabled={isBatchUpdating}
                >
                  {isBatchUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve Selected
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleBatchStatusUpdate('rejected')}
                  disabled={isBatchUpdating}
                >
                  Reject Selected
                </Button>
              </div>
            </div>
          )}
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
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedRequests.size === filteredRequests.length && filteredRequests.length > 0}
                          onCheckedChange={() => toggleSelectAll(filteredRequests)}
                        />
                      </TableHead>
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
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {searchTerm || vendorFilter !== 'all'
                            ? 'No requests match your filters'
                            : 'No material requests found'}
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
                          isSelected={selectedRequests.has(req.id)}
                          onToggleSelect={toggleRequestSelection}
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
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedRequests.size === statusRequests.length && statusRequests.length > 0}
                            onCheckedChange={() => toggleSelectAll(statusRequests)}
                          />
                        </TableHead>
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
                      {statusRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                            isSelected={selectedRequests.has(req.id)}
                            onToggleSelect={toggleRequestSelection}
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
