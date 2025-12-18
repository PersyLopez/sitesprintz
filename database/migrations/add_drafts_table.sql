-- ============================================
-- DRAFTS TABLE MIGRATION
-- ============================================
-- Migrates draft storage from file-based JSON to PostgreSQL
-- This provides better reliability, querying, and cleanup

CREATE TABLE IF NOT EXISTS drafts (
  id VARCHAR(255) PRIMARY KEY,
  
  -- User association (optional - drafts can exist before user registration)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Template info
  template_id VARCHAR(100) NOT NULL,
  
  -- Draft content (JSONB for flexibility)
  business_data JSONB NOT NULL DEFAULT '{}',
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'expired', 'deleted')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Published site reference (if published)
  published_site_id VARCHAR(255) REFERENCES sites(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_expires_at ON drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_template_id ON drafts(template_id);

-- GIN index for JSONB queries on business_data
CREATE INDEX IF NOT EXISTS idx_drafts_business_data ON drafts USING GIN (business_data);

-- Updated_at trigger
DROP TRIGGER IF EXISTS drafts_updated_at ON drafts;
CREATE TRIGGER drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for expired drafts (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM drafts 
  WHERE status = 'draft' 
    AND expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Verification
SELECT 'Drafts table created successfully!' AS message;





