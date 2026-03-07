'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { PerformanceChart } from '@/components/analytics/performance-chart'
import { DrawdownChart } from '@/components/analytics/drawdown-chart'
import { MonthlyReturnsHeatmap } from '@/components/analytics/monthly-returns-heatmap'
import { MetricsSummary } from '@/components/analytics/metrics-summary'
import type { BacktestResult } from '@/lib/backtesting/types'

interface BacktestPageProps {
  params: { id: string }
}

export default function BacktestResultPage({ params }: BacktestPageProps) {
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchResult()
  }, [])

  async function fetchResult() {
    try {
      setLoading(true)
      const res = await fetch(`/api/backtest/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch backtest')
      const data = await res.json()
      setResult(data)
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

  if (!result) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Backtest not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <Link href="/dashboard/analytics">
        <Button variant="outline" size="sm">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Analytics
        </Button>
      </Link>

      <div>
        <h1 className="text-4xl font-bold">
          {result.config.symbol} Backtest Results
        </h1>
        <p className="text-muted-foreground mt-2">
          {new Date(result.config.startDate).toLocaleDateString()} to {new Date(result.config.endDate).toLocaleDateString()}
        </p>
      </div>

      {result.result && (
        <>
          <MetricsSummary metrics={result.result.metrics} />

          <div className="grid gap-4 lg:grid-cols-2">
            <PerformanceChart data={result.result.data.equityCurve} />
            <DrawdownChart data={result.result.data.drawdownCurve} />
          </div>

          {Object.keys(result.result.data.monthlyReturns).length > 0 && (
            <MonthlyReturnsHeatmap data={result.result.data.monthlyReturns} />
          )}

          {/* Trades Table */}
          <Card>
            <CardHeader>
              <CardTitle>Trades ({result.result.data.trades.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Entry Date</th>
                      <th className="text-left py-2">Entry Price</th>
                      <th className="text-left py-2">Exit Price</th>
                      <th className="text-left py-2">P&L</th>
                      <th className="text-left py-2">Return %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.result.data.trades.slice(0, 10).map((trade, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{new Date(trade.entryTime).toLocaleDateString()}</td>
                        <td className="py-2">₹{trade.entryPrice.toFixed(2)}</td>
                        <td className="py-2">₹{trade.exitPrice.toFixed(2)}</td>
                        <td className={`py-2 font-semibold ${trade.pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{trade.pnl.toFixed(2)}
                        </td>
                        <td className={`py-2 font-semibold ${trade.pnlPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trade.pnlPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
