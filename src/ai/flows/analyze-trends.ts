// src/ai/flows/analyze-trends.ts
import { ai } from '../genkit';
import { z } from 'zod';

const AnalyzeTrendsInputSchema = z.object({
  metric: z.string().describe('The name of the metric being analyzed (e.g., "Sales Revenue", "Inventory Turnover")'),
  historicalData: z.array(z.object({
    date: z.string().describe('Date in YYYY-MM-DD format'),
    value: z.number().describe('Numeric value for that date'),
  })).describe('Historical data points for analysis'),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).describe('Time period granularity'),
});

const AnalyzeTrendsOutputSchema = z.object({
  summary: z.string().describe('Brief executive summary of the trend analysis'),
  trend: z.enum(['upward', 'downward', 'stable', 'volatile']).describe('Overall trend direction'),
  insights: z.array(z.string()).describe('Key insights and observations from the data'),
  predictions: z.array(z.object({
    date: z.string(),
    predictedValue: z.number(),
    confidence: z.enum(['high', 'medium', 'low']),
  })).describe('Predictions for future periods'),
  recommendations: z.array(z.string()).describe('Actionable recommendations based on the analysis'),
  anomalies: z.array(z.object({
    date: z.string(),
    value: z.number(),
    description: z.string(),
  })).describe('Detected anomalies or unusual patterns'),
  seasonality: z.string().optional().describe('Description of any seasonal patterns detected'),
});

export const analyzeTrendsFlow = ai.defineFlow(
  {
    name: 'analyzeTrends',
    inputSchema: AnalyzeTrendsInputSchema,
    outputSchema: AnalyzeTrendsOutputSchema,
  },
  async (input) => {
    const { metric, historicalData, period } = input;

    // Calculate basic statistics
    const values = historicalData.map(d => d.value);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const latestValue = values[values.length - 1];
    const firstValue = values[0];
    const changePercent = ((latestValue - firstValue) / firstValue) * 100;

    // Simple trend detection
    let trendDirection: 'upward' | 'downward' | 'stable' | 'volatile';
    if (Math.abs(changePercent) < 5) {
      trendDirection = 'stable';
    } else if (changePercent > 15 || changePercent < -15) {
      // Check volatility
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgValue) * 100;
      
      if (coefficientOfVariation > 30) {
        trendDirection = 'volatile';
      } else {
        trendDirection = changePercent > 0 ? 'upward' : 'downward';
      }
    } else {
      trendDirection = changePercent > 0 ? 'upward' : 'downward';
    }

    // Detect anomalies (simple approach: values > 2 std deviations from mean)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const anomalies = historicalData
      .filter(d => Math.abs(d.value - avgValue) > 2 * stdDev)
      .map(d => ({
        date: d.date,
        value: d.value,
        description: `Value ${d.value.toFixed(2)} is ${d.value > avgValue ? 'significantly above' : 'significantly below'} the average of ${avgValue.toFixed(2)}`
      }));

    // Simple linear regression for predictions
    const n = historicalData.length;
    const sumX = historicalData.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = historicalData.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = historicalData.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate predictions for next 7 periods
    const predictions = Array.from({ length: 7 }, (_, i) => {
      const x = n + i;
      const predictedValue = Math.max(0, slope * x + intercept);
      
      // Simple confidence based on distance from last known point
      const confidence = i < 3 ? 'high' : i < 5 ? 'medium' : 'low';
      
      // Calculate future date
      const lastDate = new Date(historicalData[historicalData.length - 1].date);
      const futureDate = new Date(lastDate);
      
      if (period === 'daily') futureDate.setDate(futureDate.getDate() + i + 1);
      else if (period === 'weekly') futureDate.setDate(futureDate.getDate() + (i + 1) * 7);
      else if (period === 'monthly') futureDate.setMonth(futureDate.getMonth() + i + 1);
      else if (period === 'quarterly') futureDate.setMonth(futureDate.getMonth() + (i + 1) * 3);
      else futureDate.setFullYear(futureDate.getFullYear() + i + 1);

      return {
        date: futureDate.toISOString().split('T')[0],
        predictedValue: Math.round(predictedValue * 100) / 100,
        confidence: confidence as 'high' | 'medium' | 'low',
      };
    });

    // Generate AI insights using Gemini
    const prompt = `
You are an expert business analyst. Analyze the following ${metric} data and provide insights:

Historical Data (${period} intervals):
${historicalData.map(d => `${d.date}: ${d.value}`).join('\n')}

Statistics:
- Average: ${avgValue.toFixed(2)}
- Min: ${minValue.toFixed(2)}
- Max: ${maxValue.toFixed(2)}
- Change: ${changePercent.toFixed(2)}%
- Trend: ${trendDirection}

Provide:
1. A brief executive summary (2-3 sentences)
2. 3-5 key insights about the data
3. 3-5 actionable recommendations
4. Description of any seasonal patterns (if applicable, or null if not detected)

Be specific and data-driven.
`;

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const aiText = llmResponse.text || '';
    
    // Parse AI response (simple parsing)
    const sections = aiText.split('\n\n');
    const summary = sections[0]?.replace(/^(Executive Summary:|Summary:)/i, '').trim() || 
      `${metric} shows a ${trendDirection} trend with ${changePercent > 0 ? 'an increase' : 'a decrease'} of ${Math.abs(changePercent).toFixed(1)}% over the period.`;
    
    const insights: string[] = [];
    const recommendations: string[] = [];
    let seasonality: string | undefined;

    sections.forEach(section => {
      if (section.toLowerCase().includes('insight') || section.toLowerCase().includes('observation')) {
        const lines = section.split('\n').filter(l => l.trim() && !l.toLowerCase().includes('insight'));
        insights.push(...lines.map(l => l.replace(/^[-*•]\s*/, '').trim()).filter(l => l));
      } else if (section.toLowerCase().includes('recommendation') || section.toLowerCase().includes('action')) {
        const lines = section.split('\n').filter(l => l.trim() && !l.toLowerCase().includes('recommendation'));
        recommendations.push(...lines.map(l => l.replace(/^[-*•]\s*/, '').trim()).filter(l => l));
      } else if (section.toLowerCase().includes('seasonal') || section.toLowerCase().includes('pattern')) {
        seasonality = section.replace(/^(Seasonal Pattern:|Seasonality:)/i, '').trim();
      }
    });

    // Ensure we have at least some insights and recommendations
    if (insights.length === 0) {
      insights.push(
        `${metric} has changed by ${changePercent.toFixed(1)}% over the analyzed period`,
        `The trend is ${trendDirection} with ${anomalies.length} anomalies detected`,
        `Values range from ${minValue.toFixed(2)} to ${maxValue.toFixed(2)}`
      );
    }

    if (recommendations.length === 0) {
      if (trendDirection === 'downward') {
        recommendations.push('Investigate factors contributing to the decline', 'Consider corrective measures to reverse the trend');
      } else if (trendDirection === 'upward') {
        recommendations.push('Maintain current strategies that are driving growth', 'Plan for scaling to support continued growth');
      } else if (trendDirection === 'volatile') {
        recommendations.push('Stabilize operations to reduce variability', 'Implement better forecasting and planning');
      } else {
        recommendations.push('Monitor for changes in the stable trend', 'Optimize current operations for efficiency');
      }
    }

    return {
      summary,
      trend: trendDirection,
      insights: insights.slice(0, 5),
      predictions,
      recommendations: recommendations.slice(0, 5),
      anomalies,
      seasonality,
    };
  }
);
