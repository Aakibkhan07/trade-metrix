'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DrawdownChartProps {
  data: Array<{ date: Date; value: number }>
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString(),
    value: d.value,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawdown</CardTitle>
        <CardDescription>Peak-to-trough portfolio decline</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
            <Area type="monotone" dataKey="value" fill="#ef4444" stroke="#dc2626" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
