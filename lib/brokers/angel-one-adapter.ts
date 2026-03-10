import { BaseBrokerAdapter } from './base-adapter';
import { BrokerCredentials, OrderRequest, OrderResponse, Position, Quote, MarginInfo, BrokerAccountInfo } from './types';

export class AngelOneAdapter extends BaseBrokerAdapter {
  constructor() {
    super('Angel One');
    this.baseUrl = 'https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1';
  }

  async authenticate(credentials: BrokerCredentials): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    try {
      const authResponse = await fetch(`${this.baseUrl}/loginByPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PrivateKey': credentials.apiKey,
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
        },
        body: JSON.stringify({
          clientcode: credentials.userId,
          password: credentials.password,
          totp: credentials.totpCode || '',
        }),
      });

      const data = await authResponse.json();
      
      if (!data.status || data.status !== 'success') {
        console.log('[v0] Angel One auth failed:', data);
        throw new Error(data.message || 'Angel One authentication failed');
      }

      if (!data.data?.jwtToken && !data.data?.authToken) {
        throw new Error('No authentication token received from Angel One');
      }

      const token = data.data.jwtToken || data.data.authToken;
      this.accessToken = token;
      
      return {
        accessToken: token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      console.log('[v0] Angel One authentication error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    throw new Error('Angel One requires manual re-authentication');
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const response = await this.fetch('/placeOrder', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'LTP',
        exchange: order.exchange,
        tradingsymbol: order.symbol,
        transactiontype: order.orderType,
        ordertype: 'REGULAR',
        quantity: order.quantity,
        price: order.price || 0,
        product: order.productType,
        ordervalidity: order.timeInForce,
        disclosedquantity: order.disclosedQuantity || 0,
        triggerprice: order.triggerPrice || 0,
      }),
    });

    return {
      orderId: response.data.orderid,
      symbol: order.symbol,
      quantity: order.quantity,
      price: order.price || 0,
      status: 'ACCEPTED',
      brokerOrderId: response.data.orderid,
      timestamp: new Date(),
    };
  }

  async modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<OrderResponse> {
    const response = await this.fetch('/modifyOrder', {
      method: 'POST',
      body: JSON.stringify({
        orderid: orderId,
        ordertype: 'REGULAR',
        quantity: modifications.quantity,
        price: modifications.price,
        triggerprice: modifications.triggerPrice,
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
    await this.fetch('/cancelOrder', {
      method: 'POST',
      body: JSON.stringify({ orderid: orderId }),
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
    const response = await this.fetch('/orderBook');
    return response.data.map((o: any) => ({
      orderId: o.orderid,
      symbol: o.tradingsymbol,
      quantity: parseInt(o.quantity),
      price: parseFloat(o.price),
      status: o.orderstatus,
      brokerOrderId: o.orderid,
      timestamp: new Date(o.ordertime),
    }));
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.fetch('/positionBook');
    return response.data.map((p: any) => ({
      symbol: p.tradingsymbol,
      exchange: p.exchange,
      quantity: parseInt(p.netqty),
      averagePrice: parseFloat(p.avgprice),
      currentPrice: parseFloat(p.ltp),
      pnl: parseFloat(p.pnl),
      pnlPercent: (parseFloat(p.pnl) / (parseFloat(p.avgprice) * parseInt(p.netqty))) * 100,
      productType: p.product,
    }));
  }

  async getHoldings(): Promise<Array<{ symbol: string; quantity: number; price: number }>> {
    const response = await this.fetch('/holdingBook');
    return response.data.map((h: any) => ({
      symbol: h.tradingsymbol,
      quantity: parseInt(h.quantity),
      price: parseFloat(h.ltp),
    }));
  }

  async getQuote(symbol: string, exchange: string): Promise<Quote> {
    const response = await this.fetch(`/quote/${exchange}:${symbol}`);
    const data = response.data[0];
    return {
      symbol,
      exchange,
      lastPrice: data.ltp,
      bid: data.bid,
      ask: data.ask,
      high: data.high,
      low: data.low,
      open: data.open,
      close: data.close,
      volume: data.volume,
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
    const response = await this.fetch('/profile');
    const margins = await this.getMargins();
    return {
      email: response.data.email,
      clientId: response.data.clientid,
      broker: 'angel_one',
      margins,
    };
  }

  async getMargins(): Promise<MarginInfo> {
    const response = await this.fetch('/marginBook');
    const data = response.data[0];
    return {
      available: parseFloat(data.cash),
      utilised: parseFloat(data.used),
      grossLimit: parseFloat(data.total),
    };
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`Angel One API Error: ${response.statusText}`);
    return response.json();
  }
}
