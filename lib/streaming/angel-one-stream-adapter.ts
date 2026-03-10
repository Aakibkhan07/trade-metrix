// Angel One WebSocket streaming adapter
import { BaseStreamAdapter } from './base-stream-adapter';
import { BrokerStreamAdapter, StreamSubscription, StreamEvent } from './types';
import { connectionManager } from './connection-manager';

export class AngelOneStreamAdapter extends BaseStreamAdapter implements BrokerStreamAdapter {
  private socket?: WebSocket;
  private subscriptions: Set<string> = new Set();
  private dataCallback?: (event: StreamEvent) => void;
  private errorCallback?: (error: Error) => void;
  private connectCallback?: () => void;
  private disconnectCallback?: () => void;
  private clientCode: string = '';
  private jwtToken: string = '';

  async connect(credentials: { jwtToken: string; clientCode: string }): Promise<void> {
    try {
      connectionManager.updateStatus(this.connectionId, 'connecting');
      this.jwtToken = credentials.jwtToken;
      this.clientCode = credentials.clientCode;

      const wsUrl = `wss://smartapisocket.angelbroking.com/`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[Angel One] WebSocket connected');
        // Send auth message
        this.sendAuthMessage();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'ack') {
            this.isConnectedFlag = true;
            connectionManager.updateStatus(this.connectionId, 'connected');
            this.startHeartbeat();
            if (this.connectCallback) this.connectCallback();
          } else if (message.type === 'quote') {
            this.handleQuoteMessage(message);
          }
        } catch (error) {
          console.error('[Angel One] Failed to parse message:', error);
        }
      };

      this.socket.onerror = () => {
        this.handleStreamError(new Error('Angel One WebSocket error'));
      };

      this.socket.onclose = () => {
        console.log('[Angel One] WebSocket disconnected');
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
      const message = {
        action: 'subscribe',
        params: {
          mode: 'quote',
          tokenList: symbols,
        },
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

  private sendAuthMessage() {
    if (!this.socket) return;

    const authMessage = {
      action: 'auth',
      params: {
        jwt: this.jwtToken,
        clientCode: this.clientCode,
      },
    };

    this.socket.send(JSON.stringify(authMessage));
  }

  private handleQuoteMessage(message: any) {
    if (this.dataCallback) {
      const event: StreamEvent = {
        type: 'quote',
        timestamp: new Date(),
        brokerAccountId: '',
        data: {
          symbol: message.symbol,
          lastPrice: message.lastPrice,
          bid: message.bid,
          ask: message.ask,
          volume: message.volume,
          high: message.high,
          low: message.low,
          open: message.open,
          close: message.close,
        },
      };
      this.dataCallback(event);
    }
  }
}
