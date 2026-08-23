-- users.updated_at: Prisma @updatedAt for billing/connect writes.
-- Idempotent so local and Railway can apply even if the column already exists.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
UPDATE "users" SET "updated_at" = COALESCE("updated_at", "created_at", CURRENT_TIMESTAMP) WHERE "updated_at" IS NULL;
