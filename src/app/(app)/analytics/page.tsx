// src/app/(app)/analytics/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { CustomReportBuilder } from '@/components/analytics/CustomReportBuilder';
import { ScheduledReportsManager } from '@/components/analytics/ScheduledReportsManager';
import { AITrendAnalysis } from '@/components/analytics/AITrendAnalysis';
import { BarChart3, FileText, Calendar, Sparkles } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Analytics & Reporting</h1>
        <p className="text-muted-foreground">
          Comprehensive business intelligence, custom reports, and AI-powered insights
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="custom-reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Custom Reports
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled Reports
          </TabsTrigger>
          <TabsTrigger value="ai-trends" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="custom-reports">
          <CustomReportBuilder />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledReportsManager />
        </TabsContent>

        <TabsContent value="ai-trends">
          <AITrendAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
