import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all backtests
    const { data: runs, error: runsError } = await supabase
      .from('backtest_runs')
      .select('*')
      .eq('user_id', user.id)

    if (runsError) throw runsError

    let maxDrawdown = 0
    let avgDrawdown = 0
    let var95 = 0
    let drawdownCount = 0

    for (const run of runs) {
      const { data: result } = await supabase
        .from('backtest_results')
        .select('metrics')
        .eq('backtest_run_id', run.id)
        .single()

      if (result?.metrics) {
        maxDrawdown = Math.max(maxDrawdown, result.metrics.maxDrawdown)
        avgDrawdown += result.metrics.maxDrawdown
        drawdownCount++
      }
    }

    const analytics = {
      maxDrawdown,
      averageDrawdown: drawdownCount > 0 ? avgDrawdown / drawdownCount : 0,
      portfolioVar95: var95,
      riskMetrics: {
        totalBacktests: runs.length,
        completedBacktests: runs.filter(r => r.status === 'completed').length,
        failedBacktests: runs.filter(r => r.status === 'failed').length,
      },
    }

    return NextResponse.json(analytics)
  } catch (err: any) {
    console.error('[v0] Risk analytics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
