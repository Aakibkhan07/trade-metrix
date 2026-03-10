'use client';

import { usePositionStream } from '@/hooks/use-position-stream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface LivePositionPanelProps {
  brokerAccountId: string;
  brokerType: string;
}

export function LivePositionPanel({ brokerAccountId, brokerType }: LivePositionPanelProps) {
  const { positions, connected, error } = usePositionStream({
    brokerAccountId,
    brokerType,
    enabled: true,
  });

  const totalPnl = Array.from(positions.values()).reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPositions = positions.size;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Positions</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">{totalPositions} Open</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}

        {/* Summary */}
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground">Total P&L</div>
          <div className={`text-xl font-bold flex items-center gap-1 ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            ₹{Math.abs(totalPnl).toFixed(2)}
          </div>
        </div>

        {/* Positions List */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {positions.size === 0 ? (
            <div className="text-sm text-muted-foreground">No open positions</div>
          ) : (
            Array.from(positions.values()).map((position, idx) => {
              const isProfit = position.pnl >= 0;
              return (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{position.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {position.quantity} @ ₹{position.averagePrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{position.pnl.toFixed(2)}
                    </div>
                    <div className={`text-xs font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                      {position.pnlPercent.toFixed(2)}%
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
