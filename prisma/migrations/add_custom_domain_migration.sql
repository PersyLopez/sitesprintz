-- Add custom domain fields to sites table
ALTER TABLE "sites" 
ADD COLUMN IF NOT EXISTS "custom_domain" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "custom_domain_status" VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "custom_domain_verified" TIMESTAMP(6);

-- Add unique constraint on custom_domain
CREATE UNIQUE INDEX IF NOT EXISTS "sites_custom_domain_key" ON "sites"("custom_domain") WHERE "custom_domain" IS NOT NULL;

