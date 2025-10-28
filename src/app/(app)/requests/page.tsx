import Link from 'next/link';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { materialRequests, rawMaterials, users } from '@/lib/data';
import type { MaterialRequest } from '@/lib/types';
import { FilePlus2, CheckCircle, XCircle, Clock, Truck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
    pending: { label: 'Pending', icon: Clock, color: 'bg-amber-500' },
    approved: { label: 'Approved', icon: CheckCircle, color: 'bg-sky-500' },
    delivered: { label: 'Delivered', icon: Truck, color: 'bg-green-500' },
    rejected: { label: 'Rejected', icon: XCircle, color: 'bg-red-500' },
};

function RequestRow({ request }: { request: MaterialRequest }) {
  const material = rawMaterials.find(m => m.id === request.materialId);
  const requester = users.find(u => u.id === request.requestedBy);
  const status = statusConfig[request.status];

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{material?.name}</div>
        <div className="text-xs text-muted-foreground font-mono">{material?.sku}</div>
      </TableCell>
      <TableCell className="text-center">{request.quantity} {material?.unit}</TableCell>
      <TableCell>
          <Badge variant="secondary" className="font-normal">
              <status.icon className="mr-2 h-3.5 w-3.5" />
              {status.label}
          </Badge>
      </TableCell>
      <TableCell>{requester?.name}</TableCell>
      <TableCell className="text-right text-muted-foreground">
          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm">View Details</Button>
      </TableCell>
    </TableRow>
  );
}

export default function RequestsPage() {
    const allStatuses = Object.keys(statusConfig) as (keyof typeof statusConfig)[];
  
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Material Requests</h1>
                    <p className="text-muted-foreground">
                        Track and manage all raw material requests for production.
                    </p>
                </div>
                <Button>
                    <FilePlus2 className="mr-2" />
                    New Request
                </Button>
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

                        <TabsContent value="all">
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
                                    {materialRequests.map(req => <RequestRow key={req.id} request={req} />)}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        {allStatuses.map(status => (
                            <TabsContent key={status} value={status}>
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
                                        {materialRequests.filter(r => r.status === status).map(req => <RequestRow key={req.id} request={req} />)}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
