import { BaseBrokerAdapter } from './base-adapter';
import { BrokerCredentials, OrderRequest, OrderResponse, Position, Quote, MarginInfo, BrokerAccountInfo } from './types';

export class AliceBlueAdapter extends BaseBrokerAdapter {
  constructor() {
    super('Alice Blue');
    this.baseUrl = 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api';
  }

  async authenticate(credentials: BrokerCredentials): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    const authResponse = await fetch(`${this.baseUrl}/customer/getUserSessionID`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        UserID: credentials.userId,
        Password: credentials.password,
        DOB: credentials.clientSecret,
        PAN: credentials.clientId,
      }),
    });

    const data = await authResponse.json();
    if (!data.stat) throw new Error('Alice Blue authentication failed');

    this.accessToken = data.SessionID;
    return {
      accessToken: data.SessionID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    throw new Error('Alice Blue requires manual re-authentication');
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const response = await this.fetch('/order/place/regular', {
      method: 'POST',
      body: JSON.stringify({
        InstrumentType: order.exchange === 'NSE' ? 'EQUITY' : 'DERIVATIVE',
        Segment: order.exchange,
        OrderSide: order.orderType === 'BUY' ? '1' : '-1',
        OrderType: order.orderVariety === 'regular' ? '2' : '1',
        Price: order.price || 0,
        Qty: order.quantity,
        ScripCode: order.symbol,
        TimeInForce: order.timeInForce === 'DAY' ? 'DAY' : 'IOC',
        OrderUniqueIdentification: `ORD_${Date.now()}`,
      }),
    });

    return {
      orderId: response.Nid,
      symbol: order.symbol,
      quantity: order.quantity,
      price: order.price || 0,
      status: 'ACCEPTED',
      brokerOrderId: response.Nid,
      timestamp: new Date(),
    };
  }

  async modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<OrderResponse> {
    const response = await this.fetch('/order/modify', {
      method: 'POST',
      body: JSON.stringify({
        OrderIdentifier: orderId,
        Price: modifications.price,
        Qty: modifications.quantity,
      }),
    });

    return {
      orderId,
      symbol: modifications.symbol || '',
      quantity: modifications.quantity || 0,
      price: modifications.price || 0,
      status: 'ACCEPTED',
      brokerOrderId: orderId,
      timestamp: new Date(),
    };
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    await this.fetch('/order/cancel', {
      method: 'POST',
      body: JSON.stringify({ OrderIdentifier: orderId }),
    });

    return { success: true, message: 'Order cancelled successfully' };
  }

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    const orders = await this.getOrders();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) throw new Error('Order not found');
    return order;
  }

  async getOrders(): Promise<OrderResponse[]> {
    const response = await this.fetch('/order/listorder');
    const orders = Array.isArray(response) ? response : [];
    return orders.map((o: any) => ({
      orderId: o.Nid,
      symbol: o.ScripCode,
      quantity: parseInt(o.Qty),
      price: parseFloat(o.Price),
      status: o.OrderStatus === 'Executed' ? 'EXECUTED' : 'ACCEPTED',
      brokerOrderId: o.Nid,
      timestamp: new Date(o.OrderTime),
    }));
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.fetch('/order/positionbook');
    const positions = Array.isArray(response) ? response : [];
    return positions.map((p: any) => ({
      symbol: p.ScripCode,
      exchange: p.Segment,
      quantity: parseInt(p.NetQty),
      averagePrice: parseFloat(p.AveragePrice),
      currentPrice: parseFloat(p.LTP),
      pnl: parseFloat(p.NetPL),
      pnlPercent: (parseFloat(p.NetPL) / (parseFloat(p.AveragePrice) * parseInt(p.NetQty))) * 100,
      productType: p.Product,
    }));
  }

  async getHoldings(): Promise<Array<{ symbol: string; quantity: number; price: number }>> {
    const response = await this.fetch('/order/holdingbook');
    const holdings = Array.isArray(response) ? response : [];
    return holdings.map((h: any) => ({
      symbol: h.ScripCode,
      quantity: parseInt(h.Quantity),
      price: parseFloat(h.LTP),
    }));
  }

  async getQuote(symbol: string, exchange: string): Promise<Quote> {
    const response = await this.fetch('/quotes/quote', {
      method: 'POST',
      body: JSON.stringify({
        Segment: exchange,
        ScripCode: symbol,
      }),
    });

    return {
      symbol,
      exchange,
      lastPrice: parseFloat(response.LTP),
      bid: parseFloat(response.Bid),
      ask: parseFloat(response.Ask),
      high: parseFloat(response.High),
      low: parseFloat(response.Low),
      open: parseFloat(response.Open),
      close: parseFloat(response.Close),
      volume: parseInt(response.Volume),
      timestamp: new Date(),
    };
  }

  async getQuotes(symbols: Array<{ symbol: string; exchange: string }>): Promise<Quote[]> {
    const quotes = [];
    for (const sym of symbols) {
      quotes.push(await this.getQuote(sym.symbol, sym.exchange));
    }
    return quotes;
  }

  async searchInstruments(query: string): Promise<Array<{ symbol: string; exchange: string; name: string }>> {
    return [];
  }

  async getAccountInfo(): Promise<BrokerAccountInfo> {
    const response = await this.fetch('/customer/getProfileInfo');
    const margins = await this.getMargins();
    return {
      email: response.EmailID,
      clientId: response.ClientID,
      broker: 'alice_blue',
      margins,
    };
  }

  async getMargins(): Promise<MarginInfo> {
    const response = await this.fetch('/limits/getlimits');
    return {
      available: parseFloat(response.AvailableLimits),
      utilised: parseFloat(response.UtilisedLimits),
      grossLimit: parseFloat(response.GrossLimits),
    };
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`Alice Blue API Error: ${response.statusText}`);
    return response.json();
  }
}
