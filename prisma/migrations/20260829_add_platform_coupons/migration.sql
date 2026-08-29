-- Platform billing coupons (Stripe Coupon + Promotion Code)
CREATE TABLE "platform_coupons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(32) NOT NULL,
  "percent_off" INTEGER,
  "amount_off_cents" INTEGER,
  "duration" VARCHAR(20) NOT NULL,
  "duration_in_months" INTEGER,
  "max_redemptions" INTEGER,
  "expires_at" TIMESTAMP(6),
  "first_time_only" BOOLEAN NOT NULL DEFAULT false,
  "applies_to_plans" JSONB,
  "stripe_coupon_id" VARCHAR(255) NOT NULL,
  "stripe_promotion_code_id" VARCHAR(255) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "times_redeemed" INTEGER NOT NULL DEFAULT 0,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_coupons_code_key" ON "platform_coupons"("code");
CREATE UNIQUE INDEX "platform_coupons_stripe_coupon_id_key" ON "platform_coupons"("stripe_coupon_id");
CREATE UNIQUE INDEX "platform_coupons_stripe_promotion_code_id_key" ON "platform_coupons"("stripe_promotion_code_id");
CREATE INDEX "idx_platform_coupons_active" ON "platform_coupons"("active");
CREATE INDEX "idx_platform_coupons_created_by" ON "platform_coupons"("created_by");

ALTER TABLE "platform_coupons"
  ADD CONSTRAINT "platform_coupons_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "platform_coupon_redemptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "coupon_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "stripe_session_id" VARCHAR(255) NOT NULL,
  "redeemed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_coupon_redemptions_stripe_session_id_key" ON "platform_coupon_redemptions"("stripe_session_id");
CREATE INDEX "idx_platform_coupon_redemptions_coupon" ON "platform_coupon_redemptions"("coupon_id");
CREATE INDEX "idx_platform_coupon_redemptions_user" ON "platform_coupon_redemptions"("user_id");

ALTER TABLE "platform_coupon_redemptions"
  ADD CONSTRAINT "platform_coupon_redemptions_coupon_id_fkey"
  FOREIGN KEY ("coupon_id") REFERENCES "platform_coupons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "platform_coupon_redemptions"
  ADD CONSTRAINT "platform_coupon_redemptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
