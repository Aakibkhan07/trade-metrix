'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Settings } from 'lucide-react';

interface BrokerCardProps {
  name: string;
  type: string;
  status: 'connected' | 'disconnected';
  lastError?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSettings: () => void;
}

export function BrokerCard({ name, type, status, lastError, onConnect, onDisconnect, onSettings }: BrokerCardProps) {
  const isConnected = status === 'connected';

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription>Broker Type: {type}</CardDescription>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : (
              <XCircle className="w-3 h-3 mr-1" />
            )}
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastError && (
          <div className="flex gap-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{lastError}</span>
          </div>
        )}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={onConnect} className="flex-1">
              Connect Broker
            </Button>
          ) : (
            <>
              <Button onClick={onSettings} variant="outline" size="sm" className="flex-1">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button onClick={onDisconnect} variant="destructive" size="sm" className="flex-1">
                Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
