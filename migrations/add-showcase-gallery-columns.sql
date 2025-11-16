-- Migration: Add showcase gallery columns
-- Date: November 15, 2025
-- Description: Add columns for public showcase gallery feature

-- Add is_public column (opt-in for gallery)
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add is_featured column (for featured showcases)
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Add view_count column (track showcase views)
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add index for public sites query
CREATE INDEX IF NOT EXISTS idx_sites_public 
ON sites(is_public, status, category) 
WHERE is_public = TRUE AND status = 'published';

-- Add index for featured sites
CREATE INDEX IF NOT EXISTS idx_sites_featured 
ON sites(is_featured, is_public, status) 
WHERE is_featured = TRUE AND is_public = TRUE AND status = 'published';

-- Add index for search
CREATE INDEX IF NOT EXISTS idx_sites_search 
ON sites(business_name, subdomain) 
WHERE is_public = TRUE AND status = 'published';

-- Add comments
COMMENT ON COLUMN sites.is_public IS 'Whether site appears in public showcase gallery';
COMMENT ON COLUMN sites.is_featured IS 'Whether site is featured in gallery';
COMMENT ON COLUMN sites.view_count IS 'Number of times showcase has been viewed';

-- Verify migration
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sites' 
  AND column_name IN ('is_public', 'is_featured', 'view_count');

