import { BrokerType, BrokerAdapter, BrokerCredentials, OrderRequest, OrderResponse, Position, Quote, MarginInfo, BrokerAccountInfo } from './types';
import { ZerodhaAdapter } from './zerodha-adapter';
import { AngelOneAdapter } from './angel-one-adapter';
import { ShoonyaAdapter } from './shoonya-adapter';
import { AliceBlueAdapter } from './alice-blue-adapter';
import { PaperTradingAdapter } from './paper-trading-adapter';

export class BrokerService {
  private adapters: Map<BrokerType, BrokerAdapter> = new Map();
  private activeAdapter: BrokerAdapter | null = null;

  constructor() {
    this.adapters.set('zerodha', new ZerodhaAdapter());
    this.adapters.set('angel_one', new AngelOneAdapter());
    this.adapters.set('shoonya', new ShoonyaAdapter());
    this.adapters.set('alice_blue', new AliceBlueAdapter());
    this.adapters.set('paper', new PaperTradingAdapter());
  }

  async selectBroker(brokerType: BrokerType, credentials: BrokerCredentials): Promise<void> {
    const adapter = this.adapters.get(brokerType);
    if (!adapter) throw new Error(`Broker ${brokerType} not supported`);

    try {
      await adapter.authenticate(credentials);
      this.activeAdapter = adapter;
    } catch (error) {
      throw new Error(`Failed to authenticate with ${brokerType}: ${error}`);
    }
  }

  private ensureConnected(): void {
    if (!this.activeAdapter) {
      throw new Error('No broker connected. Call selectBroker first.');
    }
  }

  // Authentication
  async authenticate(brokerType: BrokerType, credentials: BrokerCredentials): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    const adapter = this.adapters.get(brokerType);
    if (!adapter) throw new Error(`Broker ${brokerType} not supported`);
    return adapter.authenticate(credentials);
  }

  async refreshToken(brokerType: BrokerType, refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    const adapter = this.adapters.get(brokerType);
    if (!adapter) throw new Error(`Broker ${brokerType} not supported`);
    return adapter.refreshToken(refreshToken);
  }

  // Orders
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    this.ensureConnected();
    return this.activeAdapter!.placeOrder(order);
  }

  async modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<OrderResponse> {
    this.ensureConnected();
    return this.activeAdapter!.modifyOrder(orderId, modifications);
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    this.ensureConnected();
    return this.activeAdapter!.cancelOrder(orderId);
  }

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    this.ensureConnected();
    return this.activeAdapter!.getOrderStatus(orderId);
  }

  async getOrders(): Promise<OrderResponse[]> {
    this.ensureConnected();
    return this.activeAdapter!.getOrders();
  }

  // Positions & Holdings
  async getPositions(): Promise<Position[]> {
    this.ensureConnected();
    return this.activeAdapter!.getPositions();
  }

  async getHoldings(): Promise<Array<{ symbol: string; quantity: number; price: number }>> {
    this.ensureConnected();
    return this.activeAdapter!.getHoldings();
  }

  // Market Data
  async getQuote(symbol: string, exchange: string): Promise<Quote> {
    this.ensureConnected();
    return this.activeAdapter!.getQuote(symbol, exchange);
  }

  async getQuotes(symbols: Array<{ symbol: string; exchange: string }>): Promise<Quote[]> {
    this.ensureConnected();
    return this.activeAdapter!.getQuotes(symbols);
  }

  async searchInstruments(query: string): Promise<Array<{ symbol: string; exchange: string; name: string }>> {
    this.ensureConnected();
    return this.activeAdapter!.searchInstruments(query);
  }

  // Account
  async getAccountInfo(): Promise<BrokerAccountInfo> {
    this.ensureConnected();
    return this.activeAdapter!.getAccountInfo();
  }

  async getMargins(): Promise<MarginInfo> {
    this.ensureConnected();
    return this.activeAdapter!.getMargins();
  }

  // Broker info
  getActiveBrokerType(): BrokerType | null {
    return this.activeAdapter ? (Array.from(this.adapters.entries()).find(([, adapter]) => adapter === this.activeAdapter)?.[0] ?? null) : null;
  }

  isConnected(): boolean {
    return this.activeAdapter !== null;
  }

  disconnect(): void {
    this.activeAdapter = null;
  }
}

// Export singleton instance
export const brokerService = new BrokerService();
