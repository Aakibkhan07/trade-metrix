'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BrokerConnectFormProps {
  brokerType: 'zerodha' | 'angel_one' | 'shoonya' | 'alice_blue' | 'paper';
  onSuccess: () => void;
  onCancel: () => void;
}

export function BrokerConnectForm({ brokerType, onSuccess, onCancel }: BrokerConnectFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'api_key'>(
    brokerType === 'zerodha' ? 'oauth' : 'api_key'
  );
  const { toast } = useToast();

  const [credentials, setCredentials] = useState({
    clientId: '',
    apiKey: '',
    userId: '',
    password: '',
    totpCode: '',
  });

  // OAuth flow for Zerodha
  const handleOAuthConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/brokers/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerType,
          authMethod: 'oauth',
          credentials: {
            apiKey: credentials.apiKey,
            clientId: credentials.clientId,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate connection');
      }

      if (data.redirectUrl) {
        // Redirect to broker's OAuth page
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to connect',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // API key/password flow for other brokers
  const handleApiKeyConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/brokers/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerType,
          authMethod: brokerType === 'paper' ? 'paper' : 'api_key',
          credentials,
        }),
      });

      const data = await response.json();
      console.log('[v0] Broker connect response:', data);

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to connect broker';
        setError(errorMsg);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Connected to ${brokerType.replace('_', ' ')} successfully`,
      });

      onSuccess();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Paper trading - simple connection
  if (brokerType === 'paper') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Paper Trading</CardTitle>
          <CardDescription>Connect to a simulated trading account with virtual funds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paper trading allows you to test strategies without risking real money. 
              You will start with a virtual balance of 10,00,000.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleApiKeyConnect} className="flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect Paper Trading
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Zerodha uses OAuth primarily
  if (brokerType === 'zerodha') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Connect Zerodha</CardTitle>
          <CardDescription>Connect using Kite Connect OAuth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                placeholder="Enter your Kite Connect API Key"
                value={credentials.apiKey}
                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a href="https://kite.trade" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  kite.trade <ExternalLink className="inline w-3 h-3" />
                </a>
              </p>
            </div>
            
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Redirect URL for Zerodha:</p>
              <code className="text-xs bg-background px-2 py-1 rounded">
                https://app.trademetrix.tech/api/brokers/callback
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Add this URL in your Kite Connect app settings
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
                Cancel
              </Button>
              <Button 
                onClick={handleOAuthConnect} 
                className="flex-1" 
                disabled={loading || !credentials.apiKey}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect with Zerodha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Angel One, Shoonya, Alice Blue - support both OAuth and API key
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Connect {brokerType.replace('_', ' ').toUpperCase()}</CardTitle>
        <CardDescription>Choose your preferred authentication method</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'oauth' | 'api_key')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="api_key">API Login</TabsTrigger>
            <TabsTrigger value="oauth">OAuth</TabsTrigger>
          </TabsList>

          <TabsContent value="api_key">
            {error && (
              <div className="bg-red-100 border-4 border-red-600 rounded-lg p-4 mb-4 text-center">
                <p className="text-base font-bold text-red-800">⚠️ Connection Error</p>
                <p className="text-sm text-red-700 mt-2 whitespace-pre-wrap break-words">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleApiKeyConnect} className="space-y-4">

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-blue-900">
                  Get your Angel One credentials from your developer dashboard
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userId">Client Code</Label>
                <Input
                  id="userId"
                  placeholder="e.g., A123456789"
                  value={credentials.userId}
                  onChange={(e) => setCredentials({ ...credentials, userId: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Your Angel One Client ID from the dashboard</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your Angel One password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Your Angel One login password</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiKey">Private Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Your Private Key"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Available in your Angel One API settings</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totpCode">TOTP Code (Optional)</Label>
                <Input
                  id="totpCode"
                  placeholder="6-digit code if 2FA enabled"
                  value={credentials.totpCode}
                  onChange={(e) => setCredentials({ ...credentials, totpCode: e.target.value })}
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">Leave blank if 2FA is not enabled</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="oauth">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oauthApiKey">API Key</Label>
                <Input
                  id="oauthApiKey"
                  placeholder="Enter your API key"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                />
              </div>
              
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Redirect URL:</p>
                <code className="text-xs bg-background px-2 py-1 rounded">
                  https://app.trademetrix.tech/api/brokers/callback
                </code>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleOAuthConnect} 
                  className="flex-1" 
                  disabled={loading || !credentials.apiKey}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect with OAuth
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
