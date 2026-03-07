'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Key, Webhook, BarChart3, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ApiKey {
  id: string
  name: string
  active: boolean
  created_at: string
  last_used_at: string | null
}

interface UsageStats {
  date: string
  requests: number
  errors: number
}

export default function DeveloperPortal() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [usageData, setUsageData] = useState<UsageStats[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchApiKeys()
    fetchUsageStats()
  }, [])

  async function fetchApiKeys() {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setApiKeys(data.apiKeys || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch API keys', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsageStats() {
    try {
      const res = await fetch('/api/analytics/portfolio')
      const data = await res.json()
      // Mock usage data
      setUsageData([
        { date: 'Mon', requests: 450, errors: 5 },
        { date: 'Tue', requests: 520, errors: 8 },
        { date: 'Wed', requests: 480, errors: 4 },
        { date: 'Thu', requests: 610, errors: 12 },
        { date: 'Fri', requests: 750, errors: 8 },
      ])
    } catch {
      setUsageData([])
    }
  }

  async function generateNewKey() {
    try {
      const name = `API Key ${new Date().toLocaleDateString()}`
      // Mock API call
      toast({ title: 'Success', description: 'API key generated' })
      fetchApiKeys()
    } catch {
      toast({ title: 'Error', description: 'Failed to generate API key', variant: 'destructive' })
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Copied to clipboard' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-4xl font-bold">Developer Portal</h1>
        <p className="text-muted-foreground mt-2">Manage API keys, webhooks, and monitor usage</p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">API Keys</h2>
            <Button onClick={generateNewKey} className="gap-2">
              <Key className="h-4 w-4" />
              Generate New Key
            </Button>
          </div>

          <div className="space-y-4">
            {apiKeys.length > 0 ? (
              apiKeys.map((key) => (
                <Card key={key.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{key.name}</CardTitle>
                      <Badge className={key.active ? 'bg-green-500/10 text-green-700' : 'bg-gray-500/10 text-gray-700'}>
                        {key.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted p-2 rounded text-sm">sk_live_••••••••••••••••</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('sk_live_••••••••••••••••')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No API keys created yet</p>
                  <Button onClick={generateNewKey} variant="outline" className="mt-4">
                    Create Your First Key
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Webhooks</h2>
            <Link href="/dashboard/webhooks">
              <Button className="gap-2">
                <Webhook className="h-4 w-4" />
                Manage Webhooks
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>Configure which events trigger your webhooks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-semibold">Available Events:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>order.created - When a new order is placed</li>
                  <li>order.filled - When an order is partially or fully filled</li>
                  <li>position.opened - When a new position is opened</li>
                  <li>position.closed - When a position is closed</li>
                  <li>strategy.activated - When a strategy is activated</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <h2 className="text-2xl font-semibold">API Usage</h2>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Requests Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2} name="Requests" />
                  <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Errors" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <h2 className="text-2xl font-semibold">Documentation</h2>

          <div className="grid gap-4">
            <Link href="/docs/api">
              <Card className="cursor-pointer hover:bg-muted transition-colors">
                <CardHeader>
                  <CardTitle>API Reference</CardTitle>
                  <CardDescription>Complete API endpoint documentation</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Card>
              <CardHeader>
                <CardTitle>Code Examples</CardTitle>
                <CardDescription>Example implementations in JavaScript and Python</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">JavaScript:</p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                    {`const response = await fetch('https://api.trademetrix.com/api/v1/strategies', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
})
const strategies = await response.json()`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
