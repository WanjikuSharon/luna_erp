// src/components/analytics/AnalyticsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { 
  getAllDashboardMetrics, 
  type DashboardMetrics,
  calculateTrend,
  type TrendData
} from '@/services/analytics_service';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Factory, 
  ClipboardList,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
}

function MetricCard({ title, value, change, icon, trend }: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend || trend === 'stable') return 'text-muted-foreground';
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return null;
    return trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{change.toFixed(1)}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const firestore = useFirestore();
  const [period, setPeriod] = useState<PeriodType>('month');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMetrics = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getAllDashboardMetrics(firestore, period);
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [period, firestore]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (isLoading) {
    return <LoadingDashboard />;
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate trends
  const salesTrend = calculateTrend(
    metrics.sales.salesByPeriod.map(d => ({ date: d.date, value: d.revenue }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => loadMetrics(true)} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.sales.totalRevenue)}
          change={metrics.sales.growthRate}
          trend={metrics.sales.growthRate > 0 ? 'up' : metrics.sales.growthRate < 0 ? 'down' : 'stable'}
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
        />
        <MetricCard
          title="Total Orders"
          value={formatNumber(metrics.sales.totalOrders)}
          icon={<ClipboardList className="h-5 w-5 text-muted-foreground" />}
        />
        <MetricCard
          title="Inventory Value"
          value={formatCurrency(metrics.inventory.totalValue)}
          icon={<Package className="h-5 w-5 text-muted-foreground" />}
        />
        <MetricCard
          title="Production Efficiency"
          value={`${metrics.production.efficiencyRate.toFixed(1)}%`}
          icon={<Factory className="h-5 w-5 text-muted-foreground" />}
        />
      </div>

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Sales Analytics */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>Daily sales performance with predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={[...salesTrend.historical, ...salesTrend.prediction]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenue']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                      name="Actual Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  {salesTrend.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : salesTrend.trend === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : null}
                  <span className={salesTrend.trend === 'up' ? 'text-green-600' : salesTrend.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}>
                    {Math.abs(salesTrend.changePercentage).toFixed(1)}% {salesTrend.trend === 'up' ? 'increase' : salesTrend.trend === 'down' ? 'decrease' : 'no change'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best selling products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.sales.topProducts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="productName" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Metrics Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Order Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.sales.averageOrderValue)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{formatNumber(metrics.sales.totalOrders)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                  <p className="text-2xl font-bold">{metrics.sales.growthRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Analytics */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
                <CardDescription>Value distribution across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.inventory.materialsByCategory}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => entry.category}
                    >
                      {metrics.inventory.materialsByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock Status</CardTitle>
                <CardDescription>Current inventory health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Materials</span>
                    <span className="text-2xl font-bold">{metrics.inventory.totalMaterials}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-600">Low Stock Items</span>
                    <span className="text-2xl font-bold text-yellow-600">{metrics.inventory.lowStockItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-600">Out of Stock</span>
                    <span className="text-2xl font-bold text-red-600">{metrics.inventory.outOfStockItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Value</span>
                    <span className="text-2xl font-bold">{formatCurrency(metrics.inventory.totalValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {metrics.inventory.reorderNeeded.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reorder Alerts</CardTitle>
                <CardDescription>Materials that need to be restocked</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.inventory.reorderNeeded.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-2">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-sm text-muted-foreground">
                        Current: {item.currentStock} | Reorder Point: {item.reorderPoint}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Production Analytics */}
        <TabsContent value="production" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Production by Product</CardTitle>
                <CardDescription>Total quantities produced</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.production.productionByProduct}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="productName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#10b981" name="Quantity Produced" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production Metrics</CardTitle>
                <CardDescription>Performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Batches</span>
                    <span className="text-2xl font-bold">{metrics.production.totalBatches}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Completed</span>
                    <span className="text-2xl font-bold text-green-600">{metrics.production.completedBatches}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600">In Progress</span>
                    <span className="text-2xl font-bold text-blue-600">{metrics.production.inProgressBatches}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Efficiency Rate</span>
                    <span className="text-2xl font-bold">{metrics.production.efficiencyRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg. Completion Time</span>
                    <span className="text-2xl font-bold">{metrics.production.averageCompletionTime.toFixed(1)}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Analytics */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request Status</CardTitle>
                <CardDescription>Material request distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending', value: metrics.operations.pendingRequests },
                        { name: 'Approved', value: metrics.operations.approvedRequests },
                        { name: 'Delivered', value: metrics.operations.deliveredRequests },
                        { name: 'Rejected', value: metrics.operations.rejectedRequests },
                      ].filter(item => item.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {[COLORS[3], COLORS[0], COLORS[1], COLORS[2]].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Vendors</CardTitle>
                <CardDescription>Requests by vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.operations.requestsByVendor}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="vendorName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Operations Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{metrics.operations.totalRequests}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Approval Time</p>
                  <p className="text-2xl font-bold">{metrics.operations.averageApprovalTime.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{metrics.operations.pendingRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
