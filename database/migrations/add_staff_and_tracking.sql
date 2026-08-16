-- ============================================
-- STAFF AND TRACKING TABLES MIGRATION
-- ============================================
-- Adds staff user linking, staff invitations, and customer tracking tokens
-- This enables employee portal access and customer order/appointment tracking

-- ============================================
-- STAFF_USERS TABLE
-- ============================================
-- Links booking_staff records to user accounts for authentication
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES booking_staff(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager')),
  permissions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one user can only be linked once per tenant
  CONSTRAINT unique_user_tenant UNIQUE (user_id, tenant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_users_staff_id ON staff_users(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_tenant_id ON staff_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_user_id ON staff_users(user_id);

-- ============================================
-- STAFF_INVITATIONS TABLE
-- ============================================
-- Manages staff invitation tokens for email-based invitation flow
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  staff_id UUID NOT NULL REFERENCES booking_staff(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager')),
  permissions JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_tenant_id ON staff_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_expires_at ON staff_invitations(expires_at);

-- ============================================
-- TRACKING_TOKENS TABLE
-- ============================================
-- Secure tokens for customers to track orders/appointments without login
CREATE TABLE IF NOT EXISTS tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'appointment')),
  reference_id VARCHAR(255) NOT NULL, -- order_id or appointment confirmation_code
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_token ON tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_reference_id ON tracking_tokens(reference_id);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_type ON tracking_tokens(type);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_expires_at ON tracking_tokens(expires_at);

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE staff_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired tracking tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tracking_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM tracking_tokens 
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Staff and tracking tables created successfully!' AS message;



