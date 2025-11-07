// src/app/(app)/sales/dashboard/page.tsx
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Package } from 'lucide-react';

export default function SalesDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* --- Header --- */}
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Sales Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of sales operations and agent performance.
        </p>
      </div>

      {/* --- Quick Stats --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh 45,231</div>
            <p className="text-xs text-muted-foreground">+20.1% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2,350</div>
            <p className="text-xs text-muted-foreground">+180 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">All agents active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Agent #3</div>
            <p className="text-xs text-muted-foreground">KSh 8,420 today</p>
          </CardContent>
        </Card>
      </div>

      {/* --- Main Content --- */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Sales Portal</CardTitle>
          <CardDescription>
            Manage your sales operations, track agent performance, and reconcile daily sales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Quick Actions</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Record stock issued to agents in <strong>Stock Out</strong></li>
                <li>Track returns from agents in <strong>Stock In / Returns</strong></li>
                <li>Log daily sales totals in <strong>Daily Sales Ledger</strong></li>
                <li>Reconcile agent stock in <strong>Daily Reconciliation</strong></li>
              </ul>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Use the sidebar menu to navigate between different sales functions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
