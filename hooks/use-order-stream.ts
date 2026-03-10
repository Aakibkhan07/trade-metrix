// React hook for real-time order streaming
import { useEffect, useState } from 'react';
import { OrderUpdateStream, StreamEvent } from '@/lib/streaming/types';

interface UseOrderStreamOptions {
  brokerAccountId: string;
  brokerType: string;
  enabled?: boolean;
}

export function useOrderStream(options: UseOrderStreamOptions) {
  const [orders, setOrders] = useState<Map<string, OrderUpdateStream>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!options.enabled) return;

    const params = new URLSearchParams({
      brokerAccountId: options.brokerAccountId,
      brokerType: options.brokerType,
      dataType: 'order_update',
    });

    const eventSource = new EventSource(`/api/streaming/market?${params}`);

    eventSource.onopen = () => {
      setConnected(true);
      setError(undefined);
    };

    eventSource.onmessage = (event) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);

        if (streamEvent.type === 'order') {
          setOrders((prev) => {
            const newOrders = new Map(prev);
            newOrders.set(streamEvent.data.orderId, {
              orderId: streamEvent.data.orderId,
              brokerOrderId: streamEvent.data.brokerOrderId,
              symbol: streamEvent.data.symbol,
              status: streamEvent.data.status,
              quantity: streamEvent.data.quantity,
              filledQuantity: streamEvent.data.filledQuantity,
              price: streamEvent.data.price,
              averagePrice: streamEvent.data.averagePrice,
              timestamp: new Date(streamEvent.timestamp),
            });
            return newOrders;
          });
        }
      } catch (err) {
        console.error('[useOrderStream] Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      setError('Connection lost');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [options.brokerAccountId, options.brokerType, options.enabled]);

  return { orders, connected, error };
}
