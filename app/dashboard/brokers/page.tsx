'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrokerAccountsList } from '@/components/brokers/broker-accounts-list';
import { BrokerConnectForm } from '@/components/brokers/broker-connect-form';
import { BrokerSelector } from '@/components/brokers/broker-selector';
import { Plus } from 'lucide-react';

export default function BrokersPage() {
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<'zerodha' | 'angel_one' | 'shoonya' | 'alice_blue' | 'paper'>('paper');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Broker Management</h1>
        <p className="text-muted-foreground mt-2">Connect to your trading brokers for live market access and order execution</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BrokerAccountsList />
        </div>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add Broker</CardTitle>
            <CardDescription>Connect a new broker account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showConnectForm ? (
              <Button onClick={() => setShowConnectForm(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add New Broker
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Broker</label>
                  <BrokerSelector value={selectedBroker} onValueChange={(value: any) => setSelectedBroker(value)} />
                </div>
                <BrokerConnectForm
                  brokerType={selectedBroker}
                  onSuccess={() => setShowConnectForm(false)}
                  onCancel={() => setShowConnectForm(false)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supported Brokers</CardTitle>
          <CardDescription>List of all supported Indian brokers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Zerodha', type: 'NSE, BSE, NFO, MCX, CDS', icon: '🟦' },
              { name: 'Angel One', type: 'NSE, BSE, NFO, MCX', icon: '📱' },
              { name: 'Shoonya', type: 'NSE, BSE, NFO, MCX', icon: '🔷' },
              { name: 'Alice Blue', type: 'NSE, BSE, NFO, MCX', icon: '💙' },
              { name: 'Paper Trading', type: 'Demo Account', icon: '📄' },
            ].map((broker) => (
              <div key={broker.name} className="p-4 border rounded-lg space-y-2">
                <div className="text-3xl">{broker.icon}</div>
                <h3 className="font-semibold">{broker.name}</h3>
                <p className="text-sm text-muted-foreground">{broker.type}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
