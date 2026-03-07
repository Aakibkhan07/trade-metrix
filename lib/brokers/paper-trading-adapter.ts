import { BrokerAdapter, BrokerCredentials, OrderRequest, OrderResponse, Position, Quote, MarginInfo, BrokerAccountInfo } from './types';

export class PaperTradingAdapter implements BrokerAdapter {
  private positions: Map<string, Position> = new Map();
  private orders: Map<string, OrderResponse> = new Map();
  private cash: number = 100000; // Start with $100,000
  private email: string = '';

  async authenticate(credentials: BrokerCredentials): Promise<{ accessToken: string; expiresAt?: Date }> {
    this.email = credentials.clientId || 'demo@paperfund.com';
    this.cash = 100000;
    this.positions.clear();
    this.orders.clear();
    return {
      accessToken: `paper_${Date.now()}`,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  async refreshToken(): Promise<{ accessToken: string; expiresAt?: Date }> {
    return {
      accessToken: `paper_${Date.now()}`,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const orderId = `PAPER_${Date.now()}`;
    const orderResponse: OrderResponse = {
      orderId,
      symbol: order.symbol,
      quantity: order.quantity,
      price: order.price || 100,
      status: 'ACCEPTED',
      brokerOrderId: orderId,
      timestamp: new Date(),
    };

    this.orders.set(orderId, orderResponse);

    // Auto-execute in paper trading after 100ms
    setTimeout(async () => {
      await this.executeOrder(orderId, order);
    }, 100);

    return orderResponse;
  }

  private async executeOrder(orderId: string, order: OrderRequest): Promise<void> {
    const orderResponse = this.orders.get(orderId);
    if (!orderResponse) return;

    const orderCost = orderResponse.quantity * orderResponse.price;
    
    if (order.orderType === 'BUY') {
      if (this.cash < orderCost) {
        orderResponse.status = 'REJECTED';
        return;
      }
      this.cash -= orderCost;
    } else {
      const position = this.positions.get(order.symbol);
      if (!position || position.quantity < order.quantity) {
        orderResponse.status = 'REJECTED';
        return;
      }
    }

    orderResponse.status = 'EXECUTED';
    this.updatePosition(order);
  }

  private updatePosition(order: OrderRequest): void {
    const key = order.symbol;
    const existing = this.positions.get(key);

    if (order.orderType === 'BUY') {
      if (existing) {
        const totalCost = existing.quantity * existing.averagePrice + order.quantity * (order.price || 100);
        existing.quantity += order.quantity;
        existing.averagePrice = totalCost / existing.quantity;
      } else {
        this.positions.set(key, {
          symbol: order.symbol,
          exchange: order.exchange,
          quantity: order.quantity,
          averagePrice: order.price || 100,
          currentPrice: order.price || 100,
          pnl: 0,
          pnlPercent: 0,
          productType: order.productType,
        });
      }
    } else if (existing) {
      existing.quantity -= order.quantity;
      if (existing.quantity <= 0) {
        this.positions.delete(key);
      }
    }
  }

  async modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<OrderResponse> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    
    if (order.status === 'EXECUTED') {
      throw new Error('Cannot modify executed order');
    }

    order.quantity = modifications.quantity || order.quantity;
    order.price = modifications.price || order.price;
    return order;
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    
    if (order.status === 'EXECUTED') {
      throw new Error('Cannot cancel executed order');
    }

    order.status = 'CANCELLED';
    return { success: true, message: 'Order cancelled' };
  }

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    return order;
  }

  async getOrders(): Promise<OrderResponse[]> {
    return Array.from(this.orders.values());
  }

  async getPositions(): Promise<Position[]> {
    // Simulate price changes
    const positions = Array.from(this.positions.values());
    positions.forEach((p) => {
      p.currentPrice *= (1 + (Math.random() - 0.5) * 0.02);
      p.pnl = (p.currentPrice - p.averagePrice) * p.quantity;
      p.pnlPercent = ((p.currentPrice - p.averagePrice) / p.averagePrice) * 100;
    });
    return positions;
  }

  async getHoldings(): Promise<Array<{ symbol: string; quantity: number; price: number }>> {
    return Array.from(this.positions.values()).map((p) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      price: p.currentPrice,
    }));
  }

  async getQuote(symbol: string, exchange: string): Promise<Quote> {
    const position = this.positions.get(symbol);
    const basePrice = position?.currentPrice || 100;
    
    return {
      symbol,
      exchange,
      lastPrice: basePrice,
      bid: basePrice - 0.5,
      ask: basePrice + 0.5,
      high: basePrice + 5,
      low: basePrice - 5,
      open: basePrice,
      close: basePrice,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: new Date(),
    };
  }

  async getQuotes(symbols: Array<{ symbol: string; exchange: string }>): Promise<Quote[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s.symbol, s.exchange)));
  }

  async searchInstruments(query: string): Promise<Array<{ symbol: string; exchange: string; name: string }>> {
    // Return sample instruments for demo
    return [
      { symbol: 'INFY', exchange: 'NSE', name: 'Infosys Limited' },
      { symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services' },
      { symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries' },
    ];
  }

  async getAccountInfo(): Promise<BrokerAccountInfo> {
    return {
      email: this.email,
      clientId: 'PAPER_TRADING',
      broker: 'paper',
      margins: await this.getMargins(),
    };
  }

  async getMargins(): Promise<MarginInfo> {
    return {
      available: this.cash,
      utilised: 100000 - this.cash,
      grossLimit: 100000,
    };
  }
}
