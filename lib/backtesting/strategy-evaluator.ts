import { BacktestConfig } from './types'

export class StrategyEvaluator {
  /**
   * Evaluate strategy entry/exit signals
   */
  static evaluateSignal(
    ohlcData: { open: number; high: number; low: number; close: number }[],
    index: number,
    signalType: 'entry' | 'exit',
    conditions: Record<string, any>
  ): boolean {
    if (!conditions) return false

    // RSI signal
    if (conditions.rsiEnabled) {
      const rsi = this.calculateRSI(ohlcData, index, conditions.rsiPeriod || 14)
      if (signalType === 'entry') {
        return rsi < (conditions.rsiOversold || 30)
      } else {
        return rsi > (conditions.rsiOverbought || 70)
      }
    }

    // MA crossover
    if (conditions.maEnabled) {
      const fastMA = this.calculateMA(ohlcData, index, conditions.fastMAPeriod || 10)
      const slowMA = this.calculateMA(ohlcData, index, conditions.slowMAPeriod || 20)
      
      if (signalType === 'entry') {
        return fastMA > slowMA
      } else {
        return fastMA < slowMA
      }
    }

    // Simple price threshold
    if (conditions.priceThreshold) {
      const currentPrice = ohlcData[index].close
      if (signalType === 'entry') {
        return currentPrice <= conditions.priceThreshold
      } else {
        return currentPrice >= conditions.priceThreshold
      }
    }

    return true
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private static calculateRSI(data: { close: number }[], index: number, period: number): number {
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

  /**
   * Calculate Moving Average
   */
  private static calculateMA(data: { close: number }[], index: number, period: number): number {
    if (index < period - 1) return data[index].close

    let sum = 0
    for (let i = index - period + 1; i <= index; i++) {
      sum += data[i].close
    }
    return sum / period
  }

  /**
   * Validate strategy configuration
   */
  static validateConfig(config: BacktestConfig): string[] {
    const errors: string[] = []

    if (config.startDate >= config.endDate) {
      errors.push('Start date must be before end date')
    }

    if (config.initialCapital <= 0) {
      errors.push('Initial capital must be positive')
    }

    if (config.riskPercentage <= 0 || config.riskPercentage > 100) {
      errors.push('Risk percentage must be between 0 and 100')
    }

    if (config.slippage < 0) {
      errors.push('Slippage must be non-negative')
    }

    if (config.commissionPercentage < 0) {
      errors.push('Commission must be non-negative')
    }

    if (!config.symbol) {
      errors.push('Symbol is required')
    }

    return errors
  }

  /**
   * Calculate position size using Kelly Criterion
   */
  static calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
    if (avgLoss === 0) return 0

    const winProbability = winRate / 100
    const lossProbability = 1 - winProbability
    const winLossRatio = avgWin / avgLoss

    const kellyCriterion = (winProbability * winLossRatio - lossProbability) / winLossRatio

    // Cap Kelly to 25% of bankroll for safety
    return Math.max(0, Math.min(0.25, kellyCriterion))
  }
}
