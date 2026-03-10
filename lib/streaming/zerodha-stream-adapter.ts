// Zerodha WebSocket streaming adapter
import { BaseStreamAdapter } from './base-stream-adapter';
import { BrokerStreamAdapter, StreamSubscription, StreamEvent } from './types';
import { connectionManager } from './connection-manager';

interface ZerodhaStreamMessage {
  type: 'subscribe' | 'unsubscribe' | 'quote' | 'full';
  data: any;
}

export class ZerodhaStreamAdapter extends BaseStreamAdapter implements BrokerStreamAdapter {
  private socket?: WebSocket;
  private subscriptions: Set<string> = new Set();
  private dataCallback?: (event: StreamEvent) => void;
  private errorCallback?: (error: Error) => void;
  private connectCallback?: () => void;
  private disconnectCallback?: () => void;

  async connect(credentials: { accessToken: string; userId: string }): Promise<void> {
    try {
      connectionManager.updateStatus(this.connectionId, 'connecting');
      
      // Construct Zerodha ticker WebSocket URL
      const apiKey = process.env.ZERODHA_API_KEY;
      const wsUrl = `wss://ws.kite.trade/?api_key=${apiKey}&access_token=${credentials.accessToken}`;
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[Zerodha] WebSocket connected');
        this.isConnectedFlag = true;
        connectionManager.updateStatus(this.connectionId, 'connected');
        this.startHeartbeat();
        if (this.connectCallback) this.connectCallback();
      };

      this.socket.onmessage = (event) => {
        try {
          const message: ZerodhaStreamMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[Zerodha] Failed to parse message:', error);
        }
      };

      this.socket.onerror = (error) => {
        this.handleStreamError(new Error('Zerodha WebSocket error'));
      };

      this.socket.onclose = () => {
        console.log('[Zerodha] WebSocket disconnected');
        this.isConnectedFlag = false;
        this.stopHeartbeat();
        connectionManager.updateStatus(this.connectionId, 'disconnected');
        if (this.disconnectCallback) this.disconnectCallback();
      };
    } catch (error) {
      this.handleStreamError(error instanceof Error ? error : new Error('Connection failed'));
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
    this.isConnectedFlag = false;
    this.stopHeartbeat();
  }

  async subscribe(subscription: StreamSubscription): Promise<void> {
    if (!this.isConnectedFlag || !this.socket) {
      throw new Error('WebSocket not connected');
    }

    if (subscription.dataType === 'market_data' && subscription.filters?.symbols) {
      const symbols = subscription.filters.symbols;
      const tokens = symbols.map((s: string) => this.symbolToToken(s));
      
      const message = {
        a: 'subscribe',
        v: tokens,
      };

      this.socket.send(JSON.stringify(message));
      this.subscriptions.add(subscription.id);
    }
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }

  onData(callback: (event: StreamEvent) => void): void {
    this.dataCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onConnect(callback: () => void): void {
    this.connectCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback;
  }

  private handleMessage(message: ZerodhaStreamMessage) {
    if (message.type === 'quote' && this.dataCallback) {
      const event: StreamEvent = {
        type: 'quote',
        timestamp: new Date(),
        brokerAccountId: '', // Set from context
        data: {
          symbol: message.data.symbol,
          lastPrice: message.data.last_price,
          bid: message.data.bid,
          ask: message.data.ask,
          volume: message.data.volume,
          high: message.data.high,
          low: message.data.low,
          open: message.data.open,
          close: message.data.close,
        },
      };
      this.dataCallback(event);
    }
  }

  private symbolToToken(symbol: string): string {
    // Map symbols to Zerodha token format
    const tokenMap: Record<string, string> = {
      'INFY': '408065',
      'TCS': '2885121',
      'RELIANCE': '738561',
      // Add more mappings as needed
    };
    return tokenMap[symbol] || symbol;
  }
}
