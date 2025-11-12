// src/app/(app)/operations/overview/page.tsx
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Warehouse, Package, Truck, Loader2 } from 'lucide-react';
import type { Activity, RawMaterial, MaterialRequest } from '@/lib/types';
import { format, isToday } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// NEW: Import Firebase hooks and services
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';


export default function OperationsDashboardPage() {
  const firestore = useFirestore();

  // --- NEW: Fetch Live Data ---
  // Fetch all raw materials for inventory cards
  const materialsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.RAW_MATERIALS), 
    [firestore]
  );
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(materialsRef);

  // Fetch all material requests for request-related cards
  const requestsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.REQUESTS), 
    [firestore]
  );
  const { data: materialRequests, isLoading: isLoadingRequests } = useCollection<MaterialRequest>(requestsRef);

  // Fetch all activities, ordered by newest first
  const activitiesRef = useMemoFirebase(
    () => query(collection(firestore, 'operations_activities'), orderBy('timestamp', 'desc')), 
    [firestore]
  );
  const { data: operationsActivities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesRef);

  // Combined loading state
  const isLoading = isLoadingMaterials || isLoadingRequests || isLoadingActivities;

  // --- NEW: Calculate Dashboard Stats ---
  const dashboardStats = useMemo(() => {
    const materials = rawMaterials || [];
    const requests = materialRequests || [];

    // 1. Total Inventory Value (using dummy price of $5 per unit)
    //    We can update this later if you add a 'price' field to your materials.
    const inventoryValue = materials.reduce((acc, item) => acc + (item.quantity * 5), 0);
    
    // 2. Low Stock Items
    const lowStockItems = materials.filter(m => m.quantity < m.reorderPoint).length;

    // 3. Pending Requests
    const pendingRequests = requests.filter(r => r.status === 'pending').length;

    // 4. Deliveries Today
    //    We'll assume a "delivery today" is a request that was
    //    set to 'delivered' status today.
    const deliveriesToday = requests.filter(r => {
        if (r.status === 'delivered' && r.updatedAt?.toDate) {
            return isToday(r.updatedAt.toDate());
        }
        return false;
    }).length;

    return { inventoryValue, lowStockItems, pendingRequests, deliveriesToday };
  }, [rawMaterials, materialRequests]);
  
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl">
          Operations Dashboard
        </h1>
        <p className="text-muted-foreground">Here's a summary of your operations today.</p>
      </div>
      
      {/* --- UPDATED: Summary Cards --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                Ksh {dashboardStats.inventoryValue.toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Based on current stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{dashboardStats.lowStockItems}</div>
            )}
            <p className="text-xs text-muted-foreground">Items needing reorder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{dashboardStats.pendingRequests}</div>
            )}
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries Today</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{dashboardStats.deliveriesToday}</div>
            )}
            <p className="text-xs text-muted-foreground">Marked as delivered today</p>
          </CardContent>
        </Card>
      </div>

      {/* --- UPDATED: Operations Log --- */}
      <Card>
        <CardHeader>
          <CardTitle>Operations Log</CardTitle>
          <CardDescription>A log of recent inventory and request activities.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingActivities ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                  {(operationsActivities ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      No operations activities have been logged yet.
                    </p>
                  )}
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
                                  {activity.timestamp?.toDate ? 
                                    format(activity.timestamp.toDate(), "MM/dd/yyyy 'at' h:mm a") :
                                    'just now'
                                  }
                              </p>
                          </div>
                      </div>
                  ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
