'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Strategy {
  id: string
  name: string
  description?: string
  strategy_type: string
  status: string
  activated_at?: string
  deactivated_at?: string
}

interface StrategyListProps {
  strategies: Strategy[]
  onActivate?: (id: string) => void
  onDeactivate?: (id: string) => void
  onDelete?: (id: string) => void
}

export function StrategyList({ strategies, onActivate, onDeactivate, onDelete }: StrategyListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700'
      case 'inactive':
        return 'bg-gray-500/10 text-gray-700'
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-700'
      default:
        return 'bg-gray-500/10 text-gray-700'
    }
  }

  if (strategies.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No strategies yet. Create your first strategy to get started.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {strategies.map((strategy) => (
        <Card key={strategy.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{strategy.name}</CardTitle>
                {strategy.description && <CardDescription>{strategy.description}</CardDescription>}
              </div>
              <Badge className={getStatusColor(strategy.status)}>{strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Type</p>
                <p className="text-sm capitalize">{strategy.strategy_type.replace('-', ' ')}</p>
              </div>

              {strategy.activated_at && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Activated</p>
                  <p className="text-sm">{new Date(strategy.activated_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {strategy.status === 'draft' || strategy.status === 'inactive' ? (
                <Button size="sm" onClick={() => onActivate?.(strategy.id)}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Activate
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => onDeactivate?.(strategy.id)}>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Deactivate
                </Button>
              )}

              <Button size="sm" variant="destructive" onClick={() => onDelete?.(strategy.id)}>
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
