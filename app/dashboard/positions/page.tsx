'use client'

import { useEffect, useState } from 'react'
import { PositionTracker } from '@/components/trading/position-tracker'
import { TradingDashboard } from '@/components/trading/trading-dashboard'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TradingStats {
  openPositions: number
  closedPositions: number
  openPNL: number
  closedPNL: number
  totalPNL: number
  winRate: number
  winningTrades: number
}

export default function PositionsPage() {
  const [positions, setPositions] = useState([])
  const [stats, setStats] = useState<TradingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError('')

      const [positionsRes, statsRes] = await Promise.all([
        fetch('/api/positions'),
        fetch('/api/positions/stats'),
      ])

      if (!positionsRes.ok || !statsRes.ok) throw new Error('Failed to fetch data')

      const positionsData = await positionsRes.json()
      const statsData = await statsRes.json()

      setPositions(positionsData)
      setStats(statsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleClosePosition(id: string, exitPrice: number) {
    try {
      const response = await fetch(`/api/positions/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exitPrice }),
      })
      if (!response.ok) throw new Error('Failed to close position')
      toast({ title: 'Position closed successfully' })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Positions & Performance</h1>
        <p className="text-muted-foreground">Track your open positions and trading performance</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <TradingDashboard stats={stats || undefined} />
          <PositionTracker positions={positions} onClose={handleClosePosition} />
        </>
      )}
    </div>
  )
}
