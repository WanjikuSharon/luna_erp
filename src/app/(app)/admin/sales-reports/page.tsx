// src/app/(app)/admin/sales-reports/page.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { DailySalesReport } from '@/lib/types';
import { FileText, Eye, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore'; 
import { TableSkeleton, CardSkeleton } from '@/components/skeletons';

const DailySalesReportSheet = dynamic(
  () => import('@/components/reports/DailySalesReportSheet').then(mod => ({ default: mod.DailySalesReportSheet })),
  { loading: () => <CardSkeleton /> }
);

export default function DailySalesReportsPage() {
    const firestore = useFirestore();
    
    const salesReportsRef = useMemoFirebase(
      () => query(collection(firestore, 'daily_sales_records'), orderBy('date', 'desc')),
      [firestore]
    );
    const { data: salesReports, isLoading } = useCollection<DailySalesReport>(salesReportsRef);
    
    const [viewingReport, setViewingReport] = useState<DailySalesReport | null>(null);

    const totalRevenue = salesReports?.reduce((sum, report) => {
      const reportTotal = report.records?.reduce((rSum, record) => rSum + (record.totalAmount || 0), 0) || 0;
      return sum + reportTotal;
    }, 0) || 0;

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl">
            Daily Sales Reports
          </h1>
          <p className="text-muted-foreground">View and analyze daily sales data</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesReports?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Sales reports recorded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ksh {totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From all recorded sales</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sales Reports
            </CardTitle>
            <CardDescription>
              All daily sales reports from the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={10} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sales Person</TableHead>
                    <TableHead>Items Sold</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesReports && salesReports.length > 0 ? (
                    salesReports.map((report) => {
                      const totalAmount = report.records?.reduce((sum, record) => sum + (record.totalAmount || 0), 0) || 0;
                      const itemCount = report.records?.length || 0;
                      
                      return (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            {report.date ? format(report.date.toDate(), 'PPP') : 'N/A'}
                          </TableCell>
                          <TableCell>{report.salesPersonName || 'N/A'}</TableCell>
                          <TableCell>{itemCount} items</TableCell>
                          <TableCell>Ksh {totalAmount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={report.submitted ? 'default' : 'secondary'}>
                              {report.submitted ? 'Submitted' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingReport(report)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No sales reports found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <DailySalesReportSheet
          report={viewingReport}
          onOpenChange={() => setViewingReport(null)}
        />
      </div>
    );
}
