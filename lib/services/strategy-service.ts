import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export interface CreateStrategyInput {
  name: string
  description?: string
  strategy_type: string
  entry_condition: Record<string, any>
  exit_condition: Record<string, any>
  risk_management: {
    stop_loss_pips: number
    take_profit_pips: number
    max_trades_per_day: number
    max_drawdown_percent: number
  }
  broker_id: string
}

export interface UpdateStrategyInput {
  name?: string
  description?: string
  entry_condition?: Record<string, any>
  exit_condition?: Record<string, any>
  risk_management?: Record<string, any>
  is_active?: boolean
}

export async function createStrategy(input: CreateStrategyInput) {
  const supabase = await createClient()
  const headersList = await headers()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('trading_strategies')
    .insert({
      user_id: user.data.user.id,
      ...input,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getStrategies() {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('trading_strategies')
    .select('*')
    .eq('user_id', user.data.user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getStrategy(strategyId: string) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('trading_strategies')
    .select('*')
    .eq('id', strategyId)
    .eq('user_id', user.data.user.id)
    .single()

  if (error) throw error
  return data
}

export async function updateStrategy(strategyId: string, input: UpdateStrategyInput) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('trading_strategies')
    .update(input)
    .eq('id', strategyId)
    .eq('user_id', user.data.user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteStrategy(strategyId: string) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('trading_strategies')
    .delete()
    .eq('id', strategyId)
    .eq('user_id', user.data.user.id)

  if (error) throw error
  return { success: true }
}

export async function activateStrategy(strategyId: string) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('trading_strategies')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', user.data.user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deactivateStrategy(strategyId: string) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('trading_strategies')
    .update({ status: 'inactive', deactivated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', user.data.user.id)
    .select()
    .single()

  if (error) throw error
  return data
}
