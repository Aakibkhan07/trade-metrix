'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TradingStats {
  openPositions: number
  closedPositions: number
  openPNL: number
  closedPNL: number
  totalPNL: number
  winRate: number
  winningTrades: number
}

interface StatItem {
  label: string
  value: string | number
  subtext?: string
  highlight?: boolean
  color?: string
}

interface TradingDashboardProps {
  stats?: TradingStats
}

export function TradingDashboard({ stats }: TradingDashboardProps) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading statistics...</p>
        </CardContent>
      </Card>
    )
  }

  const statItems: StatItem[] = [
    {
      label: 'Open Positions',
      value: stats.openPositions,
      color: 'text-blue-600',
    },
    {
      label: 'Closed Trades',
      value: stats.closedPositions,
      color: 'text-gray-600',
    },
    {
      label: 'Open P&L',
      value: `₹${stats.openPNL.toFixed(2)}`,
      highlight: stats.openPNL > 0,
      color: stats.openPNL > 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Closed P&L',
      value: `₹${stats.closedPNL.toFixed(2)}`,
      highlight: stats.closedPNL > 0,
      color: stats.closedPNL > 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Total P&L',
      value: `₹${stats.totalPNL.toFixed(2)}`,
      highlight: stats.totalPNL > 0,
      color: stats.totalPNL > 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      subtext: `${stats.winningTrades} wins`,
      color: 'text-purple-600',
    },
  ]

  const chartData = [
    {
      name: 'Open',
      P_L: stats.openPNL,
    },
    {
      name: 'Closed',
      P_L: stats.closedPNL,
    },
    {
      name: 'Total',
      P_L: stats.totalPNL,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statItems.map((item, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              {item.subtext && <p className="text-xs text-muted-foreground mt-1">{item.subtext}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>P&L Overview</CardTitle>
          <CardDescription>Profit and Loss Analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => `₹${(value as number).toFixed(2)}`}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="P_L" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
