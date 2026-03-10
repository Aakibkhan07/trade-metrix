-- Phase 6: Admin & User Management Enhancement
-- Adds viewer role, user invitations, and enhanced admin features

-- =====================================================
-- 1. Viewer role may already exist - skip if present
-- =====================================================
-- The viewer role is now available in the user_role enum

-- =====================================================
-- 2. Add last_login_at to profiles
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- =====================================================
-- 3. Create user_invitations table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'trader',
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  max_strategies INTEGER DEFAULT 5,
  max_orders_per_day INTEGER DEFAULT 50,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by email and token
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON user_invitations(invited_by);

-- =====================================================
-- 4. Create admin_settings table
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
  ('default_max_strategies', '5', 'Default max strategies for new users'),
  ('default_max_orders_per_day', '50', 'Default max orders per day for new users'),
  ('invitation_expiry_days', '7', 'Days until invitation expires'),
  ('max_failed_logins', '5', 'Max failed login attempts before lockout'),
  ('lockout_duration_minutes', '30', 'Account lockout duration in minutes'),
  ('require_email_verification', 'true', 'Require email verification for new accounts')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 5. Create user_sessions table for session management
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active) WHERE is_active = true;

-- =====================================================
-- 6. RLS Policies for new tables
-- =====================================================

-- User Invitations RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view/create invitations
CREATE POLICY "invitations_admin_select" ON user_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master_admin', 'admin')
    )
  );

CREATE POLICY "invitations_admin_insert" ON user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master_admin', 'admin')
    )
    AND invited_by = auth.uid()
  );

CREATE POLICY "invitations_admin_update" ON user_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master_admin', 'admin')
    )
  );

CREATE POLICY "invitations_admin_delete" ON user_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master_admin', 'admin')
    )
  );

-- Public can view their own invitation by token (for accepting)
CREATE POLICY "invitations_public_token_select" ON user_invitations
  FOR SELECT USING (true);

-- Admin Settings RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only master_admin can modify settings
CREATE POLICY "settings_master_admin_all" ON admin_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master_admin'
    )
  );

-- All admins can view settings
CREATE POLICY "settings_admin_select" ON admin_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master_admin', 'admin')
    )
  );

-- User Sessions RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "sessions_own_select" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "sessions_own_update" ON user_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- System can insert sessions
CREATE POLICY "sessions_insert" ON user_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all sessions
CREATE POLICY "sessions_admin_select" ON user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master_admin', 'admin')
    )
  );

-- =====================================================
-- 7. Enhanced admin_actions_log - add more action types
-- =====================================================
-- Update the check constraint to include new action types
ALTER TABLE admin_actions_log DROP CONSTRAINT IF EXISTS admin_actions_log_action_type_check;
ALTER TABLE admin_actions_log ADD CONSTRAINT admin_actions_log_action_type_check 
  CHECK (action_type IN (
    'create_user', 'update_user', 'delete_user', 'activate_user', 'deactivate_user',
    'update_role', 'update_limits', 'reset_password', 'force_logout',
    'create_invitation', 'cancel_invitation', 'resend_invitation',
    'update_settings', 'view_audit_log', 'export_data'
  ));

-- =====================================================
-- 8. Function to update last_login_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    last_login_at = NOW(),
    login_count = COALESCE(login_count, 0) + 1,
    failed_login_attempts = 0
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. Function to check if user is locked out
-- =====================================================
CREATE OR REPLACE FUNCTION is_user_locked(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  locked TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO locked FROM profiles WHERE id = user_id;
  RETURN locked IS NOT NULL AND locked > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. Function to log admin action
-- =====================================================
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO admin_actions_log (admin_id, action_type, target_user_id, metadata, ip_address)
  VALUES (auth.uid(), p_action_type, p_target_user_id, p_metadata, p_ip_address)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. View for user statistics
-- =====================================================
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT
  COUNT(*) FILTER (WHERE role = 'master_admin') as master_admin_count,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
  COUNT(*) FILTER (WHERE role = 'trader') as trader_count,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
  COUNT(*) FILTER (WHERE is_verified = true) as verified_users,
  COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as active_last_week,
  COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days') as active_last_month,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month
FROM profiles;

-- Grant access to the view
GRANT SELECT ON admin_user_stats TO authenticated;
