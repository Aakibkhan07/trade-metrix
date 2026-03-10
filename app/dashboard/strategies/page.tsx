'use client'

import { useEffect, useState } from 'react'
import { StrategyBuilder } from '@/components/trading/strategy-builder'
import { StrategyList } from '@/components/trading/strategy-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchStrategies()
  }, [])

  async function fetchStrategies() {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/strategies')
      if (!response.ok) throw new Error('Failed to fetch strategies')
      const data = await response.json()
      setStrategies(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateStrategy(data: any) {
    try {
      setSubmitting(true)
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create strategy')
      toast({ title: 'Strategy created successfully' })
      fetchStrategies()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate(id: string) {
    try {
      const response = await fetch(`/api/strategies/${id}/activate`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to activate strategy')
      toast({ title: 'Strategy activated' })
      fetchStrategies()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const response = await fetch(`/api/strategies/${id}/deactivate`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to deactivate strategy')
      toast({ title: 'Strategy deactivated' })
      fetchStrategies()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this strategy?')) return
    try {
      const response = await fetch(`/api/strategies/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete strategy')
      toast({ title: 'Strategy deleted' })
      fetchStrategies()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trading Strategies</h1>
        <p className="text-muted-foreground">Manage your algorithmic trading strategies</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Your Strategies</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <StrategyList
              strategies={strategies}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
              onDelete={handleDelete}
            />
          )}
        </TabsContent>

        <TabsContent value="create" className="max-w-2xl">
          <StrategyBuilder onSubmit={handleCreateStrategy} isLoading={submitting} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
