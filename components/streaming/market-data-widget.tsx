'use client';

import { useState, useEffect } from 'react';
import { useMarketData } from '@/hooks/use-market-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketDataWidgetProps {
  brokerAccountId: string;
  brokerType: string;
  symbols?: string[];
}

export function MarketDataWidget({ brokerAccountId, brokerType, symbols = ['INFY', 'TCS', 'RELIANCE'] }: MarketDataWidgetProps) {
  const { data, connected, error, subscribe } = useMarketData({
    brokerAccountId,
    brokerType,
    symbols,
    enabled: true,
  });

  useEffect(() => {
    if (connected && symbols.length > 0) {
      subscribe(symbols);
    }
  }, [connected, symbols, subscribe]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Market Data</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
        <div className="space-y-3">
          {data.size === 0 ? (
            <div className="text-sm text-muted-foreground">Waiting for data...</div>
          ) : (
            Array.from(data.values()).map((quote) => {
              const isPositive = quote.changePercent >= 0;
              return (
                <div key={quote.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{quote.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      Bid: ₹{quote.bid.toFixed(2)} | Ask: ₹{quote.ask.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{quote.lastPrice.toFixed(2)}</div>
                    <div className={`text-xs font-semibold flex items-center justify-end gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(quote.changePercent).toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
