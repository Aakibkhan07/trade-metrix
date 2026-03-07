'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface BacktestConfig {
  strategyId: string
  symbol: string
  exchange: string
  startDate: string
  endDate: string
  initialCapital: number
  riskPercentage: number
  slippage: number
  commissionPercentage: number
  entryConditions: { rsiThreshold?: number }
  exitConditions: { rsiThreshold?: number }
  stopLossPercentage?: number
  takeProfitPercentage?: number
}

export default function BacktestPage() {
  const [config, setConfig] = useState<BacktestConfig>({
    strategyId: '1',
    symbol: 'INFY',
    exchange: 'NSE',
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 100000,
    riskPercentage: 2,
    slippage: 0.05,
    commissionPercentage: 0.05,
    entryConditions: { rsiThreshold: 30 },
    exitConditions: { rsiThreshold: 70 },
    stopLossPercentage: 5,
    takeProfitPercentage: 10,
  })

  const [loading, setLoading] = useState(false)
  const [backTestId, setBackTestId] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleRunBacktest() {
    try {
      setLoading(true)
      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) throw new Error('Failed to start backtest')
      const data = await res.json()
      
      setBackTestId(data.id)
      toast({ title: 'Success', description: 'Backtest started successfully' })

      // Poll for completion
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/backtest/${data.id}`)
        const statusData = await statusRes.json()
        if (statusData.status === 'completed') {
          clearInterval(pollInterval)
          setLoading(false)
          window.location.href = `/dashboard/analytics`
        }
      }, 2000)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Run Backtest</h1>
        <p className="text-muted-foreground mt-2">Test your strategy on historical data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backtest Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={config.symbol}
                onChange={e => setConfig({ ...config, symbol: e.target.value })}
                placeholder="e.g., INFY"
              />
            </div>

            <div>
              <Label htmlFor="exchange">Exchange</Label>
              <Input
                id="exchange"
                value={config.exchange}
                onChange={e => setConfig({ ...config, exchange: e.target.value })}
                placeholder="e.g., NSE"
              />
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={config.startDate}
                onChange={e => setConfig({ ...config, startDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={config.endDate}
                onChange={e => setConfig({ ...config, endDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="capital">Initial Capital (₹)</Label>
              <Input
                id="capital"
                type="number"
                value={config.initialCapital}
                onChange={e => setConfig({ ...config, initialCapital: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="risk">Risk per Trade (%)</Label>
              <Input
                id="risk"
                type="number"
                step="0.1"
                value={config.riskPercentage}
                onChange={e => setConfig({ ...config, riskPercentage: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="slippage">Slippage (%)</Label>
              <Input
                id="slippage"
                type="number"
                step="0.01"
                value={config.slippage}
                onChange={e => setConfig({ ...config, slippage: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="commission">Commission (%)</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={config.commissionPercentage}
                onChange={e => setConfig({ ...config, commissionPercentage: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="sl">Stop Loss (%)</Label>
              <Input
                id="sl"
                type="number"
                step="0.1"
                value={config.stopLossPercentage || ''}
                onChange={e => setConfig({ ...config, stopLossPercentage: parseFloat(e.target.value) || undefined })}
              />
            </div>

            <div>
              <Label htmlFor="tp">Take Profit (%)</Label>
              <Input
                id="tp"
                type="number"
                step="0.1"
                value={config.takeProfitPercentage || ''}
                onChange={e => setConfig({ ...config, takeProfitPercentage: parseFloat(e.target.value) || undefined })}
              />
            </div>
          </div>

          <Button onClick={handleRunBacktest} disabled={loading} className="w-full" size="lg">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Running Backtest...' : 'Run Backtest'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
