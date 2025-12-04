// src/app/(app)/admin/approvals/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import type { MaterialRequest, RawMaterial, Vendor } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Loader2, Mail, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { sendRequestEmail } from '@/ai/flows/send-request-email';

export default function ApprovalsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch data
  const requestsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.REQUESTS), [firestore]);
  const materialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const vendorsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.VENDORS), [firestore]);

  const { data: requests, isLoading: loadingRequests } = useCollection<MaterialRequest>(requestsRef);
  const { data: rawMaterials, isLoading: loadingMaterials } = useCollection<RawMaterial>(materialsRef);
  const { data: vendors, isLoading: loadingVendors } = useCollection<Vendor>(vendorsRef);

  const isLoading = loadingRequests || loadingMaterials || loadingVendors;

  // Create lookup maps
  const materialNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    rawMaterials?.forEach(m => { map[m.id] = m.name; });
    return map;
  }, [rawMaterials]);

  const vendorMap = useMemo(() => {
    const map: Record<string, Vendor> = {};
    vendors?.forEach(v => { map[v.id] = v; });
    return map;
  }, [vendors]);

  // Filter requests by status
  const pendingRequests = useMemo(() => 
    requests?.filter(r => r.status === 'pending') || [], 
    [requests]
  );

  const approvedRequests = useMemo(() => 
    requests?.filter(r => r.status === 'approved') || [], 
    [requests]
  );

  const handleApprove = async (request: MaterialRequest) => {
    setProcessingId(request.id);
    try {
      const docRef = doc(firestore, COLLECTIONS.REQUESTS, request.id);
      await updateDoc(docRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Request Approved', description: 'The request has been approved.' });
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve request.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: MaterialRequest) => {
    setProcessingId(request.id);
    try {
      const docRef = doc(firestore, COLLECTIONS.REQUESTS, request.id);
      await updateDoc(docRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Request Rejected', description: 'The request has been rejected.' });
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject request.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleContactSupplier = async (request: MaterialRequest) => {
    setProcessingId(request.id);
    try {
      const material = rawMaterials?.find(m => m.id === request.materialId);
      const vendor = vendorMap[request.vendorId];
      
      if (!material || !vendor) {
        toast({ variant: 'destructive', title: 'Error', description: 'Material or vendor not found.' });
        return;
      }

      // Send email to supplier
      await sendRequestEmail({
        requestId: request.id,
        materialName: material.name,
        quantity: request.quantity,
        requesterName: request.requestedByName,
        vendorName: vendor.name,
        vendorEmail: vendor.email,
        requestUrl: `${window.location.origin}/operations/requests?requestId=${request.id}`,
      });

      // Update request to mark supplier as contacted
      const docRef = doc(firestore, COLLECTIONS.REQUESTS, request.id);
      await updateDoc(docRef, {
        supplierContacted: true,
        supplierContactedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({ title: 'Supplier Contacted', description: `Email sent to ${vendor.name}` });
    } catch (error) {
      console.error('Failed to contact supplier:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send email to supplier.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAwaitingDelivery = async (request: MaterialRequest) => {
    setProcessingId(request.id);
    try {
      const docRef = doc(firestore, COLLECTIONS.REQUESTS, request.id);
      await updateDoc(docRef, { 
        status: 'awaiting_delivery',
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Status Updated', description: 'Marked as awaiting delivery.' });
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    } finally {
      setProcessingId(null);
    }
  };

  const RequestRow = ({ request }: { request: MaterialRequest }) => {
    const material = materialNameMap[request.materialId];
    const vendor = vendorMap[request.vendorId];
    const isProcessing = processingId === request.id;

    return (
      <TableRow>
        <TableCell className="font-medium">{material || 'Unknown'}</TableCell>
        <TableCell>{request.quantity} {request.unit}</TableCell>
        <TableCell>{vendor?.name || 'Unknown'}</TableCell>
        <TableCell>{request.requestedByName}</TableCell>
        <TableCell>
          {request.createdAt?.toDate ? format(request.createdAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
        </TableCell>
        <TableCell>
          {request.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleApprove(request)}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(request)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
          {request.status === 'approved' && !request.supplierContacted && (
            <Button
              size="sm"
              onClick={() => handleContactSupplier(request)}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
              Contact Supplier
            </Button>
          )}
          {request.status === 'approved' && request.supplierContacted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkAwaitingDelivery(request)}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}
              Schedule Delivery
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Request Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve material requests from operations team
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({approvedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Requests waiting for your approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map(request => (
                      <RequestRow key={request.id} request={request} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Requests</CardTitle>
              <CardDescription>Requests you have approved - contact suppliers and schedule deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No approved requests</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRequests.map(request => (
                      <RequestRow key={request.id} request={request} />
                    ))}
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
