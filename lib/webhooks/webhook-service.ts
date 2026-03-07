import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export type WebhookEvent = 'order.created' | 'order.filled' | 'position.opened' | 'position.closed' | 'strategy.activated'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: any
}

export async function triggerWebhook(userId: string, event: WebhookEvent, data: any): Promise<void> {
  const supabase = await createClient()

  // Get all active webhooks for this user subscribed to this event
  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .contains('events', [event])

  if (error || !webhooks) return

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  // Queue delivery for each webhook
  for (const webhook of webhooks) {
    await queueWebhookDelivery(webhook.id, payload)
  }
}

async function queueWebhookDelivery(webhookId: string, payload: WebhookPayload): Promise<void> {
  const supabase = await createClient()

  // Create HMAC signature
  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET || 'secret')
    .update(JSON.stringify(payload))
    .digest('hex')

  await supabase.from('webhook_deliveries').insert({
    webhook_id: webhookId,
    event: payload.event,
    payload,
    signature,
    status: 'pending',
    attempt: 0,
  })
}

export async function processWebhookQueue(): Promise<void> {
  const supabase = await createClient()

  // Get pending deliveries
  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('status', 'pending')
    .lt('attempt', 5)

  if (!deliveries) return

  for (const delivery of deliveries) {
    await sendWebhookDelivery(delivery.id, delivery)
  }
}

async function sendWebhookDelivery(deliveryId: string, delivery: any): Promise<void> {
  const supabase = await createClient()

  try {
    // Get webhook URL
    const { data: webhook } = await supabase
      .from('webhooks')
      .select('url, active')
      .eq('id', delivery.webhook_id)
      .single()

    if (!webhook?.active) {
      await supabase
        .from('webhook_deliveries')
        .update({ status: 'failed', error: 'Webhook inactive' })
        .eq('id', deliveryId)
      return
    }

    // Send webhook
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': delivery.signature,
      },
      body: JSON.stringify(delivery.payload),
    })

    if (response.ok) {
      await supabase
        .from('webhook_deliveries')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', deliveryId)
    } else {
      // Retry with exponential backoff
      const backoff = Math.pow(2, delivery.attempt) * 1000
      const nextRetry = new Date(Date.now() + backoff)

      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'pending',
          attempt: delivery.attempt + 1,
          next_retry_at: nextRetry.toISOString(),
          error: `HTTP ${response.status}`,
        })
        .eq('id', deliveryId)
    }
  } catch (error: any) {
    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'pending',
        attempt: delivery.attempt + 1,
        error: error.message,
      })
      .eq('id', deliveryId)
  }
}
