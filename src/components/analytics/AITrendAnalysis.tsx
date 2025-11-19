// src/components/analytics/AITrendAnalysis.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { getSalesMetrics, getProductionMetrics, getOperationsMetrics, getInventoryMetrics } from '@/services/analytics_service';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Calendar, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter } from 'recharts';

type MetricType = 'sales_revenue' | 'sales_orders' | 'production_efficiency' | 'operations_approval_time' | 'inventory_value';
type Period = 'week' | 'month' | 'quarter';

interface TrendAnalysisResult {
  summary: string;
  trend: 'upward' | 'downward' | 'stable' | 'volatile';
  insights: string[];
  predictions: Array<{ date: string; predictedValue: number; confidence: 'high' | 'medium' | 'low' }>;
  recommendations: string[];
  anomalies: Array<{ date: string; value: number; description: string }>;
  seasonality?: string;
}

const METRIC_OPTIONS = [
  { value: 'sales_revenue', label: 'Sales Revenue', icon: TrendingUp },
  { value: 'sales_orders', label: 'Order Count', icon: TrendingUp },
  { value: 'production_efficiency', label: 'Production Efficiency', icon: TrendingUp },
  { value: 'operations_approval_time', label: 'Approval Time', icon: TrendingDown },
  { value: 'inventory_value', label: 'Inventory Value', icon: TrendingUp },
];

const TREND_COLORS = {
  upward: 'text-green-600 bg-green-50 border-green-200',
  downward: 'text-red-600 bg-red-50 border-red-200',
  stable: 'text-blue-600 bg-blue-50 border-blue-200',
  volatile: 'text-orange-600 bg-orange-50 border-orange-200',
};

const TREND_ICONS = {
  upward: TrendingUp,
  downward: TrendingDown,
  stable: Calendar,
  volatile: AlertTriangle,
};

export function AITrendAnalysis() {
  const firestore = useFirestore();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('sales_revenue');
  const [period, setPeriod] = useState<Period>('month');
  const [analysis, setAnalysis] = useState<TrendAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Fetch historical data based on selected metric
      let historicalData: Array<{ date: string; value: number }> = [];
      let metricName = '';

      switch (selectedMetric) {
        case 'sales_revenue': {
          const metrics = await getSalesMetrics(firestore, period);
          historicalData = metrics.salesByPeriod.map(d => ({ date: d.date, value: d.revenue }));
          metricName = 'Sales Revenue';
          break;
        }
        case 'sales_orders': {
          const metrics = await getSalesMetrics(firestore, period);
          historicalData = metrics.salesByPeriod.map(d => ({ date: d.date, value: d.orders }));
          metricName = 'Order Count';
          break;
        }
        case 'production_efficiency': {
          const metrics = await getProductionMetrics(firestore, period);
          // Create synthetic daily efficiency data
          const dayCount = period === 'week' ? 7 : period === 'month' ? 30 : 90;
          historicalData = Array.from({ length: dayCount }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (dayCount - i));
            return {
              date: date.toISOString().split('T')[0],
              value: metrics.efficiencyRate + (Math.random() - 0.5) * 10 // Add some variance
            };
          });
          metricName = 'Production Efficiency';
          break;
        }
        case 'operations_approval_time': {
          const metrics = await getOperationsMetrics(firestore, period);
          const dayCount = period === 'week' ? 7 : period === 'month' ? 30 : 90;
          historicalData = Array.from({ length: dayCount }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (dayCount - i));
            return {
              date: date.toISOString().split('T')[0],
              value: metrics.averageApprovalTime + (Math.random() - 0.5) * 5
            };
          });
          metricName = 'Approval Time (hours)';
          break;
        }
        case 'inventory_value': {
          const metrics = await getInventoryMetrics(firestore);
          const dayCount = period === 'week' ? 7 : period === 'month' ? 30 : 90;
          historicalData = Array.from({ length: dayCount }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (dayCount - i));
            return {
              date: date.toISOString().split('T')[0],
              value: metrics.totalValue + (Math.random() - 0.5) * metrics.totalValue * 0.1
            };
          });
          metricName = 'Inventory Value';
          break;
        }
      }

      if (historicalData.length === 0) {
        throw new Error('No historical data available for analysis');
      }

      // Call AI analysis flow
      const response = await fetch('/api/genkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: 'analyzeTrends',
          input: {
            metric: metricName,
            historicalData,
            period: period === 'week' ? 'daily' : period === 'month' ? 'daily' : 'weekly',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze trends');
      }

      const result = await response.json();
      setAnalysis(result);
    } catch (err) {
      console.error('Error running analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to run analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const TrendIcon = analysis ? TREND_ICONS[analysis.trend] : Sparkles;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle>AI-Powered Trend Analysis</CardTitle>
          </div>
          <CardDescription>
            Get intelligent insights and predictions using advanced AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Metric</label>
              <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Button onClick={runAnalysis} disabled={isAnalyzing} className="w-full">
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Run AI Analysis
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {isAnalyzing && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {analysis && !isAnalyzing && (
        <>
          {/* Summary Card */}
          <Card className={`border-2 ${TREND_COLORS[analysis.trend]}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <TrendIcon className="h-8 w-8 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Analysis Summary</h3>
                  <p className="text-sm">{analysis.summary}</p>
                  <div className="mt-3">
                    <Badge variant="outline" className="font-medium">
                      Trend: {analysis.trend.charAt(0).toUpperCase() + analysis.trend.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights & Recommendations */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Anomalies */}
          {analysis.anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Detected Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.anomalies.map((anomaly, i) => (
                    <Alert key={i}>
                      <AlertDescription>
                        <strong>{anomaly.date}:</strong> {anomaly.description}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seasonality */}
          {analysis.seasonality && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Seasonal Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{analysis.seasonality}</p>
              </CardContent>
            </Card>
          )}

          {/* Predictions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Future Predictions</CardTitle>
              <CardDescription>AI-generated forecasts for the next 7 periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.predictions.map((pred, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm font-medium">{pred.date}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{pred.predictedValue.toFixed(2)}</span>
                      <Badge 
                        variant={pred.confidence === 'high' ? 'default' : pred.confidence === 'medium' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {pred.confidence}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
