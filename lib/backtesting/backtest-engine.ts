import { BacktestConfig, BacktestTrade, OHLCV, BacktestResult } from './types'
import { MetricsCalculator } from './metrics-calculator'
import { createClient } from '@/lib/supabase/server'

export class BacktestEngine {
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const supabase = await createClient()
    
    // Fetch historical data
    const historicalData = await this.fetchHistoricalData(
      config.symbol,
      config.startDate,
      config.endDate
    )

    if (historicalData.length === 0) {
      throw new Error('No historical data available for the specified period')
    }

    // Sort by date
    historicalData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Simulate trading
    const trades: BacktestTrade[] = []
    let cash = config.initialCapital
    let position: { quantity: number; entryPrice: number; entryTime: Date } | null = null
    const equityCurve: number[] = [config.initialCapital]
    const portfolioValues: { date: Date; value: number }[] = []

    for (let i = 1; i < historicalData.length; i++) {
      const prevBar = historicalData[i - 1]
      const currentBar = historicalData[i]

      // Check entry signal
      if (!position && this.checkEntrySignal(historicalData, i, config.entryConditions)) {
        const entryPrice = currentBar.close * (1 + config.slippage / 100)
        const quantity = Math.floor((cash * (config.riskPercentage / 100)) / entryPrice)
        
        if (quantity > 0) {
          position = { quantity, entryPrice, entryTime: new Date(currentBar.timestamp) }
          cash -= quantity * entryPrice
        }
      }

      // Check exit signal or stop loss
      if (position) {
        const exitPrice = currentBar.close * (1 - config.slippage / 100)
        const pnl = (exitPrice - position.entryPrice) * position.quantity
        const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100

        let shouldExit = false

        // Check stop loss
        if (config.stopLossPercentage && pnlPercent <= -config.stopLossPercentage) {
          shouldExit = true
        }

        // Check take profit
        if (config.takeProfitPercentage && pnlPercent >= config.takeProfitPercentage) {
          shouldExit = true
        }

        // Check exit conditions
        if (this.checkExitSignal(historicalData, i, config.exitConditions)) {
          shouldExit = true
        }

        if (shouldExit) {
          const trade: BacktestTrade = {
            entryPrice: position.entryPrice,
            entryTime: position.entryTime,
            exitPrice,
            exitTime: new Date(currentBar.timestamp),
            quantity: position.quantity,
            side: 'LONG',
            pnl,
            pnlPercent,
            returns: pnl / (position.quantity * position.entryPrice),
            runupPercent: ((currentBar.high - position.entryPrice) / position.entryPrice) * 100,
            drawdownPercent: ((currentBar.low - position.entryPrice) / position.entryPrice) * 100,
            mae: ((currentBar.low - position.entryPrice) / position.entryPrice) * 100,
            mfe: ((currentBar.high - position.entryPrice) / position.entryPrice) * 100,
            bars: i - historicalData.indexOf(historicalData.find(h => h.timestamp === position!.entryTime.toISOString())!),
          }

          trades.push(trade)
          cash += exitPrice * position.quantity
          position = null
        }
      }

      // Update equity curve
      let portfolioValue = cash
      if (position) {
        portfolioValue += position.quantity * currentBar.close
      }
      equityCurve.push(portfolioValue)
      portfolioValues.push({ date: new Date(currentBar.timestamp), value: portfolioValue })
    }

    // Calculate metrics
    const metrics = MetricsCalculator.calculateMetrics(
      trades,
      equityCurve,
      config.initialCapital,
      config.startDate,
      config.endDate
    )

    // Calculate monthly returns
    const monthlyReturns = this.calculateMonthlyReturns(portfolioValues)
    
    // Calculate drawdown curve
    const drawdownCurve = this.calculateDrawdownCurve(equityCurve)

    const result: BacktestResult = {
      id: crypto.randomUUID(),
      userId: (await supabase.auth.getUser()).data.user?.id || '',
      strategyId: config.strategyId,
      config,
      metrics,
      trades,
      equityCurve: portfolioValues,
      drawdownCurve,
      monthlyReturns,
      createdAt: new Date(),
      completedAt: new Date(),
      status: 'completed',
    }

    return result
  }

  private checkEntrySignal(data: OHLCV[], index: number, conditions: Record<string, any>): boolean {
    // Simple RSI-based entry (can be extended)
    if (conditions.rsiThreshold) {
      const rsi = this.calculateRSI(data, index, 14)
      return rsi < conditions.rsiThreshold
    }
    return true
  }

  private checkExitSignal(data: OHLCV[], index: number, conditions: Record<string, any>): boolean {
    // Simple RSI-based exit
    if (conditions.rsiThreshold) {
      const rsi = this.calculateRSI(data, index, 14)
      return rsi > conditions.rsiThreshold
    }
    return false
  }

  private calculateRSI(data: OHLCV[], index: number, period: number): number {
    if (index < period) return 50

    let gains = 0,
      losses = 0
    for (let i = index - period; i < index; i++) {
      const change = data[i + 1].close - data[i].close
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  private calculateMonthlyReturns(portfolioValues: Array<{ date: Date; value: number }>): Record<string, number> {
    const monthly: Record<string, number> = {}

    for (let i = 1; i < portfolioValues.length; i++) {
      const monthKey = `${portfolioValues[i].date.getFullYear()}-${String(portfolioValues[i].date.getMonth() + 1).padStart(2, '0')}`
      if (!monthly[monthKey]) {
        monthly[monthKey] = 0
      }
      monthly[monthKey] = (portfolioValues[i].value - portfolioValues[i - 1].value) / portfolioValues[i - 1].value
    }

    return monthly
  }

  private calculateDrawdownCurve(equityCurve: number[]): Array<{ date: Date; value: number }> {
    let peak = equityCurve[0]
    const drawdownCurve: Array<{ date: Date; value: number }> = []

    for (let i = 0; i < equityCurve.length; i++) {
      if (equityCurve[i] > peak) {
        peak = equityCurve[i]
      }
      const dd = ((peak - equityCurve[i]) / peak) * 100
      drawdownCurve.push({ date: new Date(Date.now() + i * 86400000), value: dd })
    }

    return drawdownCurve
  }

  private async fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<OHLCV[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('historical_data')
      .select('open,high,low,close,volume,timestamp')
      .eq('symbol', symbol)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true })

    if (error) throw error
    
    return (data || []).map(d => ({
      ...d,
      timestamp: new Date(d.timestamp),
    }))
  }
}
