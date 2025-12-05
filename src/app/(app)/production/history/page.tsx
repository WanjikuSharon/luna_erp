// src/app/(app)/production/history/page.tsx
'use client';

import { useState, useMemo } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import type { ProductionBatch, QcAnalysisItem, BatchRawMaterial, BatchPackagingMaterial } from '@/lib/types';
import { Check, X } from 'lucide-react';

// --- Main Page Component ---
export default function ProductionHistoryPage() {
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);

  const firestore = useFirestore();
  const batchesRef = useMemoFirebase(
    () => query(collection(firestore, 'production_batches'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  
  const { data: batches, isLoading } = useCollection<ProductionBatch>(batchesRef);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Batch & Production Report</h1>
          <p className="text-muted-foreground">
            A complete log of all manufactured batches and their production reports.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Batch History</CardTitle>
            <CardDescription>
              All submitted batch manufacturing records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <BatchTableSkeleton />}
            {!isLoading && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Mfg. Date</TableHead>
                    <TableHead className="text-center">Batch Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Analysed By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(batches ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No production batches have been logged yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {(batches ?? []).map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                      <TableCell>{batch.productName}</TableCell>
                      <TableCell>{format(batch.dateOfMfg.toDate(), 'PPP')}</TableCell>
                      <TableCell className="text-center">{batch.batchSize}</TableCell>
                      <TableCell>
                        <Badge variant={batch.status === 'Completed' ? 'secondary' : 'default'}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{batch.qcEndProductAnalysis.labelDetails.analysedBy}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedBatch(batch)}>
                          View Output Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Detail Sheet --- */}
      <BatchDetailSheet
        batch={selectedBatch}
        onOpenChange={(open) => {
          if (!open) setSelectedBatch(null);
        }}
      />
    </>
  );
}

// --- Skeleton Component ---
function BatchTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Batch #</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Mfg. Date</TableHead>
          <TableHead className="text-center">Batch Size</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Analysed By</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// --- Detail Sheet Component ---
function BatchDetailSheet({
  batch,
  onOpenChange,
}: {
  batch: ProductionBatch | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!batch) return null;

  return (
    <Sheet open={!!batch} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>QC Report: Batch {batch.batchNumber}</SheetTitle>
          <SheetDescription>
            Full manufacturing and quality control details for {batch.productName}.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          
          {/* Section 1: Raw Material QC */}
          <Section title="Raw Material QC Checks">
            <CheckItem isChecked={batch.qcRawMaterialChecks.sealsOk} label="No broken seals" />
            <CheckItem isChecked={batch.qcRawMaterialChecks.weightOk} label="Weight matches requested quantity" />
            <CheckItem isChecked={batch.qcRawMaterialChecks.materialOk} label="Correct material type as ordered" />
          </Section>
          
          {/* Section 2: End Product QC - Label Details */}
          <Section title="QC Label Details & Yield">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoItem label="Analysed By" value={batch.qcEndProductAnalysis.labelDetails.analysedBy} />
              <InfoItem label="Date Analysed" value={format(batch.qcEndProductAnalysis.labelDetails.dateAnalysed.toDate(), 'PPP')} />
              <InfoItem label="Date of Mfg" value={format(batch.qcEndProductAnalysis.labelDetails.dateOfMfg.toDate(), 'PPP')} />
              <InfoItem label="Exp. Date" value={format(batch.qcEndProductAnalysis.labelDetails.expDate.toDate(), 'PPP')} />
              <InfoItem label="Yield" value={batch.qcEndProductAnalysis.labelDetails.yield} />
              <InfoItem label="Expected Yield" value={batch.qcEndProductAnalysis.labelDetails.expectedYield} />
              <InfoItem label="% Yield" value={batch.qcEndProductAnalysis.labelDetails.percentYield} />
              <InfoItem label="Batch Sheet" value={batch.qcEndProductAnalysis.labelDetails.batchSheet} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <CheckItem isChecked={batch.qcEndProductAnalysis.labelDetails.stocked} label="Stocked (yes/no)" />
              <CheckItem isChecked={batch.qcEndProductAnalysis.labelDetails.releaseForFilling} label="Release for filling (yes/no)" />
            </div>
          </Section>
          
          {/* Section 3: End Product QC - Analysis */}
          <Section title="QC End Product Analysis">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Analysis</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Obtained</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.qcEndProductAnalysis.analysisItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-xs">{item.analysis}</TableCell>
                      <TableCell>{item.standard}</TableCell>
                      <TableCell>{item.obtained}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 space-y-2">
              <InfoItem label="Problems encountered/suggested" value={batch.qcEndProductAnalysis.problems || 'N/A'} />
              <InfoItem label="Improvement" value={batch.qcEndProductAnalysis.improvement || 'N/A'} />
            </div>
          </Section>

          {/* Section 4: Materials Used */}
          <Section title="Materials Consumed">
            <h4 className="font-semibold text-sm text-foreground">Raw Materials Used</h4>
            <div className="border rounded-md">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-center">Weighed</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {batch.rawMaterialsUsed.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        <CheckItem isChecked={item.weighed} label="" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <h4 className="font-semibold text-sm text-foreground mt-4">Packaging Used</h4>
             <div className="border rounded-md">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {batch.packagingUsed.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>

        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// --- Helper Components for the Sheet ---
function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-semibold font-headline tracking-tight">{title}</h3>
      <Separator className="my-2" />
      <div className="space-y-4 text-sm">
        {children}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string | number | undefined }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value || 'N/A'}</p>
    </div>
  );
}

function CheckItem({ isChecked, label }: { isChecked: boolean, label: string }) {
  return (
    <div className="flex items-center gap-2">
      {isChecked ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-destructive" />
      )}
      <span className="font-medium">{label}</span>
    </div>
  );
}
