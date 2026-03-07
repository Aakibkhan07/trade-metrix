import { createClient } from '@/lib/supabase/server'

export async function getPositions() {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.data.user.id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getPosition(positionId: string) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .eq('user_id', user.data.user.id)
    .single()

  if (error) throw error
  return data
}

export async function closePosition(positionId: string, exitPrice: number) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  const { data: position, error: fetchError } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .eq('user_id', user.data.user.id)
    .single()

  if (fetchError) throw fetchError

  const pnl = (exitPrice - position.entry_price) * position.quantity
  const pnl_percent = ((exitPrice - position.entry_price) / position.entry_price) * 100

  const { data, error } = await supabase
    .from('positions')
    .update({
      status: 'closed',
      exit_price: exitPrice,
      exit_time: new Date().toISOString(),
      pnl,
      pnl_percent,
    })
    .eq('id', positionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPositionStats() {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) {
    throw new Error('Unauthorized')
  }

  // Get open positions
  const { data: openPositions, error: openError } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.data.user.id)
    .eq('status', 'open')

  if (openError) throw openError

  // Get closed positions for stats
  const { data: closedPositions, error: closedError } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.data.user.id)
    .eq('status', 'closed')

  if (closedError) throw closedError

  const openPNL = openPositions?.reduce((sum, p) => sum + (p.pnl || 0), 0) || 0
  const closedPNL = closedPositions?.reduce((sum, p) => sum + p.pnl, 0) || 0
  const totalPNL = openPNL + closedPNL

  const winningTrades = closedPositions?.filter(p => p.pnl > 0).length || 0
  const totalTrades = closedPositions?.length || 0
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  return {
    openPositions: openPositions?.length || 0,
    closedPositions: totalTrades,
    openPNL,
    closedPNL,
    totalPNL,
    winRate,
    winningTrades,
  }
}
