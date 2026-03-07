-- Trade Metrix Technologies - Phase 3: Trading Engine Schema
-- Complete database schema for algo trading platform

-- ============================================
-- ENUMS
-- ============================================

-- User roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('master_admin', 'admin', 'trader');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Strategy status
DO $$ BEGIN
  CREATE TYPE strategy_status AS ENUM ('draft', 'active', 'paused', 'stopped', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Execution status
DO $$ BEGIN
  CREATE TYPE execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Order type
DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop_loss', 'stop_limit', 'trailing_stop');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Order side
DO $$ BEGIN
  CREATE TYPE order_side AS ENUM ('buy', 'sell');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Order status
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Position status
DO $$ BEGIN
  CREATE TYPE position_status AS ENUM ('open', 'closed', 'partially_closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Product type (for Indian markets)
DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('CNC', 'MIS', 'NRML', 'BO', 'CO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Exchange
DO $$ BEGIN
  CREATE TYPE exchange_type AS ENUM ('NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'BFO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Broker type
DO $$ BEGIN
  CREATE TYPE broker_type AS ENUM ('zerodha', 'angel_one', 'shoonya', 'alice_blue', 'paper');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Users table (references Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'trader',
  parent_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  max_strategies INTEGER DEFAULT 10,
  max_orders_per_day INTEGER DEFAULT 100,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brokers master table
CREATE TABLE IF NOT EXISTS public.brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  broker_type broker_type NOT NULL,
  api_base_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  supported_exchanges exchange_type[] DEFAULT ARRAY['NSE', 'BSE']::exchange_type[],
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User broker accounts
CREATE TABLE IF NOT EXISTS public.user_broker_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  api_key TEXT,
  api_secret_encrypted TEXT,
  access_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  last_connected_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, broker_id, client_id)
);

-- Trading strategies
CREATE TABLE IF NOT EXISTS public.trading_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  symbol TEXT NOT NULL,
  exchange exchange_type NOT NULL DEFAULT 'NSE',
  product_type product_type NOT NULL DEFAULT 'MIS',
  strategy_type TEXT NOT NULL DEFAULT 'manual',
  status strategy_status NOT NULL DEFAULT 'draft',
  quantity INTEGER NOT NULL DEFAULT 1,
  entry_price DECIMAL(15, 4),
  target_price DECIMAL(15, 4),
  stop_loss_price DECIMAL(15, 4),
  trailing_stop_percent DECIMAL(5, 2),
  max_loss_per_trade DECIMAL(15, 4),
  max_profit_per_trade DECIMAL(15, 4),
  time_start TIME,
  time_end TIME,
  days_active TEXT[] DEFAULT ARRAY['MON', 'TUE', 'WED', 'THU', 'FRI'],
  rules JSONB DEFAULT '[]',
  broker_account_id UUID REFERENCES public.user_broker_accounts(id) ON DELETE SET NULL,
  is_paper_trading BOOLEAN NOT NULL DEFAULT true,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_pnl DECIMAL(15, 4) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Strategy executions (tracking each run of a strategy)
CREATE TABLE IF NOT EXISTS public.strategy_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status execution_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  entry_price DECIMAL(15, 4),
  exit_price DECIMAL(15, 4),
  quantity INTEGER NOT NULL,
  realized_pnl DECIMAL(15, 4),
  unrealized_pnl DECIMAL(15, 4),
  fees DECIMAL(15, 4) DEFAULT 0,
  slippage DECIMAL(15, 4) DEFAULT 0,
  notes TEXT,
  error_message TEXT,
  execution_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  execution_id UUID REFERENCES public.strategy_executions(id) ON DELETE SET NULL,
  broker_account_id UUID REFERENCES public.user_broker_accounts(id) ON DELETE SET NULL,
  broker_order_id TEXT,
  symbol TEXT NOT NULL,
  exchange exchange_type NOT NULL DEFAULT 'NSE',
  order_type order_type NOT NULL DEFAULT 'market',
  order_side order_side NOT NULL,
  product_type product_type NOT NULL DEFAULT 'MIS',
  quantity INTEGER NOT NULL,
  filled_quantity INTEGER DEFAULT 0,
  price DECIMAL(15, 4),
  trigger_price DECIMAL(15, 4),
  average_price DECIMAL(15, 4),
  status order_status NOT NULL DEFAULT 'pending',
  validity TEXT DEFAULT 'DAY',
  is_paper_trade BOOLEAN NOT NULL DEFAULT true,
  rejection_reason TEXT,
  placed_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Positions
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  broker_account_id UUID REFERENCES public.user_broker_accounts(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  exchange exchange_type NOT NULL DEFAULT 'NSE',
  product_type product_type NOT NULL DEFAULT 'MIS',
  position_side order_side NOT NULL,
  quantity INTEGER NOT NULL,
  average_entry_price DECIMAL(15, 4) NOT NULL,
  current_price DECIMAL(15, 4),
  target_price DECIMAL(15, 4),
  stop_loss_price DECIMAL(15, 4),
  status position_status NOT NULL DEFAULT 'open',
  realized_pnl DECIMAL(15, 4) DEFAULT 0,
  unrealized_pnl DECIMAL(15, 4) DEFAULT 0,
  total_fees DECIMAL(15, 4) DEFAULT 0,
  is_paper_trade BOOLEAN NOT NULL DEFAULT true,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trade history (individual fills)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  exchange exchange_type NOT NULL DEFAULT 'NSE',
  trade_side order_side NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(15, 4) NOT NULL,
  fees DECIMAL(15, 4) DEFAULT 0,
  broker_trade_id TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS public.admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_resource_type TEXT,
  target_resource_id UUID,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlist
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbols TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_admin ON public.profiles(parent_admin_id);

CREATE INDEX IF NOT EXISTS idx_user_broker_accounts_user ON public.user_broker_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_broker_accounts_broker ON public.user_broker_accounts(broker_id);

CREATE INDEX IF NOT EXISTS idx_strategies_user ON public.trading_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON public.trading_strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategies_symbol ON public.trading_strategies(symbol);

CREATE INDEX IF NOT EXISTS idx_executions_strategy ON public.strategy_executions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_executions_user ON public.strategy_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON public.strategy_executions(status);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_strategy ON public.orders(strategy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON public.orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_positions_user ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_strategy ON public.positions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON public.positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON public.positions(symbol);

CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_order ON public.trades(order_id);
CREATE INDEX IF NOT EXISTS idx_trades_position ON public.trades(position_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed ON public.trades(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_log_admin ON public.admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_created ON public.admin_actions_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_watchlists_user ON public.watchlists(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_broker_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can view users they manage
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND (p.role = 'master_admin' OR (p.role = 'admin' AND public.profiles.parent_admin_id = p.id))
  )
);

-- Brokers policies (everyone can read)
CREATE POLICY "brokers_select_all" ON public.brokers FOR SELECT TO authenticated USING (true);

-- User broker accounts policies
CREATE POLICY "broker_accounts_select_own" ON public.user_broker_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "broker_accounts_insert_own" ON public.user_broker_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "broker_accounts_update_own" ON public.user_broker_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "broker_accounts_delete_own" ON public.user_broker_accounts FOR DELETE USING (auth.uid() = user_id);

-- Trading strategies policies
CREATE POLICY "strategies_select_own" ON public.trading_strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "strategies_insert_own" ON public.trading_strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "strategies_update_own" ON public.trading_strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "strategies_delete_own" ON public.trading_strategies FOR DELETE USING (auth.uid() = user_id);

-- Strategy executions policies
CREATE POLICY "executions_select_own" ON public.strategy_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "executions_insert_own" ON public.strategy_executions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "executions_update_own" ON public.strategy_executions FOR UPDATE USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE USING (auth.uid() = user_id);

-- Positions policies
CREATE POLICY "positions_select_own" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "positions_insert_own" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "positions_update_own" ON public.positions FOR UPDATE USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "trades_select_own" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert_own" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin log policies
CREATE POLICY "admin_log_insert" ON public.admin_actions_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master_admin', 'admin'))
);
CREATE POLICY "admin_log_select" ON public.admin_actions_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master_admin', 'admin'))
);

-- Watchlists policies
CREATE POLICY "watchlists_select_own" ON public.watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlists_insert_own" ON public.watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlists_update_own" ON public.watchlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "watchlists_delete_own" ON public.watchlists FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate position P&L
CREATE OR REPLACE FUNCTION calculate_position_pnl(
  entry_price DECIMAL,
  current_price DECIMAL,
  qty INTEGER,
  side order_side
)
RETURNS DECIMAL AS $$
BEGIN
  IF side = 'buy' THEN
    RETURN (current_price - entry_price) * qty;
  ELSE
    RETURN (entry_price - current_price) * qty;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'trader')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_broker_accounts_updated_at ON public.user_broker_accounts;
CREATE TRIGGER update_broker_accounts_updated_at BEFORE UPDATE ON public.user_broker_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_strategies_updated_at ON public.trading_strategies;
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON public.trading_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_executions_updated_at ON public.strategy_executions;
CREATE TRIGGER update_executions_updated_at BEFORE UPDATE ON public.strategy_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_positions_updated_at ON public.positions;
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_watchlists_updated_at ON public.watchlists;
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON public.watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default brokers
INSERT INTO public.brokers (name, broker_type, api_base_url, is_active, supported_exchanges) VALUES
  ('Paper Trading', 'paper', NULL, true, ARRAY['NSE', 'BSE', 'NFO', 'MCX']::exchange_type[]),
  ('Zerodha', 'zerodha', 'https://api.kite.trade', true, ARRAY['NSE', 'BSE', 'NFO', 'MCX', 'CDS']::exchange_type[]),
  ('Angel One', 'angel_one', 'https://apiconnect.angelbroking.com', true, ARRAY['NSE', 'BSE', 'NFO', 'MCX']::exchange_type[]),
  ('Shoonya', 'shoonya', 'https://api.shoonya.com', true, ARRAY['NSE', 'BSE', 'NFO', 'MCX']::exchange_type[]),
  ('Alice Blue', 'alice_blue', 'https://ant.aliceblueonline.com', true, ARRAY['NSE', 'BSE', 'NFO', 'MCX']::exchange_type[])
ON CONFLICT (name) DO NOTHING;
