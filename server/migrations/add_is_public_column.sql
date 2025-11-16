-- Migration: Add is_public column to sites table for Public Gallery feature
-- Date: November 15, 2025
-- Feature: P2-NEW-2 - Public Portfolio Gallery

-- Add is_public column
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN sites.is_public IS 
'Whether the site is visible in the public gallery. Users can opt-in/opt-out. Only published sites can be public.';

-- Create index for performance on public gallery queries
CREATE INDEX IF NOT EXISTS idx_sites_is_public 
ON sites(is_public) 
WHERE is_public = TRUE AND status = 'published';

-- Create composite index for common queries (is_public + status)
CREATE INDEX IF NOT EXISTS idx_sites_public_status 
ON sites(is_public, status) 
WHERE is_public = TRUE;

-- Create index for filtering by template
CREATE INDEX IF NOT EXISTS idx_sites_public_template 
ON sites(is_public, template_id, status) 
WHERE is_public = TRUE AND status = 'published';

-- Create index for search by subdomain (subdomain is already the identifier)
CREATE INDEX IF NOT EXISTS idx_sites_public_subdomain 
ON sites(is_public, subdomain) 
WHERE is_public = TRUE AND status = 'published';

