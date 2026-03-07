import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, checkScope } from '@/lib/api/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (userId, scopes) => {
    if (!checkScope(scopes, 'read:strategies')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ strategies: data })
  })
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (userId, scopes) => {
    if (!checkScope(scopes, 'write:strategies')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('trading_strategies')
      .insert({
        user_id: userId,
        name: body.name,
        strategy_type: body.strategy_type,
        entry_signal: body.entry_signal,
        exit_signal: body.exit_signal,
        stop_loss: body.stop_loss,
        take_profit: body.take_profit,
        status: 'draft',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ strategy: data }, { status: 201 })
  })
}
