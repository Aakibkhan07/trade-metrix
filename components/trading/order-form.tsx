'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface OrderFormProps {
  strategyId?: string
  onSubmit?: (data: any) => Promise<void>
  isLoading?: boolean
}

export function OrderForm({ strategyId, onSubmit, isLoading = false }: OrderFormProps) {
  const [formData, setFormData] = useState({
    strategy_id: strategyId || '',
    symbol: '',
    order_type: 'buy' as 'buy' | 'sell',
    quantity: 1,
    entry_price: 0,
    stop_loss: 0,
    take_profit: 0,
    broker_id: '',
  })

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.symbol.trim()) {
      setError('Symbol is required')
      return
    }

    if (!formData.entry_price || formData.entry_price <= 0) {
      setError('Valid entry price is required')
      return
    }

    if (!formData.stop_loss || formData.stop_loss <= 0) {
      setError('Valid stop loss is required')
      return
    }

    if (!formData.take_profit || formData.take_profit <= 0) {
      setError('Valid take profit is required')
      return
    }

    if (!formData.broker_id) {
      setError('Broker selection is required')
      return
    }

    try {
      if (onSubmit) {
        await onSubmit(formData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create order')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
        <CardDescription>Create a new trading order</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="e.g., NIFTY50"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-type">Order Type</Label>
              <Select
                value={formData.order_type}
                onValueChange={(value) => setFormData({ ...formData, order_type: value as 'buy' | 'sell' })}
              >
                <SelectTrigger id="order-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-price">Entry Price</Label>
              <Input
                id="entry-price"
                type="number"
                step="0.01"
                value={formData.entry_price}
                onChange={(e) => setFormData({ ...formData, entry_price: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stop-loss-price">Stop Loss</Label>
              <Input
                id="stop-loss-price"
                type="number"
                step="0.01"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="take-profit-price">Take Profit</Label>
              <Input
                id="take-profit-price"
                type="number"
                step="0.01"
                value={formData.take_profit}
                onChange={(e) => setFormData({ ...formData, take_profit: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker-select">Broker</Label>
            <Select value={formData.broker_id} onValueChange={(value) => setFormData({ ...formData, broker_id: value })}>
              <SelectTrigger id="broker-select">
                <SelectValue placeholder="Select broker..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zerodha">Zerodha</SelectItem>
                <SelectItem value="angel">Angel One</SelectItem>
                <SelectItem value="shoonya">Shoonya</SelectItem>
                <SelectItem value="alice">Alice Blue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Risk/Reward Analysis</p>
              <p className="mt-2 font-semibold">
                {formData.entry_price > 0 && formData.stop_loss > 0
                  ? `Risk: ${Math.abs(((formData.entry_price - formData.stop_loss) / formData.entry_price) * 100).toFixed(2)}%`
                  : 'Add prices for analysis'}
              </p>
              {formData.entry_price > 0 && formData.take_profit > 0 && (
                <p className="font-semibold">
                  Reward: {(((formData.take_profit - formData.entry_price) / formData.entry_price) * 100).toFixed(2)}%
                </p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
