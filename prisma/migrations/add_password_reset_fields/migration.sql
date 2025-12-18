-- AlterTable: Add password reset fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMP(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(6);

-- CreateIndex: Add index for password reset token lookups
CREATE INDEX IF NOT EXISTS "idx_users_password_reset_token" ON "users"("password_reset_token");

-- Add unique constraint on password_reset_token (if not already unique)
-- Note: This may fail if there are existing duplicate values, clean them first if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_password_reset_token_key'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_password_reset_token_key" UNIQUE ("password_reset_token");
    END IF;
END $$;







