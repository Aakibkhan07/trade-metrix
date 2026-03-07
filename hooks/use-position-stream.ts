// React hook for real-time position streaming
import { useEffect, useState } from 'react';
import { PositionUpdateStream, StreamEvent } from '@/lib/streaming/types';

interface UsePositionStreamOptions {
  brokerAccountId: string;
  brokerType: string;
  enabled?: boolean;
}

export function usePositionStream(options: UsePositionStreamOptions) {
  const [positions, setPositions] = useState<Map<string, PositionUpdateStream>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!options.enabled) return;

    const params = new URLSearchParams({
      brokerAccountId: options.brokerAccountId,
      brokerType: options.brokerType,
      dataType: 'position_update',
    });

    const eventSource = new EventSource(`/api/streaming/market?${params}`);

    eventSource.onopen = () => {
      setConnected(true);
      setError(undefined);
    };

    eventSource.onmessage = (event) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);

        if (streamEvent.type === 'position') {
          setPositions((prev) => {
            const newPositions = new Map(prev);
            const key = `${streamEvent.data.symbol}_${streamEvent.data.exchange}`;
            newPositions.set(key, {
              symbol: streamEvent.data.symbol,
              exchange: streamEvent.data.exchange,
              quantity: streamEvent.data.quantity,
              averagePrice: streamEvent.data.averagePrice,
              currentPrice: streamEvent.data.currentPrice,
              pnl: streamEvent.data.pnl,
              pnlPercent: streamEvent.data.pnlPercent,
              timestamp: new Date(streamEvent.timestamp),
            });
            return newPositions;
          });
        }
      } catch (err) {
        console.error('[usePositionStream] Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      setError('Connection lost');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [options.brokerAccountId, options.brokerType, options.enabled]);

  return { positions, connected, error };
}
