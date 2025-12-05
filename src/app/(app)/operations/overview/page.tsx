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
import { Badge } from '@/components/ui/badge';
import { Package, AlertCircle, ClipboardCheck, Truck, CheckCircle, XCircle } from 'lucide-react';
import type { Activity, RawMaterial, MaterialRequest, Product, PackagingMaterial, Vendor } from '@/lib/types';
import { format, isToday } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// NEW: Import Firebase hooks and services
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';


export default function OperationsDashboardPage() {
  const firestore = useFirestore();

  // --- Fetch Live Data ---
  const materialsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.RAW_MATERIALS), 
    [firestore]
  );
  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(materialsRef);

  const requestsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.REQUESTS), 
    [firestore]
  );
  const { data: materialRequests, isLoading: isLoadingRequests } = useCollection<MaterialRequest>(requestsRef);

  const productsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.PRODUCTS), 
    [firestore]
  );
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

  const packagingRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.PACKAGING), 
    [firestore]
  );
  const { data: packaging, isLoading: isLoadingPackaging } = useCollection<PackagingMaterial>(packagingRef);

  const vendorsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.VENDORS), 
    [firestore]
  );
  const { data: vendors, isLoading: isLoadingVendors } = useCollection<Vendor>(vendorsRef);

  const activitiesRef = useMemoFirebase(
    () => query(collection(firestore, 'operations_activities'), orderBy('timestamp', 'desc')), 
    [firestore]
  );
  const { data: operationsActivities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesRef);

  const isLoading = isLoadingMaterials || isLoadingRequests || isLoadingActivities || 
                    isLoadingProducts || isLoadingPackaging || isLoadingVendors;

  // --- Calculate Dashboard Stats ---
  const dashboardStats = useMemo(() => {
    const materials = rawMaterials || [];
    const requests = materialRequests || [];
    const productsList = products || [];
    const packagingList = packaging || [];

    // Raw Materials - Critical and Low Stock
    const criticalRawMaterials = materials.filter(m => m.quantity < 50).length;
    const lowRawMaterials = materials.filter(m => m.quantity >= 50 && m.quantity < m.reorderPoint).length;

    // Products - Out of Stock and Low Stock
    const outOfStockProducts = productsList.filter(p => p.quantity === 0).length;
    const lowStockProducts = productsList.filter(p => p.quantity > 0 && p.quantity < 50).length;

    // Packaging - Low Stock
    const lowPackaging = packagingList.filter(p => p.quantity < p.reorderPoint).length;

    // Material Requests Stats
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const approvedRequests = requests.filter(r => r.status === 'approved').length;
    const awaitingDelivery = requests.filter(r => r.status === 'awaiting_delivery').length;
    const pendingQC = requests.filter(r => r.status === 'pending_qc').length;
    const qcApproved = requests.filter(r => r.status === 'delivered' && r.qcApproved === true).length;
    const qcRejected = requests.filter(r => r.status === 'qc_rejected').length;

    // Deliveries Today
    const deliveriesToday = requests.filter(r => {
      if ((r.status === 'delivered' || r.status === 'pending_qc') && r.updatedAt?.toDate) {
        return isToday(r.updatedAt.toDate());
      }
      return false;
    }).length;

    // Total active suppliers
    const totalVendors = (vendors || []).length;

    return {
      // Inventory
      criticalRawMaterials,
      lowRawMaterials,
      outOfStockProducts,
      lowStockProducts,
      lowPackaging,
      totalRawMaterials: materials.length,
      totalProducts: productsList.length,
      totalPackaging: packagingList.length,
      
      // Requests
      pendingRequests,
      approvedRequests,
      awaitingDelivery,
      pendingQC,
      qcApproved,
      qcRejected,
      deliveriesToday,
      
      // Vendors
      totalVendors
    };
  }, [rawMaterials, materialRequests, products, packaging, vendors]);
  
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl">
          Operations Dashboard
        </h1>
        <p className="text-muted-foreground">Real-time overview of inventory, requests, and operations</p>
      </div>
      
      {/* Inventory Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Inventory Status</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Critical Raw Materials</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-700">{dashboardStats.criticalRawMaterials}</div>
                  <p className="text-xs text-red-600">Below 50kg - urgent reorder</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Low Raw Materials</CardTitle>
              <Package className="h-4 w-4 text-yellow-700" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-yellow-700">{dashboardStats.lowRawMaterials}</div>
                  <p className="text-xs text-yellow-600">Below reorder point</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Out of Stock Products</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-700">{dashboardStats.outOfStockProducts}</div>
                  <p className="text-xs text-red-600">Products with 0 stock</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Low Stock Products</CardTitle>
              <Package className="h-4 w-4 text-yellow-700" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-yellow-700">{dashboardStats.lowStockProducts}</div>
                  <p className="text-xs text-yellow-600">Below 50 units</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Material Requests Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Material Requests</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{dashboardStats.pendingRequests}</div>
                  <p className="text-xs text-muted-foreground">Awaiting admin approval</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Approved Requests</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-700" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-700">{dashboardStats.approvedRequests}</div>
                  <p className="text-xs text-blue-600">Ready to contact supplier</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Delivery</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{dashboardStats.awaitingDelivery}</div>
                  <p className="text-xs text-muted-foreground">Supplier contacted</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Pending QC</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-purple-700" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-purple-700">{dashboardStats.pendingQC}</div>
                  <p className="text-xs text-purple-600">Awaiting production QC</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Stats</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">QC Approved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-700" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-700">{dashboardStats.qcApproved}</div>
                  <p className="text-xs text-green-600">Passed quality control</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">QC Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-700">{dashboardStats.qcRejected}</div>
                  <p className="text-xs text-red-600">Failed quality control</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{dashboardStats.totalVendors}</div>
                  <p className="text-xs text-muted-foreground">Active raw material suppliers</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Packaging</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{dashboardStats.lowPackaging}</div>
                  <p className="text-xs text-muted-foreground">Below reorder point</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
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
