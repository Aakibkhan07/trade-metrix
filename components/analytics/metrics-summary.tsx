'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { BacktestMetrics } from '@/lib/backtesting/types'

interface MetricsSummaryProps {
  metrics: BacktestMetrics
}

export function MetricsSummary({ metrics }: MetricsSummaryProps) {
  const metricGroups = [
    {
      title: 'Returns',
      metrics: [
        { label: 'Total Return', value: `${metrics.totalReturnPercent.toFixed(2)}%` },
        { label: 'CAGR', value: `${(metrics.cagr * 100).toFixed(2)}%` },
        { label: 'ROI', value: `${metrics.roi.toFixed(2)}%` },
      ],
    },
    {
      title: 'Risk',
      metrics: [
        { label: 'Max Drawdown', value: `${metrics.maxDrawdownPercent.toFixed(2)}%` },
        { label: 'Daily Volatility', value: `${(metrics.dailyVolatility * 100).toFixed(2)}%` },
        { label: 'Sharpe Ratio', value: metrics.sharpeRatio.toFixed(2) },
      ],
    },
    {
      title: 'Trading',
      metrics: [
        { label: 'Total Trades', value: metrics.totalTrades },
        { label: 'Win Rate', value: `${metrics.winRate.toFixed(2)}%` },
        { label: 'Profit Factor', value: metrics.profitFactor.toFixed(2) },
      ],
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metricGroups.map(group => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="text-base">{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.metrics.map(metric => (
              <div key={metric.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{metric.label}</span>
                <span className="font-semibold">{metric.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
