// src/app/(app)/inventory/products/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, limit } from 'firebase/firestore';
import type { Product, ProductionBatch, DailySalesLedgerEntry } from '@/lib/types';
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  DollarSign,
  BarChart3,
  ShoppingCart,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

type StockLevel = 'out-of-stock' | 'low' | 'adequate' | 'high';

// Thresholds
const LOW_STOCK_THRESHOLD = 50;
const HIGH_STOCK_THRESHOLD = 500;

function getStockLevel(quantity: number): StockLevel {
  if (quantity === 0) return 'out-of-stock';
  if (quantity < LOW_STOCK_THRESHOLD) return 'low';
  if (quantity > HIGH_STOCK_THRESHOLD) return 'high';
  return 'adequate';
}

function getStockBadge(level: StockLevel) {
  switch (level) {
    case 'out-of-stock':
      return <Badge variant="destructive">Out of Stock</Badge>;
    case 'low':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Low Stock</Badge>;
    case 'adequate':
      return <Badge variant="outline" className="border-green-500 text-green-700">Adequate</Badge>;
    case 'high':
      return <Badge variant="outline" className="border-blue-500 text-blue-700">High Stock</Badge>;
  }
}

export default function ProductsInventoryPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch products
  const productsRef = useMemoFirebase(
    () => collection(firestore, COLLECTIONS.PRODUCTS),
    [firestore]
  );
  const { data: products, isLoading: loadingProducts } = useCollection<Product>(productsRef);

  // Fetch recent production batches (last 30 days)
  const batchesRef = useMemoFirebase(
    () => query(
      collection(firestore, 'production_batches'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ),
    [firestore]
  );
  const { data: batches, isLoading: loadingBatches } = useCollection<ProductionBatch>(batchesRef);

  // Fetch sales ledger entries (last 30 days for analytics)
  const salesRef = useMemoFirebase(
    () => query(
      collection(firestore, 'daily_sales_ledger'),
      orderBy('date', 'desc'),
      limit(100)
    ),
    [firestore]
  );
  const { data: salesEntries, isLoading: loadingSales } = useCollection<DailySalesLedgerEntry>(salesRef);

  const isLoading = loadingProducts || loadingBatches || loadingSales;

  // Calculate production totals by product
  const productionByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    batches?.forEach(batch => {
      if (batch.productId) {
        map[batch.productId] = (map[batch.productId] || 0) + (batch.batchSize || 0);
      }
    });
    return map;
  }, [batches]);

  // Calculate sales totals by product
  const salesByProduct = useMemo(() => {
    const map: Record<string, { sold: number, returned: number, revenue: number }> = {};
    salesEntries?.forEach(entry => {
      entry.entries?.forEach(item => {
        if (item.productId) {
          if (!map[item.productId]) {
            map[item.productId] = { sold: 0, returned: 0, revenue: 0 };
          }
          map[item.productId].sold += item.qtySold || 0;
          map[item.productId].returned += item.qtyReturned || 0;
          map[item.productId].revenue += (item.qtySold || 0) * (item.unitPrice || 0);
        }
      });
    });
    return map;
  }, [salesEntries]);

  // Enhanced product data with analytics
  const enrichedProducts = useMemo(() => {
    return products?.map(product => {
      const production = productionByProduct[product.id] || 0;
      const sales = salesByProduct[product.id] || { sold: 0, returned: 0, revenue: 0 };
      const stockLevel = getStockLevel(product.quantity);
      const inventoryValue = product.quantity * product.price;
      const turnoverRate = production > 0 ? (sales.sold / production) * 100 : 0;

      return {
        ...product,
        production,
        sales,
        stockLevel,
        inventoryValue,
        turnoverRate,
      };
    }) || [];
  }, [products, productionByProduct, salesByProduct]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return enrichedProducts;
    return enrichedProducts.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedProducts, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const totalProducts = enrichedProducts.length;
    const outOfStock = enrichedProducts.filter(p => p.stockLevel === 'out-of-stock').length;
    const lowStock = enrichedProducts.filter(p => p.stockLevel === 'low').length;
    const totalValue = enrichedProducts.reduce((sum, p) => sum + p.inventoryValue, 0);
    const totalRevenue = enrichedProducts.reduce((sum, p) => sum + p.sales.revenue, 0);

    return { totalProducts, outOfStock, lowStock, totalValue, totalRevenue };
  }, [enrichedProducts]);

  // Top sellers
  const topSellers = useMemo(() => {
    return [...enrichedProducts]
      .sort((a, b) => b.sales.sold - a.sales.sold)
      .slice(0, 5);
  }, [enrichedProducts]);

  // Slow movers
  const slowMovers = useMemo(() => {
    return [...enrichedProducts]
      .filter(p => p.quantity > 0) // Only products in stock
      .sort((a, b) => a.sales.sold - b.sales.sold)
      .slice(0, 5);
  }, [enrichedProducts]);

  // Stock categories
  const outOfStockProducts = filteredProducts.filter(p => p.stockLevel === 'out-of-stock');
  const lowStockProducts = filteredProducts.filter(p => p.stockLevel === 'low');
  const adequateStockProducts = filteredProducts.filter(p => p.stockLevel === 'adequate');
  const highStockProducts = filteredProducts.filter(p => p.stockLevel === 'high');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ProductRow = ({ product }: { product: typeof enrichedProducts[0] }) => (
    <TableRow>
      <TableCell>
        <div className="font-medium">{product.name}</div>
        <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
      </TableCell>
      <TableCell className="text-center">
        <div className="font-semibold">{product.quantity}</div>
        <div className="text-xs text-muted-foreground">{product.unit}</div>
      </TableCell>
      <TableCell>{getStockBadge(product.stockLevel)}</TableCell>
      <TableCell className="text-right">KES {product.price.toLocaleString()}</TableCell>
      <TableCell className="text-right">KES {product.inventoryValue.toLocaleString()}</TableCell>
      <TableCell className="text-center">{product.production.toLocaleString()}</TableCell>
      <TableCell className="text-center">
        <div className="font-medium">{product.sales.sold.toLocaleString()}</div>
        {product.sales.returned > 0 && (
          <div className="text-xs text-red-600">-{product.sales.returned} returned</div>
        )}
      </TableCell>
      <TableCell className="text-right">KES {product.sales.revenue.toLocaleString()}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={Math.min(product.turnoverRate, 100)} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-12">{product.turnoverRate.toFixed(0)}%</span>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Products Inventory & Analytics
        </h1>
        <p className="text-muted-foreground">
          Complete overview of product stock levels, production, sales performance, and inventory value
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.outOfStock}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.lowStock}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              KES {(stats.totalValue / 1000).toFixed(0)}K
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              KES {(stats.totalRevenue / 1000).toFixed(0)}K
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top/Slow Movers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top 5 Best Sellers
            </CardTitle>
            <CardDescription>Products with highest sales volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellers.map((product, idx) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-700">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.sales.sold} units sold
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-green-700">
                    KES {(product.sales.revenue / 1000).toFixed(1)}K
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Top 5 Slow Movers
            </CardTitle>
            <CardDescription>Products with lowest sales volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowMovers.map((product, idx) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-700">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.sales.sold} units sold • {product.quantity} in stock
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {product.turnoverRate.toFixed(0)}% turnover
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Inventory</CardTitle>
          <CardDescription>
            All products with stock levels, production, sales, and financial data
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All ({filteredProducts.length})</TabsTrigger>
              <TabsTrigger value="out-of-stock" className="text-red-700">
                Out of Stock ({outOfStockProducts.length})
              </TabsTrigger>
              <TabsTrigger value="low" className="text-yellow-700">
                Low ({lowStockProducts.length})
              </TabsTrigger>
              <TabsTrigger value="adequate" className="text-green-700">
                Adequate ({adequateStockProducts.length})
              </TabsTrigger>
              <TabsTrigger value="high" className="text-blue-700">
                High ({highStockProducts.length})
              </TabsTrigger>
            </TabsList>

            {[
              { value: 'all', products: filteredProducts },
              { value: 'out-of-stock', products: outOfStockProducts },
              { value: 'low', products: lowStockProducts },
              { value: 'adequate', products: adequateStockProducts },
              { value: 'high', products: highStockProducts },
            ].map(({ value, products: tabProducts }) => (
              <TabsContent key={value} value={value}>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Stock Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead className="text-center">Produced</TableHead>
                        <TableHead className="text-center">Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Turnover</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No products found
                          </TableCell>
                        </TableRow>
                      ) : (
                        tabProducts.map(product => (
                          <ProductRow key={product.id} product={product} />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
