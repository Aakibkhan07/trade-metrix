import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get backtest run
    const { data: run, error: runError } = await supabase
      .from('backtest_runs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Backtest not found' }, { status: 404 })
    }

    // Get results
    const { data: results, error: resultsError } = await supabase
      .from('backtest_results')
      .select('*')
      .eq('backtest_run_id', params.id)
      .single()

    if (resultsError) {
      return NextResponse.json(run)
    }

    return NextResponse.json({ ...run, result: results })
  } catch (err: any) {
    console.error('[v0] Get backtest error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('backtest_runs')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[v0] Delete backtest error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
