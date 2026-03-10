-- =====================================================
-- Phase 4: Analytics & Backtesting Schema
-- Trade Metrix Technologies
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Backtest status enum
CREATE TYPE backtest_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- Timeframe enum for historical data
CREATE TYPE timeframe AS ENUM ('1min', '5min', '15min', '30min', '1hour', '4hour', '1day', '1week', '1month');

-- =====================================================
-- TABLES
-- =====================================================

-- Historical OHLCV data cache
CREATE TABLE IF NOT EXISTS historical_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL DEFAULT 'NSE',
  timeframe timeframe NOT NULL DEFAULT '1day',
  timestamp TIMESTAMPTZ NOT NULL,
  open DECIMAL(18, 4) NOT NULL,
  high DECIMAL(18, 4) NOT NULL,
  low DECIMAL(18, 4) NOT NULL,
  close DECIMAL(18, 4) NOT NULL,
  volume BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, exchange, timeframe, timestamp)
);

-- Backtest run configurations
CREATE TABLE IF NOT EXISTS backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES trading_strategies(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL DEFAULT 'NSE',
  timeframe timeframe NOT NULL DEFAULT '1day',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital DECIMAL(18, 2) NOT NULL DEFAULT 100000,
  status backtest_status NOT NULL DEFAULT 'pending',
  config JSONB DEFAULT '{}',
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Backtest results and metrics
CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  
  -- Trade statistics
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  break_even_trades INTEGER DEFAULT 0,
  
  -- P&L metrics
  gross_profit DECIMAL(18, 2) DEFAULT 0,
  gross_loss DECIMAL(18, 2) DEFAULT 0,
  net_profit DECIMAL(18, 2) DEFAULT 0,
  net_profit_percent DECIMAL(10, 4) DEFAULT 0,
  
  -- Drawdown metrics
  max_drawdown DECIMAL(18, 2) DEFAULT 0,
  max_drawdown_percent DECIMAL(10, 4) DEFAULT 0,
  avg_drawdown DECIMAL(18, 2) DEFAULT 0,
  max_drawdown_duration INTEGER DEFAULT 0, -- in bars/periods
  
  -- Risk-adjusted returns
  sharpe_ratio DECIMAL(10, 4),
  sortino_ratio DECIMAL(10, 4),
  calmar_ratio DECIMAL(10, 4),
  
  -- Win/loss analysis
  win_rate DECIMAL(10, 4) DEFAULT 0,
  profit_factor DECIMAL(10, 4),
  expectancy DECIMAL(18, 2) DEFAULT 0,
  avg_win DECIMAL(18, 2) DEFAULT 0,
  avg_loss DECIMAL(18, 2) DEFAULT 0,
  largest_win DECIMAL(18, 2) DEFAULT 0,
  largest_loss DECIMAL(18, 2) DEFAULT 0,
  
  -- Consecutive trades
  max_consecutive_wins INTEGER DEFAULT 0,
  max_consecutive_losses INTEGER DEFAULT 0,
  
  -- Time metrics
  avg_trade_duration INTEGER DEFAULT 0, -- in bars
  time_in_market_percent DECIMAL(10, 4) DEFAULT 0,
  
  -- Final values
  final_equity DECIMAL(18, 2) DEFAULT 0,
  peak_equity DECIMAL(18, 2) DEFAULT 0,
  
  -- Equity curve (array of {date, equity, drawdown})
  equity_curve JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(backtest_run_id)
);

-- Individual backtest trades
CREATE TABLE IF NOT EXISTS backtest_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  trade_number INTEGER NOT NULL,
  
  -- Entry details
  entry_time TIMESTAMPTZ NOT NULL,
  entry_price DECIMAL(18, 4) NOT NULL,
  entry_signal VARCHAR(100),
  
  -- Exit details
  exit_time TIMESTAMPTZ,
  exit_price DECIMAL(18, 4),
  exit_signal VARCHAR(100),
  
  -- Trade details
  side VARCHAR(10) NOT NULL, -- 'long' or 'short'
  quantity INTEGER NOT NULL,
  
  -- P&L
  pnl DECIMAL(18, 2) DEFAULT 0,
  pnl_percent DECIMAL(10, 4) DEFAULT 0,
  
  -- Costs
  entry_fees DECIMAL(18, 4) DEFAULT 0,
  exit_fees DECIMAL(18, 4) DEFAULT 0,
  slippage DECIMAL(18, 4) DEFAULT 0,
  
  -- Risk metrics
  risk_amount DECIMAL(18, 2),
  r_multiple DECIMAL(10, 4),
  
  -- Running totals at trade close
  cumulative_pnl DECIMAL(18, 2) DEFAULT 0,
  equity_at_close DECIMAL(18, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily portfolio analytics snapshots
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Portfolio values
  total_equity DECIMAL(18, 2) NOT NULL,
  cash_balance DECIMAL(18, 2) NOT NULL,
  open_positions_value DECIMAL(18, 2) DEFAULT 0,
  
  -- P&L
  daily_pnl DECIMAL(18, 2) DEFAULT 0,
  daily_pnl_percent DECIMAL(10, 4) DEFAULT 0,
  cumulative_pnl DECIMAL(18, 2) DEFAULT 0,
  cumulative_pnl_percent DECIMAL(10, 4) DEFAULT 0,
  
  -- Positions
  open_positions_count INTEGER DEFAULT 0,
  trades_today INTEGER DEFAULT 0,
  
  -- Metrics at snapshot time
  metrics JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Historical data indexes
CREATE INDEX IF NOT EXISTS idx_historical_data_symbol ON historical_data(symbol);
CREATE INDEX IF NOT EXISTS idx_historical_data_lookup ON historical_data(symbol, exchange, timeframe, timestamp);
CREATE INDEX IF NOT EXISTS idx_historical_data_timestamp ON historical_data(timestamp);

-- Backtest runs indexes
CREATE INDEX IF NOT EXISTS idx_backtest_runs_user ON backtest_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_strategy ON backtest_runs(strategy_id);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_status ON backtest_runs(status);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_created ON backtest_runs(created_at DESC);

-- Backtest trades indexes
CREATE INDEX IF NOT EXISTS idx_backtest_trades_run ON backtest_trades(backtest_run_id);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_entry ON backtest_trades(entry_time);

-- Analytics snapshots indexes
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_user ON analytics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_lookup ON analytics_snapshots(user_id, snapshot_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Historical data is public (read-only for authenticated users)
ALTER TABLE historical_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historical_data_select_authenticated" ON historical_data
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "historical_data_insert_authenticated" ON historical_data
  FOR INSERT TO authenticated WITH CHECK (true);

-- Backtest runs - users can only see their own
ALTER TABLE backtest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backtest_runs_select_own" ON backtest_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "backtest_runs_insert_own" ON backtest_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "backtest_runs_update_own" ON backtest_runs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "backtest_runs_delete_own" ON backtest_runs
  FOR DELETE USING (auth.uid() = user_id);

-- Backtest results - access through backtest_runs ownership
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backtest_results_select_own" ON backtest_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM backtest_runs
      WHERE backtest_runs.id = backtest_results.backtest_run_id
      AND backtest_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "backtest_results_insert_own" ON backtest_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM backtest_runs
      WHERE backtest_runs.id = backtest_results.backtest_run_id
      AND backtest_runs.user_id = auth.uid()
    )
  );

-- Backtest trades - access through backtest_runs ownership
ALTER TABLE backtest_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backtest_trades_select_own" ON backtest_trades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM backtest_runs
      WHERE backtest_runs.id = backtest_trades.backtest_run_id
      AND backtest_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "backtest_trades_insert_own" ON backtest_trades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM backtest_runs
      WHERE backtest_runs.id = backtest_trades.backtest_run_id
      AND backtest_runs.user_id = auth.uid()
    )
  );

-- Analytics snapshots - users can only see their own
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_snapshots_select_own" ON analytics_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "analytics_snapshots_insert_own" ON analytics_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "analytics_snapshots_update_own" ON analytics_snapshots
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate win rate
CREATE OR REPLACE FUNCTION calculate_win_rate(winning INTEGER, total INTEGER)
RETURNS DECIMAL(10, 4) AS $$
BEGIN
  IF total = 0 THEN RETURN 0; END IF;
  RETURN (winning::DECIMAL / total::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate profit factor
CREATE OR REPLACE FUNCTION calculate_profit_factor(gross_profit DECIMAL, gross_loss DECIMAL)
RETURNS DECIMAL(10, 4) AS $$
BEGIN
  IF gross_loss = 0 THEN RETURN NULL; END IF;
  RETURN ABS(gross_profit / gross_loss);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get user's portfolio summary
CREATE OR REPLACE FUNCTION get_portfolio_summary(p_user_id UUID)
RETURNS TABLE (
  total_equity DECIMAL,
  total_pnl DECIMAL,
  open_positions INTEGER,
  win_rate DECIMAL,
  sharpe_ratio DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.total_equity, 0) AS total_equity,
    COALESCE(s.cumulative_pnl, 0) AS total_pnl,
    COALESCE(s.open_positions_count, 0) AS open_positions,
    COALESCE((s.metrics->>'win_rate')::DECIMAL, 0) AS win_rate,
    COALESCE((s.metrics->>'sharpe_ratio')::DECIMAL, 0) AS sharpe_ratio
  FROM analytics_snapshots s
  WHERE s.user_id = p_user_id
  ORDER BY s.snapshot_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED DATA (Sample historical data for testing)
-- =====================================================

-- Insert sample NIFTY 50 historical data for testing
INSERT INTO historical_data (symbol, exchange, timeframe, timestamp, open, high, low, close, volume)
SELECT
  'NIFTY50',
  'NSE',
  '1day',
  date_trunc('day', NOW() - (n || ' days')::INTERVAL),
  20000 + (RANDOM() * 500),
  20000 + (RANDOM() * 600),
  19800 + (RANDOM() * 400),
  20000 + (RANDOM() * 500),
  (RANDOM() * 1000000)::BIGINT
FROM generate_series(1, 365) AS n
ON CONFLICT (symbol, exchange, timeframe, timestamp) DO NOTHING;

-- Insert sample RELIANCE historical data
INSERT INTO historical_data (symbol, exchange, timeframe, timestamp, open, high, low, close, volume)
SELECT
  'RELIANCE',
  'NSE',
  '1day',
  date_trunc('day', NOW() - (n || ' days')::INTERVAL),
  2400 + (RANDOM() * 100),
  2420 + (RANDOM() * 100),
  2380 + (RANDOM() * 80),
  2400 + (RANDOM() * 100),
  (RANDOM() * 5000000)::BIGINT
FROM generate_series(1, 365) AS n
ON CONFLICT (symbol, exchange, timeframe, timestamp) DO NOTHING;

-- Insert sample TCS historical data
INSERT INTO historical_data (symbol, exchange, timeframe, timestamp, open, high, low, close, volume)
SELECT
  'TCS',
  'NSE',
  '1day',
  date_trunc('day', NOW() - (n || ' days')::INTERVAL),
  3500 + (RANDOM() * 150),
  3520 + (RANDOM() * 150),
  3480 + (RANDOM() * 120),
  3500 + (RANDOM() * 150),
  (RANDOM() * 2000000)::BIGINT
FROM generate_series(1, 365) AS n
ON CONFLICT (symbol, exchange, timeframe, timestamp) DO NOTHING;

-- Insert sample INFY historical data
INSERT INTO historical_data (symbol, exchange, timeframe, timestamp, open, high, low, close, volume)
SELECT
  'INFY',
  'NSE',
  '1day',
  date_trunc('day', NOW() - (n || ' days')::INTERVAL),
  1500 + (RANDOM() * 80),
  1520 + (RANDOM() * 80),
  1480 + (RANDOM() * 60),
  1500 + (RANDOM() * 80),
  (RANDOM() * 3000000)::BIGINT
FROM generate_series(1, 365) AS n
ON CONFLICT (symbol, exchange, timeframe, timestamp) DO NOTHING;

-- Insert sample HDFC historical data
INSERT INTO historical_data (symbol, exchange, timeframe, timestamp, open, high, low, close, volume)
SELECT
  'HDFCBANK',
  'NSE',
  '1day',
  date_trunc('day', NOW() - (n || ' days')::INTERVAL),
  1600 + (RANDOM() * 100),
  1620 + (RANDOM() * 100),
  1580 + (RANDOM() * 80),
  1600 + (RANDOM() * 100),
  (RANDOM() * 4000000)::BIGINT
FROM generate_series(1, 365) AS n
ON CONFLICT (symbol, exchange, timeframe, timestamp) DO NOTHING;
