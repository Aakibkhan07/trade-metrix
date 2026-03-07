-- Phase 2: Broker Integration Enhancement
-- Add refresh token and session management fields

-- Add refresh token field if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_broker_accounts' 
    AND column_name = 'refresh_token_encrypted'
  ) THEN
    ALTER TABLE user_broker_accounts 
    ADD COLUMN refresh_token_encrypted TEXT;
  END IF;
END $$;

-- Add request token field for OAuth flow
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_broker_accounts' 
    AND column_name = 'request_token'
  ) THEN
    ALTER TABLE user_broker_accounts 
    ADD COLUMN request_token TEXT;
  END IF;
END $$;

-- Add TOTP secret for brokers requiring 2FA
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_broker_accounts' 
    AND column_name = 'totp_secret_encrypted'
  ) THEN
    ALTER TABLE user_broker_accounts 
    ADD COLUMN totp_secret_encrypted TEXT;
  END IF;
END $$;

-- Add connection status tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_broker_accounts' 
    AND column_name = 'connection_status'
  ) THEN
    ALTER TABLE user_broker_accounts 
    ADD COLUMN connection_status TEXT DEFAULT 'disconnected';
  END IF;
END $$;

-- Add last error tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_broker_accounts' 
    AND column_name = 'last_error'
  ) THEN
    ALTER TABLE user_broker_accounts 
    ADD COLUMN last_error TEXT;
  END IF;
END $$;

-- Create broker_sessions table for OAuth state management
CREATE TABLE IF NOT EXISTS broker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id),
  state TEXT NOT NULL UNIQUE,
  redirect_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMPTZ
);

-- Index for quick state lookup
CREATE INDEX IF NOT EXISTS idx_broker_sessions_state ON broker_sessions(state);
CREATE INDEX IF NOT EXISTS idx_broker_sessions_user ON broker_sessions(user_id);

-- RLS for broker_sessions
ALTER TABLE broker_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broker_sessions_select_own ON broker_sessions;
CREATE POLICY broker_sessions_select_own ON broker_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS broker_sessions_insert_own ON broker_sessions;
CREATE POLICY broker_sessions_insert_own ON broker_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS broker_sessions_update_own ON broker_sessions;
CREATE POLICY broker_sessions_update_own ON broker_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS broker_sessions_delete_own ON broker_sessions;
CREATE POLICY broker_sessions_delete_own ON broker_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Update brokers table with connection config
UPDATE brokers SET config = jsonb_build_object(
  'auth_type', 'oauth',
  'login_url', 'https://kite.zerodha.com/connect/login',
  'token_url', 'https://api.kite.trade/session/token',
  'requires_totp', true
) WHERE broker_type = 'zerodha';

UPDATE brokers SET config = jsonb_build_object(
  'auth_type', 'api_key',
  'login_url', 'https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword',
  'requires_totp', true
) WHERE broker_type = 'angel_one';

UPDATE brokers SET config = jsonb_build_object(
  'auth_type', 'api_key',
  'login_url', 'https://api.shoonya.com/NorenWClientTP/QuickAuth',
  'requires_totp', true
) WHERE broker_type = 'shoonya';

UPDATE brokers SET config = jsonb_build_object(
  'auth_type', 'oauth',
  'login_url', 'https://a3.aliceblueonline.com/rest/AliceBlueAPIService/api',
  'requires_totp', false
) WHERE broker_type = 'alice_blue';

UPDATE brokers SET config = jsonb_build_object(
  'auth_type', 'none',
  'is_simulated', true
) WHERE broker_type = 'paper';

-- Grant necessary permissions
GRANT ALL ON broker_sessions TO authenticated;
