import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BacktestEngine } from '@/lib/backtesting/backtest-engine'
import { StrategyEvaluator } from '@/lib/backtesting/strategy-evaluator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await request.json()

    // Validate configuration
    const validationErrors = StrategyEvaluator.validateConfig(config)
    if (validationErrors.length > 0) {
      return NextResponse.json({ errors: validationErrors }, { status: 400 })
    }

    // Create backtest run record
    const { data: runData, error: runError } = await supabase
      .from('backtest_runs')
      .insert({
        user_id: user.id,
        strategy_id: config.strategyId,
        symbol: config.symbol,
        exchange: config.exchange,
        start_date: config.startDate,
        end_date: config.endDate,
        initial_capital: config.initialCapital,
        risk_percentage: config.riskPercentage,
        slippage: config.slippage,
        commission_percentage: config.commissionPercentage,
        entry_conditions: config.entryConditions,
        exit_conditions: config.exitConditions,
        stop_loss_percentage: config.stopLossPercentage,
        take_profit_percentage: config.takeProfitPercentage,
        status: 'running',
      })
      .select()
      .single()

    if (runError) throw runError

    // Run backtest asynchronously
    (async () => {
      try {
        const engine = new BacktestEngine()
        const result = await engine.runBacktest(config)

        // Store results
        await supabase
          .from('backtest_results')
          .insert({
            backtest_run_id: runData.id,
            metrics: result.metrics,
            trades_count: result.trades.length,
            data: {
              trades: result.trades,
              equityCurve: result.equityCurve,
              drawdownCurve: result.drawdownCurve,
              monthlyReturns: result.monthlyReturns,
            },
          })

        // Update run status
        await supabase
          .from('backtest_runs')
          .update({ status: 'completed', completed_at: new Date() })
          .eq('id', runData.id)
      } catch (err: any) {
        console.error('[v0] Backtest error:', err)
        await supabase
          .from('backtest_runs')
          .update({ status: 'failed', error: err.message })
          .eq('id', runData.id)
      }
    })()

    return NextResponse.json({ id: runData.id, status: 'running' })
  } catch (err: any) {
    console.error('[v0] Backtest API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
