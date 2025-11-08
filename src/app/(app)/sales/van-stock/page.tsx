// src/app/(app)/sales/van-stock/page.tsx
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Salesperson, VanStockLog, VanStockItem } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import { Package, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface VanInventoryItem {
  productId: string;
  productName: string;
  currentStock: number;
  totalIssued: number;
  totalReturned: number;
}

export default function VanStockPage() {
  const firestore = useFirestore();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // --- Fetch Salespeople ---
  const salespeopleRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.SALESPEOPLE),
    [firestore]
  );
  const { data: salespeople, isLoading: isLoadingSalespeople } = useCollection<Salesperson>(salespeopleRef);

  // --- Fetch Van Stock Logs for Selected Agent ---
  const vanStockLogsRef = useMemoFirebase(
    () => selectedAgentId
      ? query(
          collection(firestore, 'van_stock_logs'),
          where('agentId', '==', selectedAgentId)
        )
      : null,
    [firestore, selectedAgentId]
  );
  const { data: vanStockLogsRaw, isLoading: isLoadingLogs } = useCollection<VanStockLog>(
    vanStockLogsRef || undefined
  );

  // Sort the logs by date in JavaScript (to avoid needing a Firestore composite index)
  const vanStockLogs = useMemo(() => {
    if (!vanStockLogsRaw) return null;
    return [...vanStockLogsRaw].sort((a, b) => {
      const dateA = a.date?.toDate?.()?.getTime() || 0;
      const dateB = b.date?.toDate?.()?.getTime() || 0;
      return dateB - dateA; // Descending order (newest first)
    });
  }, [vanStockLogsRaw]);

  // --- Calculate Current Van Inventory ---
  const vanInventory = useMemo<VanInventoryItem[]>(() => {
    if (!vanStockLogs || vanStockLogs.length === 0) return [];

    // Create a map to aggregate stock by product
    const inventoryMap = new Map<string, VanInventoryItem>();

    vanStockLogs.forEach((log) => {
      log.items.forEach((item) => {
        const existing = inventoryMap.get(item.productId);
        
        if (existing) {
          if (log.type === 'out') {
            existing.totalIssued += item.quantity;
            existing.currentStock += item.quantity;
          } else {
            existing.totalReturned += item.quantity;
            existing.currentStock -= item.quantity;
          }
        } else {
          inventoryMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            currentStock: log.type === 'out' ? item.quantity : -item.quantity,
            totalIssued: log.type === 'out' ? item.quantity : 0,
            totalReturned: log.type === 'in' ? item.quantity : 0,
          });
        }
      });
    });

    // Convert map to array and sort by product name
    return Array.from(inventoryMap.values())
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [vanStockLogs]);

  // --- Calculate Summary Stats ---
  const summaryStats = useMemo(() => {
    const totalProducts = vanInventory.length;
    const totalUnitsInVan = vanInventory.reduce((sum, item) => sum + item.currentStock, 0);
    const productsWithStock = vanInventory.filter(item => item.currentStock > 0).length;
    
    return { totalProducts, totalUnitsInVan, productsWithStock };
  }, [vanInventory]);

  const selectedSalesperson = salespeople?.find(s => s.id === selectedAgentId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Van Stock Inventory</h1>
        <p className="text-muted-foreground">
          View current inventory levels for each salesperson's van based on stock in/out transactions.
        </p>
      </div>

      {/* --- Salesperson Selector --- */}
      <Card>
        <CardHeader>
          <CardTitle>Select Salesperson</CardTitle>
          <CardDescription>
            Choose a sales agent to view their current van inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select a salesperson..." />
            </SelectTrigger>
            <SelectContent>
              {isLoadingSalespeople ? (
                <SelectItem value="loading" disabled>
                  Loading salespeople...
                </SelectItem>
              ) : (
                (salespeople ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* --- Display Results Only if Agent is Selected --- */}
      {selectedAgentId && (
        <>
          {/* --- Summary Cards --- */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{summaryStats.totalProducts}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {summaryStats.productsWithStock} with stock
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Units in Van</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{summaryStats.totalUnitsInVan}</div>
                )}
                <p className="text-xs text-muted-foreground">across all products</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Agent Name</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-bold truncate">
                    {selectedSalesperson?.name || 'Unknown'}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">selected agent</p>
              </CardContent>
            </Card>
          </div>

          {/* --- Inventory Table --- */}
          <Card>
            <CardHeader>
              <CardTitle>Current Van Inventory</CardTitle>
              <CardDescription>
                Breakdown of all products currently in {selectedSalesperson?.name}'s van, 
                calculated from all stock in/out transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : vanInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No stock transactions found for this salesperson yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Total Issued</TableHead>
                      <TableHead className="text-right">Total Returned</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vanInventory.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            {item.totalIssued}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingDown className="h-4 w-4 text-orange-500" />
                            {item.totalReturned}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold">{item.currentStock}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.currentStock > 0 ? (
                            <Badge variant="default">In Stock</Badge>
                          ) : item.currentStock === 0 ? (
                            <Badge variant="secondary">Empty</Badge>
                          ) : (
                            <Badge variant="destructive">Discrepancy</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* --- Transaction History --- */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Recent stock in/out transactions for {selectedSalesperson?.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !vanStockLogs || vanStockLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No transactions found.
                </p>
              ) : (
                <div className="space-y-4">
                  {vanStockLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.type === 'out' ? 'default' : 'secondary'}>
                            {log.type === 'out' ? 'Stock Out' : 'Stock In'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.date?.toDate ? format(log.date.toDate(), 'PPP') : 'Unknown date'}
                          </span>
                        </div>
                        <div className="text-sm">
                          {log.items.map((item, idx) => (
                            <div key={idx} className="text-muted-foreground">
                              {item.productName}: {item.quantity} units
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        {log.type === 'out' ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* --- Empty State if No Agent Selected --- */}
      {!selectedAgentId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Salesperson</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Choose a sales agent from the dropdown above to view their current van inventory 
                and transaction history.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
