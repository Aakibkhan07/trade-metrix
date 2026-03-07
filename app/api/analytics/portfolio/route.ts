import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get portfolio-level analytics
    const { data: runs, error: runsError } = await supabase
      .from('backtest_runs')
      .select('*')
      .eq('user_id', user.id)

    if (runsError) throw runsError

    // Calculate aggregate metrics
    const totalRuns = runs.length
    const completedRuns = runs.filter(r => r.status === 'completed').length
    
    let totalPnL = 0
    let totalReturn = 0
    let bestPerformance = -Infinity
    let worstPerformance = Infinity

    for (const run of runs) {
      const { data: result } = await supabase
        .from('backtest_results')
        .select('metrics')
        .eq('backtest_run_id', run.id)
        .single()

      if (result?.metrics) {
        totalPnL += result.metrics.netProfit
        totalReturn += result.metrics.totalReturnPercent
        bestPerformance = Math.max(bestPerformance, result.metrics.totalReturnPercent)
        worstPerformance = Math.min(worstPerformance, result.metrics.totalReturnPercent)
      }
    }

    const analytics = {
      totalRuns,
      completedRuns,
      totalPnL,
      averageReturn: completedRuns > 0 ? totalReturn / completedRuns : 0,
      bestPerformance: bestPerformance === -Infinity ? 0 : bestPerformance,
      worstPerformance: worstPerformance === Infinity ? 0 : worstPerformance,
    }

    return NextResponse.json(analytics)
  } catch (err: any) {
    console.error('[v0] Portfolio analytics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
