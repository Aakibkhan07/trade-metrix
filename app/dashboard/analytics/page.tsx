'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { PerformanceChart } from '@/components/analytics/performance-chart'
import { DrawdownChart } from '@/components/analytics/drawdown-chart'
import { MonthlyReturnsHeatmap } from '@/components/analytics/monthly-returns-heatmap'
import { MetricsSummary } from '@/components/analytics/metrics-summary'
import type { BacktestResult } from '@/lib/backtesting/types'

export default function AnalyticsPage() {
  const [results, setResults] = useState<BacktestResult[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchResults()
  }, [])

  async function fetchResults() {
    try {
      setLoading(true)
      const res = await fetch('/api/backtest/results')
      if (!res.ok) throw new Error('Failed to fetch results')
      const data = await res.json()
      setResults(data)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const latestResult = results[0]

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">Strategy performance and risk analysis</p>
        </div>
        <Link href="/dashboard/backtest">
          <Button>Run New Backtest</Button>
        </Link>
      </div>

      {latestResult && latestResult.data ? (
        <>
          <MetricsSummary metrics={latestResult.data.metrics} />

          <div className="grid gap-4 lg:grid-cols-2">
            <PerformanceChart data={latestResult.data.equityCurve} />
            <DrawdownChart data={latestResult.data.drawdownCurve} />
          </div>

          {Object.keys(latestResult.data.monthlyReturns).length > 0 && (
            <MonthlyReturnsHeatmap data={latestResult.data.monthlyReturns} />
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No backtest results yet</p>
            <Link href="/dashboard/backtest">
              <Button>Start Backtesting</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Backtests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Backtests</CardTitle>
          <CardDescription>Your backtesting history</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.slice(0, 5).map(result => (
                <Link key={result.id} href={`/dashboard/backtest/${result.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <div>
                      <p className="font-semibold">{result.config.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(result.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-semibold ${result.data?.metrics.totalReturnPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.data?.metrics.totalReturnPercent.toFixed(2)}%
                        </p>
                        <p className="text-sm text-muted-foreground">{result.data?.metrics.totalTrades} trades</p>
                      </div>
                      {result.status === 'completed' ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No backtests found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
