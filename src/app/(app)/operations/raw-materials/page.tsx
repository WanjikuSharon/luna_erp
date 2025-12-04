// src/app/(app)/operations/raw-materials/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { RawMaterial } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, AlertTriangle, CheckCircle, Search, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

// Configurable thresholds
const LOW_STOCK_THRESHOLD = 100; // kg
const CRITICAL_STOCK_THRESHOLD = 50; // kg

type StockLevel = 'critical' | 'low' | 'adequate';

function getStockLevel(quantity: number, unit: string): StockLevel {
  // Convert to kg if needed for comparison
  const qtyInKg = unit.toLowerCase() === 'kg' ? quantity : quantity;
  
  if (qtyInKg < CRITICAL_STOCK_THRESHOLD) return 'critical';
  if (qtyInKg < LOW_STOCK_THRESHOLD) return 'low';
  return 'adequate';
}

function getStockBadge(level: StockLevel) {
  switch (level) {
    case 'critical':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Critical
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    case 'adequate':
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Adequate
        </Badge>
      );
  }
}

function getStockPercentage(quantity: number, unit: string): number {
  const qtyInKg = unit.toLowerCase() === 'kg' ? quantity : quantity;
  const maxStock = 500; // Assume max stock is 500kg for percentage calculation
  return Math.min((qtyInKg / maxStock) * 100, 100);
}

function getProgressColor(level: StockLevel): string {
  switch (level) {
    case 'critical':
      return 'bg-red-500';
    case 'low':
      return 'bg-yellow-500';
    case 'adequate':
      return 'bg-green-500';
  }
}

export default function RawMaterialsInventoryPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const rawMaterialsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.RAW_MATERIALS),
    [firestore]
  );

  const { data: rawMaterials, isLoading } = useCollection<RawMaterial>(rawMaterialsRef);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!rawMaterials) return { total: 0, critical: 0, low: 0, adequate: 0 };

    const counts = rawMaterials.reduce(
      (acc, material) => {
        const level = getStockLevel(material.quantity, material.unit);
        acc[level]++;
        acc.total++;
        return acc;
      },
      { total: 0, critical: 0, low: 0, adequate: 0 }
    );

    return counts;
  }, [rawMaterials]);

  // Filter materials
  const filteredMaterials = useMemo(() => {
    if (!rawMaterials) return [];
    if (!searchTerm) return rawMaterials;

    return rawMaterials.filter(
      (material) =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawMaterials, searchTerm]);

  // Categorize materials
  const criticalMaterials = useMemo(
    () => filteredMaterials.filter((m) => getStockLevel(m.quantity, m.unit) === 'critical'),
    [filteredMaterials]
  );

  const lowMaterials = useMemo(
    () => filteredMaterials.filter((m) => getStockLevel(m.quantity, m.unit) === 'low'),
    [filteredMaterials]
  );

  const adequateMaterials = useMemo(
    () => filteredMaterials.filter((m) => getStockLevel(m.quantity, m.unit) === 'adequate'),
    [filteredMaterials]
  );

  const MaterialRow = ({ material }: { material: RawMaterial }) => {
    const stockLevel = getStockLevel(material.quantity, material.unit);
    const percentage = getStockPercentage(material.quantity, material.unit);

    return (
      <TableRow>
        <TableCell>
          <div className="font-medium">{material.name}</div>
          {material.category && (
            <div className="text-xs text-muted-foreground">{material.category}</div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">
                  {material.quantity} {material.unit}
                </span>
                <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
              </div>
              <Progress value={percentage} className={`h-2 ${getProgressColor(stockLevel)}`} />
            </div>
          </div>
        </TableCell>
        <TableCell>{getStockBadge(stockLevel)}</TableCell>
        <TableCell>
          {stockLevel !== 'adequate' && (
            <Button size="sm" asChild>
              <Link href="/operations/inventory">Request Restock</Link>
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Raw Materials Inventory
        </h1>
        <p className="text-muted-foreground">
          Monitor stock levels and request restocking for low inventory items
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Critical Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <p className="text-xs text-red-600 mt-1">
              Below {CRITICAL_STOCK_THRESHOLD}kg - Urgent restock needed
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.low}</div>
            <p className="text-xs text-yellow-600 mt-1">
              Below {LOW_STOCK_THRESHOLD}kg - Restock recommended
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Adequate Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.adequate}</div>
            <p className="text-xs text-green-600 mt-1">Sufficient inventory</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>Current inventory status for all raw materials</CardDescription>
            </div>
            <Button asChild>
              <Link href="/operations/inventory">Manage Inventory</Link>
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search materials..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All ({filteredMaterials.length})</TabsTrigger>
              <TabsTrigger value="critical" className="text-red-700">
                Critical ({criticalMaterials.length})
              </TabsTrigger>
              <TabsTrigger value="low" className="text-yellow-700">
                Low ({lowMaterials.length})
              </TabsTrigger>
              <TabsTrigger value="adequate" className="text-green-700">
                Adequate ({adequateMaterials.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No materials found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((material) => (
                      <MaterialRow key={material.id} material={material} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="critical">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No critical stock items
                      </TableCell>
                    </TableRow>
                  ) : (
                    criticalMaterials.map((material) => (
                      <MaterialRow key={material.id} material={material} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="low">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No low stock items
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowMaterials.map((material) => (
                      <MaterialRow key={material.id} material={material} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="adequate">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adequateMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No items with adequate stock
                      </TableCell>
                    </TableRow>
                  ) : (
                    adequateMaterials.map((material) => (
                      <MaterialRow key={material.id} material={material} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
