import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategyId')

    let query = supabase
      .from('backtest_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (strategyId) {
      query = query.eq('strategy_id', strategyId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[v0] Get backtest results error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
