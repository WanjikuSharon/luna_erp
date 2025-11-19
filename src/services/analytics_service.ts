// src/services/analytics_service.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  limit,
  Firestore
} from 'firebase/firestore';
import { COLLECTIONS } from './inventory_service';

// Types for analytics data
export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{ productId: string; productName: string; quantity: number; revenue: number }>;
  salesByPeriod: Array<{ date: string; revenue: number; orders: number }>;
  growthRate: number;
}

export interface InventoryMetrics {
  totalMaterials: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  materialsByCategory: Array<{ category: string; count: number; value: number }>;
  reorderNeeded: Array<{ id: string; name: string; currentStock: number; reorderPoint: number }>;
}

export interface ProductionMetrics {
  totalBatches: number;
  completedBatches: number;
  inProgressBatches: number;
  averageCompletionTime: number;
  productionByProduct: Array<{ productName: string; quantity: number; batches: number }>;
  efficiencyRate: number;
}

export interface OperationsMetrics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  deliveredRequests: number;
  averageApprovalTime: number;
  requestsByVendor: Array<{ vendorId: string; vendorName: string; count: number }>;
}

export interface DashboardMetrics {
  sales: SalesMetrics;
  inventory: InventoryMetrics;
  production: ProductionMetrics;
  operations: OperationsMetrics;
  timestamp: Date;
}

export interface TrendData {
  metric: string;
  historical: Array<{ date: string; value: number }>;
  prediction: Array<{ date: string; value: number; confidence: number }>;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
}

// Helper function to get date range
export function getDateRange(period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom', customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  const end = customEnd || now;
  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      start = customStart || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

// Sales Analytics
export async function getSalesMetrics(
  firestore: Firestore,
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom',
  customStart?: Date,
  customEnd?: Date
): Promise<SalesMetrics> {
  const { start, end } = getDateRange(period, customStart, customEnd);
  
  try {
    // Fetch sales ledger entries
    const ledgerRef = collection(firestore, COLLECTIONS.SALES_LEDGER);
    const q = query(
      ledgerRef,
      where('saleDate', '>=', Timestamp.fromDate(start)),
      where('saleDate', '<=', Timestamp.fromDate(end))
    );
    
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Calculate metrics
    const totalRevenue = entries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);
    const totalOrders = entries.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products
    const productMap = new Map<string, { productName: string; quantity: number; revenue: number }>();
    entries.forEach(entry => {
      entry.items?.forEach((item: any) => {
        const existing = productMap.get(item.productId) || { productName: item.productName, quantity: 0, revenue: 0 };
        productMap.set(item.productId, {
          productName: item.productName,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.subtotal
        });
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Sales by period (daily breakdown)
    const salesByDay = new Map<string, { revenue: number; orders: number }>();
    entries.forEach(entry => {
      const dateKey = entry.saleDate?.toDate?.()?.toISOString().split('T')[0] || 'unknown';
      const existing = salesByDay.get(dateKey) || { revenue: 0, orders: 0 };
      salesByDay.set(dateKey, {
        revenue: existing.revenue + (entry.totalAmount || 0),
        orders: existing.orders + 1
      });
    });

    const salesByPeriod = Array.from(salesByDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate growth rate (compare to previous period)
    const periodLength = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = start;
    
    const prevQuery = query(
      ledgerRef,
      where('saleDate', '>=', Timestamp.fromDate(previousStart)),
      where('saleDate', '<', Timestamp.fromDate(previousEnd))
    );
    const prevSnapshot = await getDocs(prevQuery);
    const previousRevenue = prevSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
    
    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topProducts,
      salesByPeriod,
      growthRate
    };
  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    throw error;
  }
}

// Inventory Analytics
export async function getInventoryMetrics(firestore: Firestore): Promise<InventoryMetrics> {
  try {
    const materialsRef = collection(firestore, COLLECTIONS.RAW_MATERIALS);
    const snapshot = await getDocs(materialsRef);
    const materials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    const totalMaterials = materials.length;
    const lowStockItems = materials.filter(m => m.quantity <= m.reorderPoint && m.quantity > 0).length;
    const outOfStockItems = materials.filter(m => m.quantity === 0).length;
    const totalValue = materials.reduce((sum, m) => sum + (m.quantity * m.unitCost || 0), 0);

    // Materials by category
    const categoryMap = new Map<string, { count: number; value: number }>();
    materials.forEach(material => {
      const category = material.category || 'Uncategorized';
      const existing = categoryMap.get(category) || { count: 0, value: 0 };
      categoryMap.set(category, {
        count: existing.count + 1,
        value: existing.value + (material.quantity * material.unitCost || 0)
      });
    });

    const materialsByCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.value - a.value);

    // Reorder needed
    const reorderNeeded = materials
      .filter(m => m.quantity <= m.reorderPoint)
      .map(m => ({
        id: m.id,
        name: m.name,
        currentStock: m.quantity,
        reorderPoint: m.reorderPoint
      }))
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 10);

    return {
      totalMaterials,
      lowStockItems,
      outOfStockItems,
      totalValue,
      materialsByCategory,
      reorderNeeded
    };
  } catch (error) {
    console.error('Error fetching inventory metrics:', error);
    throw error;
  }
}

// Production Analytics
export async function getProductionMetrics(
  firestore: Firestore,
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom',
  customStart?: Date,
  customEnd?: Date
): Promise<ProductionMetrics> {
  const { start, end } = getDateRange(period, customStart, customEnd);
  
  try {
    const batchesRef = collection(firestore, COLLECTIONS.PRODUCTION_BATCHES);
    const q = query(
      batchesRef,
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );
    
    const snapshot = await getDocs(q);
    const batches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    const totalBatches = batches.length;
    const completedBatches = batches.filter(b => b.status === 'completed').length;
    const inProgressBatches = batches.filter(b => b.status === 'in_progress').length;

    // Calculate average completion time
    const completedWithTimes = batches.filter(b => b.status === 'completed' && b.completedAt && b.createdAt);
    const totalCompletionTime = completedWithTimes.reduce((sum, batch) => {
      const start = batch.createdAt?.toDate?.()?.getTime() || 0;
      const end = batch.completedAt?.toDate?.()?.getTime() || 0;
      return sum + (end - start);
    }, 0);
    const averageCompletionTime = completedWithTimes.length > 0 
      ? totalCompletionTime / completedWithTimes.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    // Production by product
    const productMap = new Map<string, { quantity: number; batches: number }>();
    batches.forEach(batch => {
      const productName = batch.productName || 'Unknown';
      const existing = productMap.get(productName) || { quantity: 0, batches: 0 };
      productMap.set(productName, {
        quantity: existing.quantity + (batch.quantityProduced || 0),
        batches: existing.batches + 1
      });
    });

    const productionByProduct = Array.from(productMap.entries())
      .map(([productName, data]) => ({ productName, ...data }))
      .sort((a, b) => b.quantity - a.quantity);

    // Efficiency rate (completed vs total)
    const efficiencyRate = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0;

    return {
      totalBatches,
      completedBatches,
      inProgressBatches,
      averageCompletionTime,
      productionByProduct,
      efficiencyRate
    };
  } catch (error) {
    console.error('Error fetching production metrics:', error);
    throw error;
  }
}

// Operations Analytics
export async function getOperationsMetrics(
  firestore: Firestore,
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom',
  customStart?: Date,
  customEnd?: Date
): Promise<OperationsMetrics> {
  const { start, end } = getDateRange(period, customStart, customEnd);
  
  try {
    const requestsRef = collection(firestore, COLLECTIONS.REQUESTS);
    const q = query(
      requestsRef,
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );
    
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const approvedRequests = requests.filter(r => r.status === 'approved').length;
    const rejectedRequests = requests.filter(r => r.status === 'rejected').length;
    const deliveredRequests = requests.filter(r => r.status === 'delivered').length;

    // Average approval time
    const approvedWithTimes = requests.filter(r => (r.status === 'approved' || r.status === 'delivered') && r.approvedAt && r.createdAt);
    const totalApprovalTime = approvedWithTimes.reduce((sum, req) => {
      const start = req.createdAt?.toDate?.()?.getTime() || 0;
      const end = req.approvedAt?.toDate?.()?.getTime() || 0;
      return sum + (end - start);
    }, 0);
    const averageApprovalTime = approvedWithTimes.length > 0 
      ? totalApprovalTime / approvedWithTimes.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    // Fetch vendor names
    const vendorsRef = collection(firestore, COLLECTIONS.VENDORS);
    const vendorsSnapshot = await getDocs(vendorsRef);
    const vendorMap = new Map(vendorsSnapshot.docs.map(doc => [doc.id, doc.data().name]));

    // Requests by vendor
    const vendorRequestMap = new Map<string, number>();
    requests.forEach(req => {
      const vendorId = req.vendorId || 'unknown';
      vendorRequestMap.set(vendorId, (vendorRequestMap.get(vendorId) || 0) + 1);
    });

    const requestsByVendor = Array.from(vendorRequestMap.entries())
      .map(([vendorId, count]) => ({
        vendorId,
        vendorName: vendorMap.get(vendorId) || 'Unknown Vendor',
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      deliveredRequests,
      averageApprovalTime,
      requestsByVendor
    };
  } catch (error) {
    console.error('Error fetching operations metrics:', error);
    throw error;
  }
}

// Get all dashboard metrics
export async function getAllDashboardMetrics(
  firestore: Firestore,
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom' = 'month',
  customStart?: Date,
  customEnd?: Date
): Promise<DashboardMetrics> {
  try {
    const [sales, inventory, production, operations] = await Promise.all([
      getSalesMetrics(firestore, period, customStart, customEnd),
      getInventoryMetrics(firestore),
      getProductionMetrics(firestore, period, customStart, customEnd),
      getOperationsMetrics(firestore, period, customStart, customEnd)
    ]);

    return {
      sales,
      inventory,
      production,
      operations,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw error;
  }
}

// Simple trend prediction (linear regression)
export function calculateTrend(data: Array<{ date: string; value: number }>): TrendData {
  if (data.length < 2) {
    return {
      metric: 'unknown',
      historical: data,
      prediction: [],
      trend: 'stable',
      changePercentage: 0
    };
  }

  // Convert dates to numeric values (days from first date)
  const firstDate = new Date(data[0].date).getTime();
  const points = data.map((d, i) => ({
    x: (new Date(d.date).getTime() - firstDate) / (1000 * 60 * 60 * 24),
    y: d.value
  }));

  // Linear regression
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate predictions for next 7 days
  const lastX = points[points.length - 1].x;
  const prediction = Array.from({ length: 7 }, (_, i) => {
    const x = lastX + i + 1;
    const value = slope * x + intercept;
    const date = new Date(firstDate + x * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { date, value: Math.max(0, value), confidence: Math.max(0.5, 1 - (i * 0.1)) };
  });

  // Determine trend
  const firstValue = data[0].value;
  const lastValue = data[data.length - 1].value;
  const changePercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercentage) > 5) {
    trend = changePercentage > 0 ? 'up' : 'down';
  }

  return {
    metric: 'value',
    historical: data,
    prediction,
    trend,
    changePercentage
  };
}
