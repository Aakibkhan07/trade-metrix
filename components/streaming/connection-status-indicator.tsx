'use client';

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  connected: boolean;
  label?: string;
}

export function ConnectionStatusIndicator({ connected, label = 'Connection Status' }: ConnectionStatusIndicatorProps) {
  const [animateGlow, setAnimateGlow] = useState(false);

  useEffect(() => {
    if (connected) {
      const interval = setInterval(() => {
        setAnimateGlow((prev) => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center w-3 h-3">
        <div
          className={`absolute w-full h-full rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500'
          } ${animateGlow && connected ? 'animate-pulse' : ''}`}
        />
        {connected && (
          <div className="absolute w-full h-full rounded-full bg-green-400 opacity-50 animate-ping" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className={`text-xs font-bold ${connected ? 'text-green-600' : 'text-red-600'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}
