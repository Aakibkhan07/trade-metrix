import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/api/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (userId) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ webhooks: data })
  })
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (userId) => {
    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: userId,
        url: body.url,
        events: body.events,
        active: true,
        description: body.description,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ webhook: data }, { status: 201 })
  })
}
