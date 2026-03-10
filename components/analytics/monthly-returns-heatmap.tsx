'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface MonthlyReturnsHeatmapProps {
  data: Record<string, number>
}

export function MonthlyReturnsHeatmap({ data }: MonthlyReturnsHeatmapProps) {
  const getColor = (value: number) => {
    if (value > 0.05) return 'bg-green-600'
    if (value > 0.02) return 'bg-green-400'
    if (value > 0) return 'bg-green-200'
    if (value > -0.02) return 'bg-red-200'
    if (value > -0.05) return 'bg-red-400'
    return 'bg-red-600'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Returns</CardTitle>
        <CardDescription>Performance by month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(data).map(([month, ret]) => (
            <div key={month} className="flex flex-col items-center gap-1">
              <div className={`w-full h-12 rounded ${getColor(ret)} flex items-center justify-center text-xs font-semibold text-white`}>
                {(ret * 100).toFixed(1)}%
              </div>
              <span className="text-xs text-muted-foreground">{month}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
