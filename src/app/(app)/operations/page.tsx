'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Warehouse, Package, Truck } from 'lucide-react';
import type { Activity, RawMaterial } from '@/lib/types';
import { format } from 'date-fns';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function OperationsDashboardPage() {
  const firestore = useFirestore();

  // Memoize collection references
  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, 'rawMaterials'), [firestore]);
  const operationsActivitiesRef = useMemoFirebase(() => collection(firestore, 'operationsActivities'), [firestore]);

  // Fetch data from Firestore
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: operationsActivities, isLoading: isLoadingActivities } = useCollection<Activity>(operationsActivitiesRef);

  const isLoading = isLoadingMaterials || isLoadingActivities;

  // Calculate metrics from real data
  const lowStockItems = rawMaterials?.filter(m => m.quantity < m.reorderPoint).length ?? 0;
  const inventoryValue = rawMaterials?.reduce((acc, item) => acc + item.quantity * 5, 0) ?? 0; // Dummy price

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl">
          Operations Dashboard
        </h1>
        <p className="text-muted-foreground">Here's a summary of your operations today.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingMaterials ? '...' : `$${inventoryValue.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingMaterials ? '...' : lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items needing reorder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+5</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries Today</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Scheduled for arrival</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operations Log</CardTitle>
          <CardDescription>A log of recent inventory and request activities.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingActivities ? (
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (operationsActivities && operationsActivities.length > 0) ? (
                <div className="space-y-6">
                    {(operationsActivities ?? []).map((activity: Activity) => (
                        <div key={activity.id} className="flex items-start gap-4">
                            <Avatar className="h-9 w-9 border">
                                <AvatarImage src={activity.user.avatarUrl} alt={activity.user.name} />
                                <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                                <p className="font-medium text-muted-foreground">
                                    <span className="font-semibold text-foreground">{activity.user.name}</span>
                                    {' '}{activity.action}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(activity.timestamp), "MM/dd/yyyy 'at' h:mm a")}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">No operations activities yet. Activities will appear here as users interact with inventory and requests.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
