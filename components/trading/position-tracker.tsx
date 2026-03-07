'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, X } from 'lucide-react'

interface Position {
  id: string
  symbol: string
  order_type: 'buy' | 'sell'
  quantity: number
  entry_price: number
  stop_loss: number
  take_profit: number
  status: string
  entry_time: string
  pnl?: number
  pnl_percent?: number
}

interface PositionTrackerProps {
  positions: Position[]
  onClose?: (id: string, exitPrice: number) => void
}

export function PositionTracker({ positions, onClose }: PositionTrackerProps) {
  const getPNLColor = (pnl?: number) => {
    if (!pnl) return 'text-muted-foreground'
    return pnl > 0 ? 'text-green-600' : 'text-red-600'
  }

  const getTypeIcon = (type: string) => {
    return type === 'buy' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No open positions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
        <CardDescription>{positions.length} active position(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Stop Loss</TableHead>
                <TableHead>Take Profit</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-semibold">{position.symbol}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    {getTypeIcon(position.order_type)}
                    {position.order_type.toUpperCase()}
                  </TableCell>
                  <TableCell>{position.quantity}</TableCell>
                  <TableCell>₹{position.entry_price.toFixed(2)}</TableCell>
                  <TableCell>₹{position.stop_loss.toFixed(2)}</TableCell>
                  <TableCell>₹{position.take_profit.toFixed(2)}</TableCell>
                  <TableCell className={getPNLColor(position.pnl)}>
                    <div>
                      <p className="font-semibold">₹{position.pnl?.toFixed(2) || '-'}</p>
                      <p className="text-xs">{position.pnl_percent?.toFixed(2)}%</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const exitPrice = prompt('Enter exit price:')
                        if (exitPrice) {
                          onClose?.(position.id, parseFloat(exitPrice))
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
