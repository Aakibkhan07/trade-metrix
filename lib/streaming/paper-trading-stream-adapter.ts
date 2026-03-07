// Paper trading streaming adapter for simulated market data
import { BaseStreamAdapter } from './base-stream-adapter';
import { BrokerStreamAdapter, StreamSubscription, StreamEvent, MarketDataStream } from './types';
import { connectionManager } from './connection-manager';

export class PaperTradingStreamAdapter extends BaseStreamAdapter implements BrokerStreamAdapter {
  private subscriptions: Set<string> = new Set();
  private dataCallback?: (event: StreamEvent) => void;
  private errorCallback?: (error: Error) => void;
  private connectCallback?: () => void;
  private disconnectCallback?: () => void;
  private simulationInterval?: NodeJS.Timeout;
  private priceData: Map<string, number> = new Map();

  async connect(): Promise<void> {
    try {
      connectionManager.updateStatus(this.connectionId, 'connecting');
      this.isConnectedFlag = true;
      connectionManager.updateStatus(this.connectionId, 'connected');

      // Initialize with base prices
      this.initializePrices();

      // Start market simulation
      this.startMarketSimulation();

      this.startHeartbeat();
      if (this.connectCallback) this.connectCallback();
    } catch (error) {
      this.handleStreamError(error instanceof Error ? error : new Error('Connection failed'));
    }
  }

  async disconnect(): Promise<void> {
    this.isConnectedFlag = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    this.stopHeartbeat();
    connectionManager.updateStatus(this.connectionId, 'disconnected');
    if (this.disconnectCallback) this.disconnectCallback();
  }

  async subscribe(subscription: StreamSubscription): Promise<void> {
    if (!this.isConnectedFlag) {
      throw new Error('Not connected');
    }

    if (subscription.dataType === 'market_data' && subscription.filters?.symbols) {
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

  private initializePrices() {
    this.priceData.set('INFY', 2850);
    this.priceData.set('TCS', 3950);
    this.priceData.set('RELIANCE', 2650);
    this.priceData.set('HDFCBANK', 1950);
    this.priceData.set('ICICIBANK', 1100);
  }

  private startMarketSimulation() {
    this.simulationInterval = setInterval(() => {
      if (!this.isConnectedFlag || !this.dataCallback) return;

      // Generate simulated quote data
      this.priceData.forEach((basePrice, symbol) => {
        const changePercent = (Math.random() - 0.5) * 0.02; // Random -1% to +1%
        const lastPrice = basePrice * (1 + changePercent);
        const event: StreamEvent = {
          type: 'quote',
          timestamp: new Date(),
          brokerAccountId: '',
          data: {
            symbol,
            lastPrice: parseFloat(lastPrice.toFixed(2)),
            bid: parseFloat((lastPrice - 0.5).toFixed(2)),
            ask: parseFloat((lastPrice + 0.5).toFixed(2)),
            bidQty: 100,
            askQty: 100,
            high: basePrice * 1.02,
            low: basePrice * 0.98,
            open: basePrice,
            close: lastPrice,
            volume: Math.floor(Math.random() * 100000),
            changePercent: changePercent * 100,
          },
        };
        this.dataCallback(event);
      });
    }, 2000); // Update every 2 seconds
  }
}
