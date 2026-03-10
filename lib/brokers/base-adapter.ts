import { BrokerAdapter, BrokerCredentials, OrderRequest, OrderResponse, Position, Quote, MarginInfo, BrokerAccountInfo } from './types';

export abstract class BaseBrokerAdapter implements BrokerAdapter {
  protected credentials: BrokerCredentials = {};
  protected accessToken: string = '';
  protected baseUrl: string = '';

  constructor(protected brokerName: string) {}

  abstract authenticate(credentials: BrokerCredentials): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;
  abstract refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }>;
  abstract placeOrder(order: OrderRequest): Promise<OrderResponse>;
  abstract modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<OrderResponse>;
  abstract cancelOrder(orderId: string): Promise<{ success: boolean; message: string }>;
  abstract getOrderStatus(orderId: string): Promise<OrderResponse>;
  abstract getOrders(): Promise<OrderResponse[]>;
  abstract getPositions(): Promise<Position[]>;
  abstract getHoldings(): Promise<Array<{ symbol: string; quantity: number; price: number }>>;
  abstract getQuote(symbol: string, exchange: string): Promise<Quote>;
  abstract getQuotes(symbols: Array<{ symbol: string; exchange: string }>): Promise<Quote[]>;
  abstract searchInstruments(query: string): Promise<Array<{ symbol: string; exchange: string; name: string }>>;
  abstract getAccountInfo(): Promise<BrokerAccountInfo>;
  abstract getMargins(): Promise<MarginInfo>;

  protected async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`${this.brokerName} API Error: ${response.statusText}`);
    }

    return response.json();
  }

  setCredentials(credentials: BrokerCredentials): void {
    this.credentials = credentials;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }
}
