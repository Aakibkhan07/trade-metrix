'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrokerCard } from './broker-card';
import { useToast } from '@/hooks/use-toast';

interface BrokerAccount {
  id: string;
  broker_id: string;
  connection_status: string;
  last_error?: string;
  broker: { name: string; broker_type: string };
}

export function BrokerAccountsList() {
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/brokers/connect');
      const data = await response.json();

      if (response.ok) {
        setAccounts(data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load broker accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      const response = await fetch(`/api/brokers/${accountId}/disconnect`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Broker disconnected',
        });
        fetchAccounts();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect broker',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading broker accounts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Brokers</CardTitle>
        <CardDescription>Manage your broker connections for live trading</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No brokers connected yet. Add a broker to start trading.</p>
        ) : (
          accounts.map((account) => (
            <BrokerCard
              key={account.id}
              name={account.broker.name}
              type={account.broker.broker_type}
              status={account.connection_status as 'connected' | 'disconnected'}
              lastError={account.last_error}
              onConnect={() => {}}
              onDisconnect={() => handleDisconnect(account.id)}
              onSettings={() => {}}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
