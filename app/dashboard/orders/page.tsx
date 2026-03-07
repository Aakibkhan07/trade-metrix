'use client'

import { useEffect, useState } from 'react'
import { OrderForm } from '@/components/trading/order-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      setOrders(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrder(data: any) {
    try {
      setSubmitting(true)
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create order')
      toast({ title: 'Order placed successfully' })
      fetchOrders()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExecute(id: string) {
    const actualPrice = prompt('Enter actual execution price:')
    if (!actualPrice) return

    try {
      const response = await fetch(`/api/orders/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualPrice: parseFloat(actualPrice) }),
      })
      if (!response.ok) throw new Error('Failed to execute order')
      toast({ title: 'Order executed successfully' })
      fetchOrders()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel this order?')) return

    try {
      const response = await fetch(`/api/orders/${id}/cancel`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to cancel order')
      toast({ title: 'Order cancelled' })
      fetchOrders()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'bg-yellow-500/10 text-yellow-700',
      executed: 'bg-green-500/10 text-green-700',
      cancelled: 'bg-red-500/10 text-red-700',
    }
    return variants[status] || 'bg-gray-500/10 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trading Orders</h1>
        <p className="text-muted-foreground">Place and manage your trading orders</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="create">Place Order</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No orders yet. Place your first order to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Orders</CardTitle>
                <CardDescription>{orders.length} total order(s)</CardDescription>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-semibold">{order.symbol}</TableCell>
                          <TableCell>{order.order_type.toUpperCase()}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>₹{order.entry_price.toFixed(2)}</TableCell>
                          <TableCell>₹{order.stop_loss.toFixed(2)}</TableCell>
                          <TableCell>₹{order.take_profit.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(order.status)}>{order.status}</Badge>
                          </TableCell>
                          <TableCell className="space-x-2">
                            {order.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleExecute(order.id)}>
                                  Execute
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleCancel(order.id)}>
                                  Cancel
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="max-w-2xl">
          <OrderForm onSubmit={handleCreateOrder} isLoading={submitting} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
