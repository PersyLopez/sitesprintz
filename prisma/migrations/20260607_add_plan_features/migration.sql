-- CreateTable: plan_features
-- Stores the feature-to-plan mapping for runtime feature flag management
CREATE TABLE "plan_features" (
  "id" SERIAL NOT NULL,
  "plan" VARCHAR(50) NOT NULL,
  "feature" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique plan-feature pair
CREATE UNIQUE INDEX "idx_plan_features_unique" ON "plan_features"("plan", "feature");

-- CreateIndex: for plan lookups
CREATE INDEX "idx_plan_features_plan" ON "plan_features"("plan");

-- Seed with default features
INSERT INTO "plan_features" (plan, feature, enabled) VALUES
  -- Trial features
  ('trial', 'CONTACT_FORMS', true),
  ('trial', 'SERVICE_DISPLAY', true),
  ('trial', 'BASIC_BOOKING', true),
  -- Starter features (includes Trial)
  ('starter', 'CONTACT_FORMS', true),
  ('starter', 'SERVICE_DISPLAY', true),
  ('starter', 'BASIC_BOOKING', true),
  ('starter', 'TEAM_PROFILES', true),
  ('starter', 'FILTERS', true),
  ('starter', 'BEFORE_AFTER_GALLERY', true),
  -- Growth features (includes Starter)
  ('growth', 'CONTACT_FORMS', true),
  ('growth', 'SERVICE_DISPLAY', true),
  ('growth', 'BASIC_BOOKING', true),
  ('growth', 'TEAM_PROFILES', true),
  ('growth', 'FILTERS', true),
  ('growth', 'BEFORE_AFTER_GALLERY', true),
  ('growth', 'NATIVE_BOOKING', true),
  ('growth', 'ORDER_MANAGEMENT', true),
  ('growth', 'PRODUCT_MANAGEMENT', true),
  ('growth', 'STRIPE_CHECKOUT', true),
  ('growth', 'SHOPPING_CART', true),
  -- Pro features (includes Growth)
  ('pro', 'CONTACT_FORMS', true),
  ('pro', 'SERVICE_DISPLAY', true),
  ('pro', 'BASIC_BOOKING', true),
  ('pro', 'TEAM_PROFILES', true),
  ('pro', 'FILTERS', true),
  ('pro', 'BEFORE_AFTER_GALLERY', true),
  ('pro', 'NATIVE_BOOKING', true),
  ('pro', 'ORDER_MANAGEMENT', true),
  ('pro', 'PRODUCT_MANAGEMENT', true),
  ('pro', 'STRIPE_CHECKOUT', true),
  ('pro', 'SHOPPING_CART', true),
  ('pro', 'CUSTOM_DOMAIN', true),
  ('pro', 'ADVANCED_ANALYTICS', true),
  -- Premium features (includes Pro)
  ('premium', 'CONTACT_FORMS', true),
  ('premium', 'SERVICE_DISPLAY', true),
  ('premium', 'BASIC_BOOKING', true),
  ('premium', 'TEAM_PROFILES', true),
  ('premium', 'FILTERS', true),
  ('premium', 'BEFORE_AFTER_GALLERY', true),
  ('premium', 'NATIVE_BOOKING', true),
  ('premium', 'ORDER_MANAGEMENT', true),
  ('premium', 'PRODUCT_MANAGEMENT', true),
  ('premium', 'STRIPE_CHECKOUT', true),
  ('premium', 'SHOPPING_CART', true),
  ('premium', 'CUSTOM_DOMAIN', true),
  ('premium', 'ADVANCED_ANALYTICS', true),
  ('premium', 'LIVE_CHAT', true),
  ('premium', 'EMAIL_AUTOMATION', true),
  ('premium', 'CRM_INTEGRATION', true),
  ('premium', 'MULTI_LOCATION', true)
ON CONFLICT DO NOTHING;
