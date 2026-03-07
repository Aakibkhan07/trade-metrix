// React hook for real-time market data streaming
import { useEffect, useState, useCallback, useRef } from 'react';
import { MarketDataStream, StreamEvent } from '@/lib/streaming/types';

interface UseMarketDataOptions {
  brokerAccountId: string;
  brokerType: string;
  symbols?: string[];
  enabled?: boolean;
}

interface UseMarketDataReturn {
  data: Map<string, MarketDataStream>;
  connected: boolean;
  error?: string;
  subscribe: (symbols: string[]) => Promise<void>;
  unsubscribe: (symbols: string[]) => Promise<void>;
}

export function useMarketData(options: UseMarketDataOptions): UseMarketDataReturn {
  const [data, setData] = useState<Map<string, MarketDataStream>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const subscriptionRef = useRef<string | null>(null);

  // Connect to streaming
  useEffect(() => {
    if (!options.enabled) return;

    const connectStream = async () => {
      try {
        const params = new URLSearchParams({
          brokerAccountId: options.brokerAccountId,
          brokerType: options.brokerType,
        });

        const eventSource = new EventSource(`/api/streaming/market?${params}`);

        eventSource.onopen = () => {
          setConnected(true);
          setError(undefined);
        };

        eventSource.onmessage = (event) => {
          try {
            const streamEvent: StreamEvent = JSON.parse(event.data);

            if (streamEvent.type === 'quote') {
              setData((prev) => {
                const newData = new Map(prev);
                newData.set(streamEvent.data.symbol, {
                  symbol: streamEvent.data.symbol,
                  exchange: streamEvent.data.exchange || 'NSE',
                  lastPrice: streamEvent.data.lastPrice,
                  bid: streamEvent.data.bid,
                  ask: streamEvent.data.ask,
                  bidQty: streamEvent.data.bidQty || 0,
                  askQty: streamEvent.data.askQty || 0,
                  high: streamEvent.data.high,
                  low: streamEvent.data.low,
                  open: streamEvent.data.open,
                  close: streamEvent.data.close,
                  volume: streamEvent.data.volume,
                  oi: streamEvent.data.oi,
                  timestamp: new Date(streamEvent.timestamp),
                  changePercent: streamEvent.data.changePercent || 0,
                });
                return newData;
              });
            } else if (streamEvent.type === 'error') {
              setError(streamEvent.data.message);
            } else if (streamEvent.type === 'disconnect') {
              setConnected(false);
            }
          } catch (err) {
            console.error('[useMarketData] Parse error:', err);
          }
        };

        eventSource.onerror = () => {
          setConnected(false);
          setError('Connection lost');
          eventSource.close();
        };

        eventSourceRef.current = eventSource;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect');
      }
    };

    connectStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [options.brokerAccountId, options.brokerType, options.enabled]);

  // Subscribe to symbols
  const subscribe = useCallback(
    async (symbols: string[]) => {
      try {
        const response = await fetch('/api/streaming/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brokerAccountId: options.brokerAccountId,
            dataType: 'market_data',
            filters: { symbols },
          }),
        });

        if (!response.ok) throw new Error('Subscription failed');
        const sub = await response.json();
        subscriptionRef.current = sub.id;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Subscription failed');
      }
    },
    [options.brokerAccountId]
  );

  // Unsubscribe
  const unsubscribe = useCallback(
    async (symbols: string[]) => {
      if (!subscriptionRef.current) return;

      try {
        const response = await fetch(`/api/streaming/subscribe?id=${subscriptionRef.current}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Unsubscribe failed');
        subscriptionRef.current = null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unsubscribe failed');
      }
    },
    []
  );

  // Auto-subscribe to initial symbols
  useEffect(() => {
    if (connected && options.symbols?.length) {
      subscribe(options.symbols);
    }
  }, [connected, options.symbols, subscribe]);

  return { data, connected, error, subscribe, unsubscribe };
}
