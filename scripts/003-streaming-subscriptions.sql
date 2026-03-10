-- Phase 5: Real-Time Streaming - Database Schema
-- Streaming subscriptions and connection state management

-- Create streaming subscription status enum
DO $$ BEGIN
  CREATE TYPE streaming_status AS ENUM ('active', 'paused', 'disconnected', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create stream type enum
DO $$ BEGIN
  CREATE TYPE stream_type AS ENUM ('market_data', 'order_updates', 'position_updates', 'portfolio');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Streaming subscriptions table - track what users are subscribed to
CREATE TABLE IF NOT EXISTS streaming_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_account_id UUID REFERENCES user_broker_accounts(id) ON DELETE CASCADE,
  stream_type stream_type NOT NULL DEFAULT 'market_data',
  instrument_token TEXT,
  symbol TEXT,
  exchange TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, broker_account_id, stream_type, instrument_token)
);

-- User streaming connections - track active WebSocket connections
CREATE TABLE IF NOT EXISTS user_streaming_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL UNIQUE,
  broker_account_id UUID REFERENCES user_broker_accounts(id) ON DELETE SET NULL,
  status streaming_status DEFAULT 'active',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, connection_id)
);

-- Streaming message history - for debugging and recovery
CREATE TABLE IF NOT EXISTS streaming_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_streaming_subscriptions_user ON streaming_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_streaming_subscriptions_broker ON streaming_subscriptions(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_streaming_subscriptions_active ON streaming_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_streaming_connections_user ON user_streaming_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_streaming_connections_status ON user_streaming_connections(status);
CREATE INDEX IF NOT EXISTS idx_streaming_message_log_connection ON streaming_message_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_streaming_message_log_created ON streaming_message_log(created_at);

-- Enable RLS
ALTER TABLE streaming_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaming_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_message_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for streaming_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON streaming_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON streaming_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON streaming_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON streaming_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_streaming_connections
CREATE POLICY "Users can view their own connections"
  ON user_streaming_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections"
  ON user_streaming_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON user_streaming_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON user_streaming_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for streaming_message_log
CREATE POLICY "Users can view their own message logs"
  ON streaming_message_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message logs"
  ON streaming_message_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to cleanup old message logs (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_streaming_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM streaming_message_log WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update connection heartbeat
CREATE OR REPLACE FUNCTION update_connection_heartbeat(p_connection_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_streaming_connections
  SET last_heartbeat = NOW()
  WHERE connection_id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark stale connections as disconnected (no heartbeat for 60 seconds)
CREATE OR REPLACE FUNCTION mark_stale_connections()
RETURNS void AS $$
BEGIN
  UPDATE user_streaming_connections
  SET status = 'disconnected'
  WHERE status = 'active'
    AND last_heartbeat < NOW() - INTERVAL '60 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at on streaming_subscriptions
CREATE OR REPLACE FUNCTION update_streaming_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS streaming_subscriptions_updated_at ON streaming_subscriptions;
CREATE TRIGGER streaming_subscriptions_updated_at
  BEFORE UPDATE ON streaming_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_streaming_subscription_timestamp();
