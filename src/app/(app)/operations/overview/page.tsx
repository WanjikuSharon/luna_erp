// Moved from src/app/(app)/operations/page.tsx
'use client';

import { useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { RawMaterial } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// Activity type (keeping from previous implementation)
type Activity = {
  id: string;
  user: string;
  action: string;
  timestamp: any; // Firestore Timestamp
  details?: string;
};

// Stat Card Component
function StatCard({ title, value, description, icon: Icon, trend }: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="mt-2 flex items-center text-xs text-green-600">
            <TrendingUp className="mr-1 h-3 w-3" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton for stat cards
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// Inventory Table Skeleton
function InventoryTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Material</TableHead>
          <TableHead className="text-center">Current Stock</TableHead>
          <TableHead className="text-center">Reorder Level</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Unit Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Activity Table Skeleton
function ActivityTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function OperationsPage() {
  const firestore = useFirestore();

  // Firestore references
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, 'raw_materials'), [firestore]);
  const activitiesRef = useMemoFirebase(() => collection(firestore, 'operationsActivities'), [firestore]);

  // Fetch data
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: activities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesRef);

  // Calculate metrics
  const totalMaterials = rawMaterials?.length ?? 0;
  const lowStockItems = useMemo(() => {
    return (rawMaterials ?? []).filter(m => m.quantity <= m.reorderPoint).length;
  }, [rawMaterials]);

  const inventoryValue = useMemo(() => {
    // Using a placeholder price since unitPrice doesn't exist in type yet
    return (rawMaterials ?? []).reduce((sum, m) => sum + (m.quantity * 10), 0);
  }, [rawMaterials]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Operations Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor inventory levels and manage stock operations.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingMaterials ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Materials"
              value={totalMaterials}
              description="Active inventory items"
              icon={Package}
              trend="+2 this month"
            />
            <StatCard
              title="Low Stock Alerts"
              value={lowStockItems}
              description="Items below reorder level"
              icon={AlertTriangle}
            />
            <StatCard
              title="Inventory Value"
              value={`KES ${inventoryValue.toLocaleString()}`}
              description="Total stock value"
              icon={DollarSign}
              trend="+12% from last month"
            />
            <StatCard
              title="Pending Requests"
              value={0}
              description="Awaiting approval"
              icon={Package}
            />
          </>
        )}
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
          <CardDescription>
            Real-time view of raw material stock levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMaterials ? (
            <InventoryTableSkeleton />
          ) : (rawMaterials ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No materials found. Add materials to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="text-center">Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rawMaterials ?? []).map((material) => {
                  const isLowStock = material.quantity <= material.reorderPoint;
                  return (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell className="text-center">
                        {material.quantity} {material.unit}
                      </TableCell>
                      <TableCell className="text-center">
                        {material.reorderPoint} {material.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                          {isLowStock ? 'Low Stock' : 'Adequate'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        KES 10.00
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Operations Activity</CardTitle>
          <CardDescription>
            Latest inventory and operations actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <ActivityTableSkeleton />
          ) : (activities ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activities ?? []).slice(0, 10).map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.user}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.details || '—'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {activity.timestamp?.toDate
                        ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
