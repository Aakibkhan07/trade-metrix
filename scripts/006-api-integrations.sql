-- Phase 7: API & Integrations
-- API keys, webhooks, and usage tracking for external integrations

-- =====================================================
-- 1. API Keys Table
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '["read"]',
  rate_limit INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allowed_ips TEXT[],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- =====================================================
-- 2. API Usage Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_body_size INTEGER,
  response_body_size INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_status_code ON api_usage_logs(status_code);

-- =====================================================
-- 3. Webhooks Table
-- =====================================================
CREATE TYPE webhook_event AS ENUM (
  'order.created',
  'order.filled',
  'order.cancelled',
  'order.rejected',
  'position.opened',
  'position.closed',
  'position.updated',
  'strategy.activated',
  'strategy.deactivated',
  'strategy.updated',
  'trade.executed',
  'alert.triggered',
  'backtest.completed'
);

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events webhook_event[] NOT NULL,
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  failure_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

-- =====================================================
-- 4. Webhook Deliveries Table
-- =====================================================
CREATE TYPE delivery_status AS ENUM (
  'pending',
  'delivering',
  'delivered',
  'failed',
  'retrying'
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type webhook_event NOT NULL,
  payload JSONB NOT NULL,
  status delivery_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  response_code INTEGER,
  response_body TEXT,
  response_headers JSONB,
  error_message TEXT,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';

-- =====================================================
-- 5. Rate Limiting Table (in-memory alternative)
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  tokens INTEGER NOT NULL,
  last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON rate_limit_buckets(expires_at);

-- =====================================================
-- 6. RLS Policies for API Keys
-- =====================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "api_keys_insert_own" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_keys_update_own" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "api_keys_delete_own" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. RLS Policies for API Usage Logs
-- =====================================================
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_usage_select_own" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "api_usage_admin_select" ON api_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('master_admin', 'admin')
    )
  );

-- =====================================================
-- 8. RLS Policies for Webhooks
-- =====================================================
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_select_own" ON webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "webhooks_insert_own" ON webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "webhooks_update_own" ON webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "webhooks_delete_own" ON webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 9. RLS Policies for Webhook Deliveries
-- =====================================================
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_deliveries_select_own" ON webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_deliveries.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- =====================================================
-- 10. Utility Functions
-- =====================================================

-- Function to generate API key prefix (first 8 chars)
CREATE OR REPLACE FUNCTION generate_api_key_prefix()
RETURNS TEXT AS $$
BEGIN
  RETURN 'tm_' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
  p_api_key_id UUID,
  p_user_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time_ms INTEGER,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO api_usage_logs (
    api_key_id, user_id, endpoint, method, status_code,
    response_time_ms, ip_address, user_agent, error_message
  ) VALUES (
    p_api_key_id, p_user_id, p_endpoint, p_method, p_status_code,
    p_response_time_ms, p_ip_address, p_user_agent, p_error_message
  )
  RETURNING id INTO log_id;
  
  -- Update last_used_at on API key
  IF p_api_key_id IS NOT NULL THEN
    UPDATE api_keys SET last_used_at = NOW() WHERE id = p_api_key_id;
  END IF;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue webhook delivery
CREATE OR REPLACE FUNCTION queue_webhook_delivery(
  p_event_type webhook_event,
  p_payload JSONB,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  webhook_record RECORD;
  delivery_count INTEGER := 0;
BEGIN
  FOR webhook_record IN
    SELECT id FROM webhooks
    WHERE user_id = p_user_id
    AND is_active = true
    AND p_event_type = ANY(events)
    AND failure_count < 10
  LOOP
    INSERT INTO webhook_deliveries (webhook_id, event_type, payload, max_attempts)
    VALUES (webhook_record.id, p_event_type, p_payload, 3);
    delivery_count := delivery_count + 1;
  END LOOP;
  
  RETURN delivery_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API usage stats
CREATE OR REPLACE FUNCTION get_api_usage_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  avg_response_time NUMERIC,
  requests_by_day JSONB,
  requests_by_endpoint JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400) as success,
      COUNT(*) FILTER (WHERE status_code >= 400) as failed,
      AVG(response_time_ms) as avg_time
    FROM api_usage_logs
    WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  ),
  by_day AS (
    SELECT jsonb_object_agg(day::TEXT, count) as data
    FROM (
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM api_usage_logs
      WHERE user_id = p_user_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
      GROUP BY DATE(created_at)
      ORDER BY day
    ) d
  ),
  by_endpoint AS (
    SELECT jsonb_object_agg(endpoint, count) as data
    FROM (
      SELECT endpoint, COUNT(*) as count
      FROM api_usage_logs
      WHERE user_id = p_user_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    ) e
  )
  SELECT
    stats.total,
    stats.success,
    stats.failed,
    ROUND(stats.avg_time, 2),
    COALESCE(by_day.data, '{}'::JSONB),
    COALESCE(by_endpoint.data, '{}'::JSONB)
  FROM stats, by_day, by_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. Cleanup old rate limit buckets (run periodically)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_buckets WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. Updated At Triggers
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhook_deliveries_updated_at ON webhook_deliveries;
CREATE TRIGGER update_webhook_deliveries_updated_at
  BEFORE UPDATE ON webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
