// SSE API route for real-time market data streaming
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { streamingManager } from '@/lib/streaming/streaming-manager';
import { connectionManager } from '@/lib/streaming/connection-manager';
import { subscriptionManager } from '@/lib/streaming/subscription-manager';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brokerAccountId = searchParams.get('brokerAccountId');
  const brokerType = searchParams.get('brokerType') as any;

  if (!brokerAccountId || !brokerType) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create connection and adapter
  const connectionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  connectionManager.registerConnection(connectionId, user.id, brokerAccountId);

  const adapter = streamingManager.createAdapter(brokerType, connectionId);

  // Set up SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  };

  // Create readable stream for SSE
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Get broker credentials from database
        const { data: account } = await supabase
          .from('user_broker_accounts')
          .select('*')
          .eq('id', brokerAccountId)
          .single();

        if (!account) {
          controller.enqueue('data: {"error": "Account not found"}\n\n');
          controller.close();
          return;
        }

        // Connect to broker
        await adapter.connect(account.credentials || {});

        // Load existing subscriptions
        await subscriptionManager.loadSubscriptionsFromDb(user.id);
        const subscriptions = subscriptionManager.getSubscriptionsByBroker(brokerAccountId);

        // Subscribe to existing subscriptions
        for (const subscription of subscriptions) {
          try {
            await adapter.subscribe(subscription);
          } catch (error) {
            console.error('[SSE] Subscription error:', error);
          }
        }

        // Handle incoming data
        adapter.onData((event) => {
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        });

        // Handle errors
        adapter.onError((error) => {
          controller.enqueue(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        });

        // Handle connection events
        adapter.onConnect(() => {
          controller.enqueue(`data: ${JSON.stringify({ type: 'connect' })}\n\n`);
        });

        adapter.onDisconnect(() => {
          controller.enqueue(`data: ${JSON.stringify({ type: 'disconnect' })}\n\n`);
          controller.close();
        });

        // Keep connection alive with heartbeat
        const heartbeatInterval = setInterval(() => {
          controller.enqueue(`: heartbeat at ${new Date().toISOString()}\n\n`);
        }, 30000);

        // Handle client disconnect
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          adapter.disconnect();
          streamingManager.removeAdapter(connectionId);
          connectionManager.removeConnection(connectionId);
        };

        request.signal.addEventListener('abort', cleanup);
      } catch (error) {
        console.error('[SSE] Error:', error);
        controller.enqueue(`data: ${JSON.stringify({ type: 'error', message: 'Connection failed' })}\n\n`);
        controller.close();
      }
    },
  });

  return new NextResponse(readable, { headers });
}
