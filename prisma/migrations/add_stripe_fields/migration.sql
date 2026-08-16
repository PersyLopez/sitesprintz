-- Add Stripe integration fields to users table
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "stripe_account_id" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "stripe_connected" BOOLEAN DEFAULT false;
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "current_period_end" TIMESTAMP(6);
ALTER TABLE "users" ADD COLUMN "plan" VARCHAR(50);

-- Create unique constraints for Stripe fields
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_customer_id_key" UNIQUE ("stripe_customer_id");
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_account_id_key" UNIQUE ("stripe_account_id");

-- Create indexes for faster queries
CREATE INDEX "idx_users_stripe_customer_id" ON "users" ("stripe_customer_id");
CREATE INDEX "idx_users_stripe_account_id" ON "users" ("stripe_account_id");


