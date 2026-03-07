export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: Date
}

export interface BacktestConfig {
  strategyId: string
  symbol: string
  exchange: string
  startDate: Date
  endDate: Date
  initialCapital: number
  riskPercentage: number
  slippage: number // in percentage
  commissionPercentage: number
  entryConditions: Record<string, any>
  exitConditions: Record<string, any>
  stopLossPercentage?: number
  takeProfitPercentage?: number
}

export interface BacktestTrade {
  entryPrice: number
  entryTime: Date
  exitPrice: number
  exitTime: Date
  quantity: number
  side: 'LONG' | 'SHORT'
  pnl: number
  pnlPercent: number
  returns: number
  runupPercent: number
  drawdownPercent: number
  mae: number // Maximum Adverse Excursion
  mfe: number // Maximum Favorable Excursion
  bars: number
}

export interface BacktestMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  expectancy: number
  rMultiple: number
  grossProfit: number
  grossLoss: number
  netProfit: number
  roi: number
  maxConsecutiveWins: number
  maxConsecutiveLosses: number
  
  // Risk metrics
  maxDrawdown: number
  maxDrawdownPercent: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  recoveryFactor: number
  
  // Volatility
  stdDev: number
  dailyVolatility: number
  
  // Performance
  cagr: number
  startingCapital: number
  endingCapital: number
  totalReturn: number
  totalReturnPercent: number
}

export interface BacktestResult {
  id: string
  userId: string
  strategyId: string
  config: BacktestConfig
  metrics: BacktestMetrics
  trades: BacktestTrade[]
  equityCurve: Array<{ date: Date; value: number }>
  drawdownCurve: Array<{ date: Date; value: number }>
  monthlyReturns: Record<string, number>
  createdAt: Date
  completedAt?: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
}
