-- ============================================
-- SITESPRINTZ DATABASE SCHEMA
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  
  -- Stripe integration
  stripe_customer_id VARCHAR(255) UNIQUE,
  subscription_status VARCHAR(50),
  subscription_plan VARCHAR(50),
  subscription_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Legacy reference
  json_file_path VARCHAR(500)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Site identity
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  template_id VARCHAR(100) NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'expired', 'suspended')),
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'premium')),
  
  -- Timestamps
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Trial expiration emails tracking
  warning_2days_sent BOOLEAN DEFAULT false,
  warning_1day_sent BOOLEAN DEFAULT false,
  expiration_email_sent BOOLEAN DEFAULT false,
  
  -- Full site data (JSONB)
  site_data JSONB NOT NULL,
  
  -- Backup reference
  json_file_path VARCHAR(500)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON sites(subdomain);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_plan ON sites(plan);
CREATE INDEX IF NOT EXISTS idx_sites_expires_at ON sites(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sites_template_id ON sites(template_id);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_sites_data ON sites USING GIN (site_data);

-- Updated_at trigger
DROP TRIGGER IF EXISTS sites_updated_at ON sites;
CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(255) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Form data
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  form_type VARCHAR(100),
  
  -- Additional data (JSON)
  custom_data JSONB,
  
  -- Status
  status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'spam')),
  
  -- Metadata
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_site_id ON submissions(site_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email) WHERE email IS NOT NULL;

-- Full-text search on message
CREATE INDEX IF NOT EXISTS idx_submissions_message_search ON submissions USING GIN (to_tsvector('english', COALESCE(message, '')));

-- ============================================
-- ANALYTICS EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  site_id VARCHAR(255) REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  page_path VARCHAR(500),
  referrer TEXT,
  
  -- User context
  user_agent TEXT,
  ip_address VARCHAR(45),
  session_id VARCHAR(255),
  
  -- Additional data
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_site_id ON analytics_events(site_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id) WHERE session_id IS NOT NULL;

-- ============================================
-- MIGRATION LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  migration_type VARCHAR(100) NOT NULL,
  source_path VARCHAR(500) NOT NULL,
  target_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_log_type ON migration_log(migration_type);
CREATE INDEX IF NOT EXISTS idx_migration_log_status ON migration_log(status);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Schema created successfully!' AS message;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

