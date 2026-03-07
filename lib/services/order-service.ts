import { createClient } from '@/lib/supabase/server'

export interface CreateOrderInput {
  strategy_id?: string
  symbol: string
  order_type: 'buy' | 'sell'
  quantity: number
  entry_price: number
  stop_loss: number
  take_profit: number
  broker_id: string
}

export interface UpdateOrderInput {
  status?: string
  actual_entry_price?: number
  execution_time?: string
}

export async function createOrder(input: CreateOrderInput) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.data.user.id,
      ...input,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getOrders(strategyId?: string) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.data.user.id)

  if (strategyId) {
    query = query.eq('strategy_id', strategyId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getOrder(orderId: string) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', user.data.user.id)
    .single()

  if (error) throw error
  return data
}

export async function updateOrder(orderId: string, input: UpdateOrderInput) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('orders')
    .update(input)
    .eq('id', orderId)
    .eq('user_id', user.data.user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function executeOrder(orderId: string, actualPrice: number) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', user.data.user.id)
    .single()

  if (fetchError) throw fetchError

  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'executed',
      actual_entry_price: actualPrice,
      execution_time: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) throw updateError

  // Create trade record
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .insert({
      user_id: user.data.user.id,
      order_id: orderId,
      strategy_id: order.strategy_id,
      symbol: order.symbol,
      order_type: order.order_type,
      quantity: order.quantity,
      entry_price: actualPrice,
      stop_loss: order.stop_loss,
      take_profit: order.take_profit,
      status: 'open',
      entry_time: new Date().toISOString(),
    })
    .select()
    .single()

  if (tradeError) throw tradeError

  return { order, trade }
}

export async function cancelOrder(orderId: string) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .eq('user_id', user.data.user.id)
    .select()
    .single()

  if (error) throw error
  return data
}
