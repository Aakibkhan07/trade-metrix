// Subscription manager for handling stream subscriptions
import { StreamSubscription } from './types';
import { createClient } from '@/lib/supabase/server';

export class SubscriptionManager {
  private subscriptions: Map<string, StreamSubscription> = new Map();

  async createSubscription(
    userId: string,
    brokerAccountId: string,
    dataType: 'market_data' | 'order_update' | 'position_update' | 'account_update',
    filters?: Record<string, any>
  ): Promise<StreamSubscription> {
    const supabase = await createClient();
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: StreamSubscription = {
      id,
      userId,
      brokerAccountId,
      dataType,
      filters,
      createdAt: new Date(),
      active: true,
    };

    // Persist to database
    await supabase
      .from('streaming_subscriptions')
      .insert({
        id,
        user_id: userId,
        broker_account_id: brokerAccountId,
        data_type: dataType,
        filters: filters || {},
        active: true,
      });

    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const supabase = await createClient();
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      subscription.active = false;
      await supabase
        .from('streaming_subscriptions')
        .update({ active: false })
        .eq('id', subscriptionId);

      this.subscriptions.delete(subscriptionId);
    }
  }

  getSubscription(subscriptionId: string): StreamSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  getSubscriptionsByBroker(brokerAccountId: string): StreamSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      sub => sub.brokerAccountId === brokerAccountId && sub.active
    );
  }

  getSubscriptionsByUser(userId: string): StreamSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      sub => sub.userId === userId && sub.active
    );
  }

  async loadSubscriptionsFromDb(userId: string): Promise<void> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('streaming_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (data) {
      data.forEach(row => {
        const subscription: StreamSubscription = {
          id: row.id,
          userId: row.user_id,
          brokerAccountId: row.broker_account_id,
          dataType: row.data_type,
          filters: row.filters || {},
          createdAt: new Date(row.created_at),
          active: row.active,
        };
        this.subscriptions.set(subscription.id, subscription);
      });
    }
  }

  async clearOldSubscriptions(daysOld: number = 7): Promise<void> {
    const supabase = await createClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Delete from database
    await supabase
      .from('streaming_subscriptions')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    // Clean from memory
    Array.from(this.subscriptions.entries()).forEach(([id, sub]) => {
      if (sub.createdAt < cutoffDate) {
        this.subscriptions.delete(id);
      }
    });
  }
}

// Global subscription manager instance
export const subscriptionManager = new SubscriptionManager();
