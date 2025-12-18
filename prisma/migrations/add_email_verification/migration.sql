-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token_expires" TIMESTAMP(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(6);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_users_verification_token" ON "users"("verification_token");
CREATE INDEX IF NOT EXISTS "idx_users_email_verified" ON "users"("email_verified");

-- Update default status to 'pending' for new accounts
-- Note: Existing accounts remain 'active', only new accounts will be 'pending'
-- This is handled in application code, not database default






