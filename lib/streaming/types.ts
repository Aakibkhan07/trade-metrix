// Real-time streaming types and interfaces
export type StreamEventType = 'quote' | 'order' | 'position' | 'trade' | 'error' | 'connect' | 'disconnect';
export type StreamDataType = 'market_data' | 'order_update' | 'position_update' | 'account_update';

export interface StreamEvent {
  type: StreamEventType;
  timestamp: Date;
  brokerAccountId: string;
  data: Record<string, any>;
}

export interface MarketDataStream {
  symbol: string;
  exchange: string;
  lastPrice: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  oi?: number;
  timestamp: Date;
  changePercent: number;
}

export interface OrderUpdateStream {
  orderId: string;
  brokerOrderId: string;
  symbol: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXECUTED' | 'CANCELLED' | 'FILLED' | 'PARTIALLY_FILLED';
  quantity: number;
  filledQuantity: number;
  price: number;
  averagePrice: number;
  timestamp: Date;
}

export interface PositionUpdateStream {
  symbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  timestamp: Date;
}

export interface AccountUpdateStream {
  availableMargin: number;
  usedMargin: number;
  grossMargin: number;
  cash: number;
  timestamp: Date;
}

export interface StreamSubscription {
  id: string;
  userId: string;
  brokerAccountId: string;
  dataType: StreamDataType;
  filters?: Record<string, any>; // e.g., { symbols: ['INFY', 'TCS'] }
  createdAt: Date;
  active: boolean;
}

export interface StreamConnection {
  id: string;
  userId: string;
  brokerAccountId: string;
  connectionType: 'websocket' | 'sse';
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastHeartbeat?: Date;
  connectionTime?: Date;
  reconnectAttempts: number;
  error?: string;
}

export interface BrokerStreamAdapter {
  // Connection lifecycle
  connect(credentials: any): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Subscriptions
  subscribe(subscription: StreamSubscription): Promise<void>;
  unsubscribe(subscriptionId: string): Promise<void>;
  
  // Event handling
  onData(callback: (event: StreamEvent) => void): void;
  onError(callback: (error: Error) => void): void;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  
  // Heartbeat
  heartbeat(): Promise<boolean>;
}
