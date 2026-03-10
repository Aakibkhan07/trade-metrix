'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface StrategyBuilderProps {
  onSubmit?: (data: any) => Promise<void>
  isLoading?: boolean
}

export function StrategyBuilder({ onSubmit, isLoading = false }: StrategyBuilderProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    strategy_type: 'trend-following',
    entry_condition: {
      type: 'moving-average-crossover',
      fast_ma: 50,
      slow_ma: 200,
    },
    exit_condition: {
      type: 'profit-target',
      profit_target_percent: 2,
    },
    risk_management: {
      stop_loss_pips: 50,
      take_profit_pips: 150,
      max_trades_per_day: 5,
      max_drawdown_percent: 10,
    },
    broker_id: '',
  })

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Strategy name is required')
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
      setError(err.message || 'Failed to create strategy')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Trading Strategy</CardTitle>
        <CardDescription>Define your algorithmic trading strategy parameters</CardDescription>
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
              <Label htmlFor="name">Strategy Name</Label>
              <Input
                id="name"
                placeholder="e.g., Morning Trend Breakout"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Strategy Type</Label>
              <Select
                value={formData.strategy_type}
                onValueChange={(value) => setFormData({ ...formData, strategy_type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trend-following">Trend Following</SelectItem>
                  <SelectItem value="mean-reversion">Mean Reversion</SelectItem>
                  <SelectItem value="breakout">Breakout</SelectItem>
                  <SelectItem value="arbitrage">Arbitrage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your strategy..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Entry Conditions</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entry-type">Entry Type</Label>
                <Select
                  value={formData.entry_condition.type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      entry_condition: { ...formData.entry_condition, type: value },
                    })
                  }
                >
                  <SelectTrigger id="entry-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moving-average-crossover">MA Crossover</SelectItem>
                    <SelectItem value="support-resistance">Support/Resistance</SelectItem>
                    <SelectItem value="rsi">RSI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fast-ma">Fast MA Period</Label>
                <Input
                  id="fast-ma"
                  type="number"
                  value={formData.entry_condition.fast_ma}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      entry_condition: {
                        ...formData.entry_condition,
                        fast_ma: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slow-ma">Slow MA Period</Label>
                <Input
                  id="slow-ma"
                  type="number"
                  value={formData.entry_condition.slow_ma}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      entry_condition: {
                        ...formData.entry_condition,
                        slow_ma: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Risk Management</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stop-loss">Stop Loss (Pips)</Label>
                <Input
                  id="stop-loss"
                  type="number"
                  value={formData.risk_management.stop_loss_pips}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      risk_management: {
                        ...formData.risk_management,
                        stop_loss_pips: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="take-profit">Take Profit (Pips)</Label>
                <Input
                  id="take-profit"
                  type="number"
                  value={formData.risk_management.take_profit_pips}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      risk_management: {
                        ...formData.risk_management,
                        take_profit_pips: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-trades">Max Trades Per Day</Label>
                <Input
                  id="max-trades"
                  type="number"
                  value={formData.risk_management.max_trades_per_day}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      risk_management: {
                        ...formData.risk_management,
                        max_trades_per_day: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-drawdown">Max Drawdown (%)</Label>
                <Input
                  id="max-drawdown"
                  type="number"
                  step="0.1"
                  value={formData.risk_management.max_drawdown_percent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      risk_management: {
                        ...formData.risk_management,
                        max_drawdown_percent: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Broker</Label>
            <Select value={formData.broker_id} onValueChange={(value) => setFormData({ ...formData, broker_id: value })}>
              <SelectTrigger id="broker">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Strategy...
              </>
            ) : (
              'Create Strategy'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
