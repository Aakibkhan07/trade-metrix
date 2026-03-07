'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Activity, BarChart3, MoreHorizontal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { MarketDataWidget } from '@/components/streaming/market-data-widget'
import { LiveOrderTracker } from '@/components/streaming/live-order-tracker'
import { LivePositionPanel } from '@/components/streaming/live-position-panel'
import { ConnectionStatusIndicator } from '@/components/streaming/connection-status-indicator'

interface DashboardStats {
  strategies: any[]
  orders: any[]
  positions: any[]
  stats: {
    openPositions: number
    closedPositions: number
    openPNL: number
    closedPNL: number
    totalPNL: number
    winRate: number
    winningTrades: number
  }
  brokerAccount?: {
    id: string
    broker_type: string
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const [strategiesRes, ordersRes, positionsRes, statsRes] = await Promise.all([
        fetch('/api/strategies'),
        fetch('/api/orders'),
        fetch('/api/positions'),
        fetch('/api/positions/stats'),
      ])

      if (!strategiesRes.ok || !ordersRes.ok || !positionsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const strategies = await strategiesRes.json()
      const orders = await ordersRes.json()
      const positions = await positionsRes.json()
      const stats = await statsRes.json()

      setData({
        strategies,
        orders,
        positions,
        stats,
        brokerAccount: {
          id: 'default_broker',
          broker_type: 'paper',
        },
      })
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

  const activeStrategies = data?.strategies.filter((s) => s.status === 'active') || []
  const pendingOrders = data?.orders.filter((o) => o.status === 'pending') || []
  const executedOrders = data?.orders.filter((o) => o.status === 'executed') || []

  // Sample chart data
  const chartData = [
    { date: 'Mon', value: data?.stats.totalPNL || 0 },
    { date: 'Tue', value: (data?.stats.totalPNL || 0) * 1.1 },
    { date: 'Wed', value: (data?.stats.totalPNL || 0) * 0.9 },
    { date: 'Thu', value: (data?.stats.totalPNL || 0) * 1.2 },
    { date: 'Fri', value: (data?.stats.totalPNL || 0) * 1.05 },
  ]

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Trade Metrix Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's your trading overview</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatusIndicator connected={true} label="Streaming" />
          <Link href="/dashboard/brokers">
            <Button size="lg">Connect Broker</Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">{activeStrategies.length}</div>
                <p className="text-xs text-muted-foreground">of {data?.strategies.length} total</p>
              </div>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">{data?.stats.openPositions}</div>
                <p className="text-xs text-muted-foreground">Active trades</p>
              </div>
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className={`text-2xl font-bold ${(data?.stats.totalPNL || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{(data?.stats.totalPNL || 0).toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground">{data?.stats.winRate.toFixed(1)}% win rate</p>
              </div>
              {(data?.stats.totalPNL || 0) > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Orders Executed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">{executedOrders.length}</div>
                <p className="text-xs text-muted-foreground">{pendingOrders.length} pending</p>
              </div>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Streaming Section */}
      {data?.brokerAccount && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MarketDataWidget
            brokerAccountId={data.brokerAccount.id}
            brokerType={data.brokerAccount.broker_type}
            symbols={['INFY', 'TCS', 'RELIANCE']}
          />
          <LiveOrderTracker
            brokerAccountId={data.brokerAccount.id}
            brokerType={data.brokerAccount.broker_type}
          />
          <LivePositionPanel
            brokerAccountId={data.brokerAccount.id}
            brokerType={data.brokerAccount.broker_type}
          />
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* P&L Chart */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>P&L Trend</CardTitle>
                <CardDescription>Last 5 trading days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value.toFixed(0)}`} />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/dashboard/strategies">
                  <Button variant="outline" className="w-full justify-start">
                    New Strategy
                  </Button>
                </Link>
                <Link href="/dashboard/orders">
                  <Button variant="outline" className="w-full justify-start">
                    Place Order
                  </Button>
                </Link>
                <Link href="/dashboard/positions">
                  <Button variant="outline" className="w-full justify-start">
                    View Positions
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start" disabled>
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Strategies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.strategies.slice(0, 3).length ? (
                  <div className="space-y-3">
                    {data?.strategies.slice(0, 3).map((strategy) => (
                      <div key={strategy.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div>
                          <p className="font-semibold text-sm">{strategy.name}</p>
                          <p className="text-xs text-muted-foreground">{strategy.strategy_type}</p>
                        </div>
                        <Badge
                          className={strategy.status === 'active' ? 'bg-green-500/10 text-green-700' : 'bg-gray-500/10 text-gray-700'}
                        >
                          {strategy.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No strategies yet</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.orders.slice(0, 3).length ? (
                  <div className="space-y-3">
                    {data?.orders.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div>
                          <p className="font-semibold text-sm">{order.symbol}</p>
                          <p className="text-xs text-muted-foreground">{order.order_type.toUpperCase()} • {order.quantity} units</p>
                        </div>
                        <Badge
                          className={
                            order.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-700'
                              : order.status === 'executed'
                                ? 'bg-green-500/10 text-green-700'
                                : 'bg-red-500/10 text-red-700'
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No orders yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategies">
          <Link href="/dashboard/strategies">
            <Button>Manage Strategies</Button>
          </Link>
        </TabsContent>

        <TabsContent value="orders">
          <Link href="/dashboard/orders">
            <Button>Manage Orders</Button>
          </Link>
        </TabsContent>

        <TabsContent value="positions">
          <Link href="/dashboard/positions">
            <Button>Manage Positions</Button>
          </Link>
        </TabsContent>
      </Tabs>
    </div>
  )
}
