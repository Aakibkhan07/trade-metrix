import { BacktestTrade, BacktestMetrics, OHLCV } from './types'

export class MetricsCalculator {
  static calculateMetrics(trades: BacktestTrade[], equityCurve: number[], initialCapital: number, startDate: Date, endDate: Date): BacktestMetrics {
    if (trades.length === 0) {
      return this.getEmptyMetrics(initialCapital)
    }

    const winningTrades = trades.filter(t => t.pnl > 0)
    const losingTrades = trades.filter(t => t.pnl <= 0)
    
    const totalReturn = equityCurve[equityCurve.length - 1] - initialCapital
    const roi = (totalReturn / initialCapital) * 100
    
    const wins = winningTrades.map(t => t.pnl)
    const losses = losingTrades.map(t => Math.abs(t.pnl))
    
    const grossProfit = wins.reduce((a, b) => a + b, 0)
    const grossLoss = losses.reduce((a, b) => a + b, 0)
    
    const averageWin = wins.length > 0 ? grossProfit / wins.length : 0
    const averageLoss = losses.length > 0 ? grossLoss / losses.length : 0
    
    const profitFactor = grossLoss !== 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
    
    const expectancy = averageWin * (winningTrades.length / trades.length) - averageLoss * (losingTrades.length / trades.length)
    
    const avgWinLossRatio = averageLoss !== 0 ? averageWin / averageLoss : averageWin > 0 ? Infinity : 0
    const rMultiple = expectancy / averageLoss
    
    // Max consecutive wins/losses
    let maxConsecutiveWins = 0
    let maxConsecutiveLosses = 0
    let currentWins = 0
    let currentLosses = 0
    
    for (const trade of trades) {
      if (trade.pnl > 0) {
        currentWins++
        currentLosses = 0
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins)
      } else {
        currentLosses++
        currentWins = 0
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses)
      }
    }
    
    // Drawdown calculations
    let peak = initialCapital
    let maxDrawdown = 0
    const drawdowns: number[] = []
    
    for (const value of equityCurve) {
      if (value > peak) {
        peak = value
      }
      const dd = peak - value
      drawdowns.push(dd)
      maxDrawdown = Math.max(maxDrawdown, dd)
    }
    
    const maxDrawdownPercent = (maxDrawdown / initialCapital) * 100
    
    // Sharpe Ratio
    const dailyReturns = this.calculateDailyReturns(equityCurve)
    const stdDev = this.standardDeviation(dailyReturns)
    const sharpeRatio = stdDev !== 0 ? (this.mean(dailyReturns) * 252) / (stdDev * Math.sqrt(252)) : 0
    
    // Sortino Ratio
    const downside = dailyReturns.filter(r => r < 0)
    const downsideStdDev = downside.length > 0 ? this.standardDeviation(downside) : 0
    const sortinoRatio = downsideStdDev !== 0 ? (this.mean(dailyReturns) * 252) / (downsideStdDev * Math.sqrt(252)) : 0
    
    // Calmar Ratio
    const daysInPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const yearsInPeriod = daysInPeriod / 365
    const cagr = Math.pow(equityCurve[equityCurve.length - 1] / initialCapital, 1 / yearsInPeriod) - 1
    const calmarRatio = maxDrawdownPercent !== 0 ? cagr / (maxDrawdownPercent / 100) : 0
    
    const recoveryFactor = maxDrawdown !== 0 ? totalReturn / maxDrawdown : totalReturn > 0 ? Infinity : 0
    
    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      averageWin,
      averageLoss,
      profitFactor,
      expectancy,
      rMultiple,
      grossProfit,
      grossLoss,
      netProfit: totalReturn,
      roi,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      recoveryFactor,
      stdDev,
      dailyVolatility: stdDev,
      cagr,
      startingCapital: initialCapital,
      endingCapital: equityCurve[equityCurve.length - 1],
      totalReturn,
      totalReturnPercent: roi,
    }
  }

  private static calculateDailyReturns(equityCurve: number[]): number[] {
    const returns: number[] = []
    for (let i = 1; i < equityCurve.length; i++) {
      const ret = (equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]
      returns.push(ret)
    }
    return returns
  }

  private static mean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  private static standardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    const avg = this.mean(values)
    const squareDiffs = values.map(v => Math.pow(v - avg, 2))
    const variance = this.mean(squareDiffs)
    return Math.sqrt(variance)
  }

  private static getEmptyMetrics(initialCapital: number): BacktestMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      rMultiple: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      roi: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      recoveryFactor: 0,
      stdDev: 0,
      dailyVolatility: 0,
      cagr: 0,
      startingCapital: initialCapital,
      endingCapital: initialCapital,
      totalReturn: 0,
      totalReturnPercent: 0,
    }
  }
}
