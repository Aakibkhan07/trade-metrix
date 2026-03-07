import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, checkScope } from '@/lib/api/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (userId, scopes) => {
    if (!checkScope(scopes, 'read:orders')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ orders: data })
  })
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (userId, scopes) => {
    if (!checkScope(scopes, 'write:orders')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        symbol: body.symbol,
        order_type: body.order_type,
        quantity: body.quantity,
        price: body.price,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ order: data }, { status: 201 })
  })
}
