// Base streaming adapter with common functionality
import { BrokerStreamAdapter, StreamSubscription, StreamEvent, MarketDataStream } from './types';
import { connectionManager } from './connection-manager';

export abstract class BaseStreamAdapter implements BrokerStreamAdapter {
  protected connectionId: string;
  protected isConnectedFlag: boolean = false;
  protected reconnectDelay: number = 1000;
  protected maxReconnectAttempts: number = 5;
  protected heartbeatInterval?: NodeJS.Timeout;

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  async heartbeat(): Promise<boolean> {
    if (!this.isConnectedFlag) return false;
    // Update heartbeat timestamp
    const connection = connectionManager.getConnection(this.connectionId);
    if (connection) {
      connection.lastHeartbeat = new Date();
    }
    return true;
  }

  protected startHeartbeat(interval: number = 30000) {
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, interval);
  }

  protected stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  protected handleStreamError(error: Error) {
    console.error('[Streaming] Adapter error:', error);
    connectionManager.emitError(this.connectionId, error);
    const connection = connectionManager.getConnection(this.connectionId);
    if (connection && connection.reconnectAttempts < this.maxReconnectAttempts) {
      connectionManager.incrementReconnectAttempts(this.connectionId);
      setTimeout(() => this.attemptReconnect(), this.reconnectDelay * Math.pow(2, connection.reconnectAttempts));
    }
  }

  protected async attemptReconnect(): Promise<void> {
    const connection = connectionManager.getConnection(this.connectionId);
    if (connection && connection.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.disconnect();
        // Subclasses should implement reconnection logic
      } catch (error) {
        console.error('[Streaming] Reconnection failed:', error);
      }
    }
  }

  // Abstract methods that subclasses must implement
  abstract connect(credentials: any): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract subscribe(subscription: StreamSubscription): Promise<void>;
  abstract unsubscribe(subscriptionId: string): Promise<void>;
  abstract onData(callback: (event: StreamEvent) => void): void;
  abstract onError(callback: (error: Error) => void): void;
  abstract onConnect(callback: () => void): void;
  abstract onDisconnect(callback: () => void): void;
}
