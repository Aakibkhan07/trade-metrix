// Broker types and interfaces for unified trading
export type BrokerType = 'zerodha' | 'angel_one' | 'shoonya' | 'alice_blue' | 'paper';

export interface BrokerCredentials {
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  apiSecret?: string;
  userId?: string;
  password?: string;
  totpSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  requestToken?: string;
}

export interface OrderRequest {
  symbol: string;
  exchange: string;
  orderType: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  triggerPrice?: number;
  orderVariety: 'regular' | 'oco' | 'bracket';
  timeInForce: 'DAY' | 'IOC' | 'FOK';
  productType: 'MIS' | 'CNC' | 'NRML';
  disclosedQuantity?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderResponse {
  orderId: string;
  symbol: string;
  quantity: number;
  price: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXECUTED' | 'CANCELLED';
  brokerOrderId: string;
  timestamp: Date;
}

export interface Position {
  symbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  productType: string;
}

export interface Quote {
  symbol: string;
  exchange: string;
  lastPrice: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export interface MarginInfo {
  available: number;
  utilised: number;
  grossLimit: number;
}

export interface BrokerAccountInfo {
  email: string;
  clientId: string;
  broker: BrokerType;
  margins: MarginInfo;
  holdings?: Array<{
    symbol: string;
    quantity: number;
    price: number;
  }>;
}

export interface BrokerAdapter {
  // Authentication
  authenticate(credentials: BrokerCredentials): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }>;
  
  // Orders
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
  modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<OrderResponse>;
  cancelOrder(orderId: string): Promise<{ success: boolean; message: string }>;
  getOrderStatus(orderId: string): Promise<OrderResponse>;
  getOrders(): Promise<OrderResponse[]>;
  
  // Positions & Holdings
  getPositions(): Promise<Position[]>;
  getHoldings(): Promise<Array<{ symbol: string; quantity: number; price: number }>>;
  
  // Market Data
  getQuote(symbol: string, exchange: string): Promise<Quote>;
  getQuotes(symbols: Array<{ symbol: string; exchange: string }>): Promise<Quote[]>;
  searchInstruments(query: string): Promise<Array<{ symbol: string; exchange: string; name: string }>>;
  
  // Account
  getAccountInfo(): Promise<BrokerAccountInfo>;
  getMargins(): Promise<MarginInfo>;
}
