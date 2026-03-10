// Streaming manager to handle all broker adapters
import { BrokerStreamAdapter, StreamSubscription, StreamEvent } from './types';
import { ZerodhaStreamAdapter } from './zerodha-stream-adapter';
import { AngelOneStreamAdapter } from './angel-one-stream-adapter';
import { PaperTradingStreamAdapter } from './paper-trading-stream-adapter';
import { BrokerType } from '@/lib/brokers/types';

export class StreamingManager {
  private adapters: Map<string, BrokerStreamAdapter> = new Map();

  createAdapter(brokerType: BrokerType, connectionId: string): BrokerStreamAdapter {
    let adapter: BrokerStreamAdapter;

    switch (brokerType) {
      case 'zerodha':
        adapter = new ZerodhaStreamAdapter(connectionId);
        break;
      case 'angel_one':
        adapter = new AngelOneStreamAdapter(connectionId);
        break;
      case 'paper':
        adapter = new PaperTradingStreamAdapter(connectionId);
        break;
      case 'shoonya':
        // Placeholder - implement similar to Angel One
        adapter = new AngelOneStreamAdapter(connectionId);
        break;
      case 'alice_blue':
        // Placeholder - implement similar to Zerodha
        adapter = new ZerodhaStreamAdapter(connectionId);
        break;
      default:
        throw new Error(`Unsupported broker type: ${brokerType}`);
    }

    this.adapters.set(connectionId, adapter);
    return adapter;
  }

  getAdapter(connectionId: string): BrokerStreamAdapter | undefined {
    return this.adapters.get(connectionId);
  }

  removeAdapter(connectionId: string): void {
    this.adapters.delete(connectionId);
  }

  getAllAdapters(): BrokerStreamAdapter[] {
    return Array.from(this.adapters.values());
  }
}

// Global streaming manager instance
export const streamingManager = new StreamingManager();
