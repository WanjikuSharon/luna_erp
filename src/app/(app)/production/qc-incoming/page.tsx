// src/app/(app)/production/qc-incoming/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import type { MaterialRequest, RawMaterial, Vendor } from '@/lib/types';
import { COLLECTIONS } from '@/services/inventory_service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, ClipboardCheck, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function QCIncomingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useUser();
  
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [qcNotes, setQcNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch data
  const requestsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.REQUESTS), [firestore]);
  const materialsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.RAW_MATERIALS), [firestore]);
  const vendorsRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.VENDORS), [firestore]);

  const { data: requests, isLoading: loadingRequests } = useCollection<MaterialRequest>(requestsRef);
  const { data: rawMaterials, isLoading: loadingMaterials } = useCollection<RawMaterial>(materialsRef);
  const { data: vendors, isLoading: loadingVendors } = useCollection<Vendor>(vendorsRef);

  const isLoading = loadingRequests || loadingMaterials || loadingVendors;

  // Filter requests pending QC
  const pendingQCRequests = useMemo(
    () => requests?.filter((r) => r.status === 'pending_qc') || [],
    [requests]
  );

  // Create lookup maps
  const materialMap = useMemo(() => {
    const map: Record<string, RawMaterial> = {};
    rawMaterials?.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [rawMaterials]);

  const vendorMap = useMemo(() => {
    const map: Record<string, Vendor> = {};
    vendors?.forEach((v) => {
      map[v.id] = v;
    });
    return map;
  }, [vendors]);

  const handleApproveQC = async () => {
    if (!selectedRequest || !authUser) return;

    setIsProcessing(true);
    try {
      const requestDocRef = doc(firestore, COLLECTIONS.REQUESTS, selectedRequest.id);
      const material = materialMap[selectedRequest.materialId];

      if (!material) {
        toast({ variant: 'destructive', title: 'Error', description: 'Material not found.' });
        return;
      }

      // Update request with QC approval
      await updateDoc(requestDocRef, {
        status: 'delivered',
        qcApproved: true,
        qcPerformedBy: authUser.uid,
        qcPerformedByName: authUser.displayName || authUser.email || 'Production',
        qcPerformedAt: serverTimestamp(),
        qcNotes: qcNotes || 'QC Passed',
        updatedAt: serverTimestamp(),
      });

      // Increase stock since QC passed
      const materialDocRef = doc(firestore, COLLECTIONS.RAW_MATERIALS, selectedRequest.materialId);
      await updateDoc(materialDocRef, {
        quantity: increment(selectedRequest.quantity),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'QC Approved',
        description: `${selectedRequest.quantity} ${selectedRequest.unit} of ${material.name} added to stock.`,
      });

      setSelectedRequest(null);
      setQcNotes('');
    } catch (error) {
      console.error('Failed to approve QC:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve QC.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectQC = async () => {
    if (!selectedRequest || !authUser) return;

    setIsProcessing(true);
    try {
      const requestDocRef = doc(firestore, COLLECTIONS.REQUESTS, selectedRequest.id);

      // Update request with QC rejection
      await updateDoc(requestDocRef, {
        status: 'qc_rejected',
        qcApproved: false,
        qcPerformedBy: authUser.uid,
        qcPerformedByName: authUser.displayName || authUser.email || 'Production',
        qcPerformedAt: serverTimestamp(),
        qcNotes: qcNotes || 'QC Failed - Material does not meet quality standards',
        updatedAt: serverTimestamp(),
      });

      // Do NOT increase stock - material will be returned

      toast({
        title: 'QC Rejected',
        description: 'Material rejected. Operations will be notified to return to supplier.',
        variant: 'destructive',
      });

      setSelectedRequest(null);
      setQcNotes('');
    } catch (error) {
      console.error('Failed to reject QC:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject QC.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Incoming Materials QC
        </h1>
        <p className="text-muted-foreground">
          Perform quality control inspection on delivered raw materials before adding to stock
        </p>
      </div>

      {/* Stats Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Pending QC Inspection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-700">{pendingQCRequests.length}</div>
          <p className="text-xs text-blue-600 mt-1">
            Materials awaiting quality control approval
          </p>
        </CardContent>
      </Card>

      {/* QC Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Control Queue</CardTitle>
          <CardDescription>
            Inspect delivered materials and approve or reject based on quality standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Delivery Note</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingQCRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No materials pending QC inspection
                  </TableCell>
                </TableRow>
              ) : (
                pendingQCRequests.map((request) => {
                  const material = materialMap[request.materialId];
                  const vendor = vendorMap[request.vendorId];

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium">{material?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {material?.sku || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.quantity} {request.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>{vendor?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        {request.deliveryNoteUrl ? (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={request.deliveryNoteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Note
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No note</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.updatedAt?.toDate
                          ? format(request.updatedAt.toDate(), 'MMM dd, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setQcNotes('');
                          }}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-1" />
                          Perform QC
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* QC Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quality Control Inspection</DialogTitle>
            <DialogDescription>
              Inspect the delivered material and approve or reject based on quality standards
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Material</Label>
                  <p className="font-medium">
                    {materialMap[selectedRequest.materialId]?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Quantity</Label>
                  <p className="font-medium">
                    {selectedRequest.quantity} {selectedRequest.unit}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Supplier</Label>
                  <p className="font-medium">
                    {vendorMap[selectedRequest.vendorId]?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Delivery Note</Label>
                  {selectedRequest.deliveryNoteUrl ? (
                    <Button size="sm" variant="link" className="p-0 h-auto" asChild>
                      <a
                        href={selectedRequest.deliveryNoteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Document
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">No document</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qcNotes">QC Notes / Inspection Comments</Label>
                <Textarea
                  id="qcNotes"
                  placeholder="Enter inspection notes, observations, or reasons for approval/rejection..."
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">QC Decision:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ <strong>Approve:</strong> Material meets quality standards and will be added to stock</li>
                  <li>✗ <strong>Reject:</strong> Material fails QC and will be returned to supplier</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedRequest(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectQC}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Reject Material'}
            </Button>
            <Button onClick={handleApproveQC} disabled={isProcessing}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Approve & Add to Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
