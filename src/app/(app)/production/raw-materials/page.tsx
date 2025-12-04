// src/app/(app)/production/raw-materials/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, AlertTriangle, CheckCircle, Search, Package, Minus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

// Configurable thresholds
const LOW_STOCK_THRESHOLD = 100; // kg
const CRITICAL_STOCK_THRESHOLD = 50; // kg

type StockLevel = 'critical' | 'low' | 'adequate';

function getStockLevel(quantity: number, unit: string): StockLevel {
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
  const maxStock = 500;
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

export default function ProductionRawMaterialsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [useMaterial, setUseMaterial] = useState<RawMaterial | null>(null);
  const [useQuantity, setUseQuantity] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const rawMaterialsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.RAW_MATERIALS),
    [firestore]
  );

  const { data: rawMaterials, isLoading } = useCollection<RawMaterial>(rawMaterialsRef);

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

  const filteredMaterials = useMemo(() => {
    if (!rawMaterials) return [];
    if (!searchTerm) return rawMaterials;

    return rawMaterials.filter(
      (material) =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawMaterials, searchTerm]);

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

  const handleUseMaterial = async () => {
    if (!useMaterial || !useQuantity) return;

    const qty = parseFloat(useQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Quantity', description: 'Please enter a valid quantity.' });
      return;
    }

    if (qty > useMaterial.quantity) {
      toast({ variant: 'destructive', title: 'Insufficient Stock', description: 'Not enough material in stock.' });
      return;
    }

    setIsProcessing(true);
    try {
      const docRef = doc(firestore, COLLECTIONS.RAW_MATERIALS, useMaterial.id);
      await updateDoc(docRef, {
        quantity: increment(-qty),
        updatedAt: serverTimestamp(),
      });

      toast({ 
        title: 'Material Used', 
        description: `${qty} ${useMaterial.unit} of ${useMaterial.name} deducted from inventory.` 
      });
      
      setUseMaterial(null);
      setUseQuantity('');
    } catch (error) {
      console.error('Failed to use material:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update inventory.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const MaterialRow = ({ material }: { material: RawMaterial }) => {
    const stockLevel = getStockLevel(material.quantity, material.unit);
    const percentage = getStockPercentage(material.quantity, material.unit);

    return (
      <TableRow>
        <TableCell>
          <div className="font-medium">{material.name}</div>
          <div className="text-xs text-muted-foreground">SKU: {material.sku}</div>
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
          <Button size="sm" variant="outline" onClick={() => setUseMaterial(material)}>
            <Minus className="h-4 w-4 mr-1" />
            Use Material
          </Button>
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
          Raw Materials Stock
        </h1>
        <p className="text-muted-foreground">
          View available materials and record usage for production
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
            <p className="text-xs text-red-600 mt-1">Below {CRITICAL_STOCK_THRESHOLD}kg</p>
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
            <p className="text-xs text-yellow-600 mt-1">Below {LOW_STOCK_THRESHOLD}kg</p>
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
          <CardTitle>Available Stock</CardTitle>
          <CardDescription>Current inventory levels - record material usage for production</CardDescription>
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

            {['all', 'critical', 'low', 'adequate'].map((tab) => {
              const materials =
                tab === 'all'
                  ? filteredMaterials
                  : tab === 'critical'
                  ? criticalMaterials
                  : tab === 'low'
                  ? lowMaterials
                  : adequateMaterials;

              return (
                <TabsContent key={tab} value={tab}>
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
                      {materials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No materials found
                          </TableCell>
                        </TableRow>
                      ) : (
                        materials.map((material) => <MaterialRow key={material.id} material={material} />)
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Use Material Dialog */}
      <Dialog open={!!useMaterial} onOpenChange={(open) => !open && setUseMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Material for Production</DialogTitle>
            <DialogDescription>
              Record material usage. This will decrease the inventory stock.
            </DialogDescription>
          </DialogHeader>
          
          {useMaterial && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm text-muted-foreground">Material</Label>
                <p className="font-medium">{useMaterial.name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Available Stock</Label>
                <p className="font-medium">{useMaterial.quantity} {useMaterial.unit}</p>
              </div>
              <div>
                <Label htmlFor="useQuantity">Quantity to Use ({useMaterial.unit})</Label>
                <Input
                  id="useQuantity"
                  type="number"
                  placeholder={`Enter amount in ${useMaterial.unit}`}
                  value={useQuantity}
                  onChange={(e) => setUseQuantity(e.target.value)}
                  min="0"
                  max={useMaterial.quantity}
                  step="0.01"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUseMaterial(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleUseMaterial} disabled={isProcessing || !useQuantity}>
              {isProcessing ? 'Processing...' : 'Confirm Usage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
