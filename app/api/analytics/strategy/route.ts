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

    if (!strategyId) {
      return NextResponse.json({ error: 'Strategy ID required' }, { status: 400 })
    }

    // Get all backtests for strategy
    const { data: runs, error: runsError } = await supabase
      .from('backtest_runs')
      .select('*')
      .eq('user_id', user.id)
      .eq('strategy_id', strategyId)

    if (runsError) throw runsError

    let totalTrades = 0
    let winRate = 0
    let profitFactor = 0
    let sharpeRatio = 0
    let winCount = 0

    for (const run of runs) {
      const { data: result } = await supabase
        .from('backtest_results')
        .select('metrics')
        .eq('backtest_run_id', run.id)
        .single()

      if (result?.metrics) {
        totalTrades += result.metrics.totalTrades
        winRate += result.metrics.winRate
        profitFactor += result.metrics.profitFactor
        sharpeRatio += result.metrics.sharpeRatio
        winCount++
      }
    }

    const analytics = {
      backtestCount: runs.length,
      averageTradesPerBacktest: runs.length > 0 ? totalTrades / runs.length : 0,
      averageWinRate: winCount > 0 ? winRate / winCount : 0,
      averageProfitFactor: winCount > 0 ? profitFactor / winCount : 0,
      averageSharpeRatio: winCount > 0 ? sharpeRatio / winCount : 0,
    }

    return NextResponse.json(analytics)
  } catch (err: any) {
    console.error('[v0] Strategy analytics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
