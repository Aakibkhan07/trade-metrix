import { BaseBrokerAdapter } from './base-adapter';
import { BrokerCredentials, OrderRequest, OrderResponse, Position, Quote, MarginInfo, BrokerAccountInfo } from './types';

export class ZerodhaAdapter extends BaseBrokerAdapter {
  constructor() {
    super('Zerodha');
    this.baseUrl = 'https://api.kite.trade';
  }

  async authenticate(credentials: BrokerCredentials): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    // Zerodha uses OAuth - return redirect URL or handle via server-side
    if (!credentials.requestToken) {
      throw new Error('Zerodha requires requestToken from OAuth login');
    }

    const response = await this.fetch('/session/token', {
      method: 'POST',
      body: JSON.stringify({
        api_key: credentials.clientId,
        request_token: credentials.requestToken,
        checksum: credentials.apiSecret, // SHA256 hash in real implementation
      }),
    });

    this.accessToken = response.data.access_token;
    return {
      accessToken: response.data.access_token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    // Zerodha doesn't support refresh tokens; requires re-authentication
    throw new Error('Zerodha does not support token refresh');
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const response = await this.fetch('/orders/regular', {
      method: 'POST',
      body: JSON.stringify({
        variety: order.orderVariety,
        exchange: order.exchange,
        tradingsymbol: order.symbol,
        transaction_type: order.orderType,
        order_type: order.orderVariety === 'regular' ? 'LIMIT' : 'MARKET',
        quantity: order.quantity,
        price: order.price,
        trigger_price: order.triggerPrice,
        validity: order.timeInForce,
        product: order.productType,
      }),
    });

    return {
      orderId: response.data.order_id,
      symbol: order.symbol,
      quantity: order.quantity,
      price: order.price || 0,
      status: 'ACCEPTED',
      brokerOrderId: response.data.order_id,
      timestamp: new Date(),
    };
  }

  async modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<OrderResponse> {
    const response = await this.fetch(`/orders/${modifications.orderVariety || 'regular'}/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({
        quantity: modifications.quantity,
        price: modifications.price,
        trigger_price: modifications.triggerPrice,
        order_type: 'LIMIT',
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
    await this.fetch(`/orders/regular/${orderId}`, {
      method: 'DELETE',
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
    const response = await this.fetch('/orders');
    return response.data.map((o: any) => ({
      orderId: o.order_id,
      symbol: o.tradingsymbol,
      quantity: o.quantity,
      price: o.price,
      status: o.status,
      brokerOrderId: o.order_id,
      timestamp: new Date(o.order_timestamp),
    }));
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.fetch('/portfolio/positions');
    return response.data.net.map((p: any) => ({
      symbol: p.tradingsymbol,
      exchange: p.exchange,
      quantity: p.quantity,
      averagePrice: p.average_price,
      currentPrice: p.last_price,
      pnl: p.pnl,
      pnlPercent: (p.pnl / (p.average_price * p.quantity)) * 100,
      productType: p.product,
    }));
  }

  async getHoldings(): Promise<Array<{ symbol: string; quantity: number; price: number }>> {
    const response = await this.fetch('/portfolio/holdings');
    return response.data.map((h: any) => ({
      symbol: h.tradingsymbol,
      quantity: h.quantity,
      price: h.last_price,
    }));
  }

  async getQuote(symbol: string, exchange: string): Promise<Quote> {
    const response = await this.fetch(`/quote/${exchange}:${symbol}`);
    const data = response.data[`${exchange}:${symbol}`];
    return {
      symbol,
      exchange,
      lastPrice: data.last_price,
      bid: data.bid,
      ask: data.ask,
      high: data.ohlc.high,
      low: data.ohlc.low,
      open: data.ohlc.open,
      close: data.ohlc.close,
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
    // Zerodha provides instrument list file, simplified here
    return [];
  }

  async getAccountInfo(): Promise<BrokerAccountInfo> {
    const response = await this.fetch('/user/profile');
    const margins = await this.getMargins();
    return {
      email: response.data.email,
      clientId: response.data.user_id,
      broker: 'zerodha',
      margins,
    };
  }

  async getMargins(): Promise<MarginInfo> {
    const response = await this.fetch('/user/margins');
    const equity = response.data.equity;
    return {
      available: equity.available,
      utilised: equity.utilised,
      grossLimit: equity.gross_limit,
    };
  }
}
