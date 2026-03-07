import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, checkScope } from '@/lib/api/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (userId, scopes) => {
    if (!checkScope(scopes, 'read:account')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ account: data })
  })
}
