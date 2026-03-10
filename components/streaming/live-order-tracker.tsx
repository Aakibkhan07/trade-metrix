'use client';

import { useOrderStream } from '@/hooks/use-order-stream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LiveOrderTrackerProps {
  brokerAccountId: string;
  brokerType: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  EXECUTED: 'bg-green-100 text-green-800',
  PARTIALLY_FILLED: 'bg-purple-100 text-purple-800',
  FILLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export function LiveOrderTracker({ brokerAccountId, brokerType }: LiveOrderTrackerProps) {
  const { orders, connected, error } = useOrderStream({
    brokerAccountId,
    brokerType,
    enabled: true,
  });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Orders</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {orders.size === 0 ? (
            <div className="text-sm text-muted-foreground">No active orders</div>
          ) : (
            Array.from(orders.values()).map((order) => (
              <div key={order.orderId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {order.symbol} - {order.quantity} @ ₹{order.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Filled: {order.filledQuantity}/{order.quantity} @ ₹{order.averagePrice.toFixed(2)}
                  </div>
                </div>
                <Badge className={statusColors[order.status]}>{order.status}</Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
