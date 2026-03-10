import { BaseBrokerAdapter } from './base-adapter';
import { BrokerCredentials, OrderRequest, OrderResponse, Position, Quote, MarginInfo, BrokerAccountInfo } from './types';

export class ShoonyaAdapter extends BaseBrokerAdapter {
  constructor() {
    super('Shoonya');
    this.baseUrl = 'https://api.shoonya.com/NorenWClientTP';
  }

  async authenticate(credentials: BrokerCredentials): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    const authResponse = await fetch(`${this.baseUrl}/QuickAuth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        uid: credentials.userId || '',
        pwd: credentials.password || '',
        factor2: credentials.totpSecret || '',
        vc: credentials.clientId || '',
        appkey: credentials.apiKey || '',
        imei: 'web',
      }).toString(),
    });

    const data = await authResponse.json();
    if (!data.stat || data.stat !== 'Ok') throw new Error('Shoonya authentication failed');

    this.accessToken = data.susertoken;
    return {
      accessToken: data.susertoken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    throw new Error('Shoonya requires manual re-authentication');
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const response = await this.fetch('/PlaceOrder', {
      method: 'POST',
      body: new URLSearchParams({
        mode: 'REGULAR',
        exchange: order.exchange,
        tradingsymbol: order.symbol,
        transactiontype: order.orderType,
        ordertype: order.orderVariety === 'regular' ? 'LIMIT' : 'MARKET',
        quantity: order.quantity.toString(),
        price: (order.price || 0).toString(),
        product: order.productType,
        ordervalidity: order.timeInForce,
        triggerprice: (order.triggerPrice || 0).toString(),
        disclosedquantity: (order.disclosedQuantity || 0).toString(),
      }).toString(),
    });

    return {
      orderId: response.norenordno,
      symbol: order.symbol,
      quantity: order.quantity,
      price: order.price || 0,
      status: 'ACCEPTED',
      brokerOrderId: response.norenordno,
      timestamp: new Date(),
    };
  }

  async modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<OrderResponse> {
    const response = await this.fetch('/ModifyOrder', {
      method: 'POST',
      body: new URLSearchParams({
        orderid: orderId,
        quantity: (modifications.quantity || 0).toString(),
        price: (modifications.price || 0).toString(),
        triggerprice: (modifications.triggerPrice || 0).toString(),
      }).toString(),
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
    await this.fetch('/CancelOrder', {
      method: 'POST',
      body: new URLSearchParams({ orderid: orderId }).toString(),
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
    const response = await this.fetch('/OrderBook');
    const orders = Array.isArray(response) ? response : [];
    return orders.map((o: any) => ({
      orderId: o.norenordno,
      symbol: o.tradingsymbol,
      quantity: parseInt(o.quantity),
      price: parseFloat(o.price),
      status: o.orderstatus,
      brokerOrderId: o.norenordno,
      timestamp: new Date(o.ordertime),
    }));
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.fetch('/PositionBook');
    const positions = Array.isArray(response) ? response : [];
    return positions.map((p: any) => ({
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
    const response = await this.fetch('/HoldingBook');
    const holdings = Array.isArray(response) ? response : [];
    return holdings.map((h: any) => ({
      symbol: h.tradingsymbol,
      quantity: parseInt(h.quantity),
      price: parseFloat(h.ltp),
    }));
  }

  async getQuote(symbol: string, exchange: string): Promise<Quote> {
    const response = await this.fetch('/GetQuotes', {
      method: 'POST',
      body: new URLSearchParams({
        mode: 'LTP',
        exchange: exchange,
        token: symbol,
      }).toString(),
    });

    return {
      symbol,
      exchange,
      lastPrice: parseFloat(response.ltp),
      bid: parseFloat(response.bid),
      ask: parseFloat(response.ask),
      high: parseFloat(response.high),
      low: parseFloat(response.low),
      open: parseFloat(response.open),
      close: parseFloat(response.close),
      volume: parseInt(response.volume),
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
    const response = await this.fetch('/GetProfile');
    const margins = await this.getMargins();
    return {
      email: response.email,
      clientId: response.userid,
      broker: 'shoonya',
      margins,
    };
  }

  async getMargins(): Promise<MarginInfo> {
    const response = await this.fetch('/GetLimits');
    return {
      available: parseFloat(response.cash),
      utilised: parseFloat(response.used),
      grossLimit: parseFloat(response.totalMarginLimit),
    };
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`Shoonya API Error: ${response.statusText}`);
    return response.json();
  }
}
