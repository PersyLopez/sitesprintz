-- Migration: Add plan_features table
-- Created: 2025-12-15
-- Purpose: Store plan feature configuration in database for admin UI management

-- Create plan_features table
CREATE TABLE IF NOT EXISTS plan_features (
  id SERIAL PRIMARY KEY,
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'premium')),
  feature VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plan, feature)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature ON plan_features(feature);
CREATE INDEX IF NOT EXISTS idx_plan_features_enabled ON plan_features(enabled) WHERE enabled = true;

-- Updated_at trigger
CREATE TRIGGER plan_features_updated_at
  BEFORE UPDATE ON plan_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default plan features from current configuration
-- Free tier features
INSERT INTO plan_features (plan, feature, enabled) VALUES
  ('free', 'contact_forms', true),
  ('free', 'service_display', true),
  ('free', 'basic_booking_link', true),
  ('free', 'image_gallery', true)
ON CONFLICT (plan, feature) DO NOTHING;

-- Starter tier features (includes free + additional)
INSERT INTO plan_features (plan, feature, enabled) VALUES
  ('starter', 'contact_forms', true),
  ('starter', 'service_display', true),
  ('starter', 'basic_booking_link', true),
  ('starter', 'image_gallery', true),
  ('starter', 'staff_profiles', true),
  ('starter', 'faq_section', true),
  ('starter', 'filters', true),
  ('starter', 'before_after_gallery', true)
ON CONFLICT (plan, feature) DO NOTHING;

-- Pro tier features (includes starter + additional)
INSERT INTO plan_features (plan, feature, enabled) VALUES
  ('pro', 'contact_forms', true),
  ('pro', 'service_display', true),
  ('pro', 'basic_booking_link', true),
  ('pro', 'image_gallery', true),
  ('pro', 'staff_profiles', true),
  ('pro', 'faq_section', true),
  ('pro', 'filters', true),
  ('pro', 'before_after_gallery', true),
  ('pro', 'stripe_checkout', true),
  ('pro', 'shopping_cart', true),
  ('pro', 'order_management', true),
  ('pro', 'embedded_booking', true),
  ('pro', 'recurring_pricing', true),
  ('pro', 'sales_analytics', true),
  ('pro', 'product_management', true)
ON CONFLICT (plan, feature) DO NOTHING;

-- Premium tier features (includes pro + additional)
INSERT INTO plan_features (plan, feature, enabled) VALUES
  ('premium', 'contact_forms', true),
  ('premium', 'service_display', true),
  ('premium', 'basic_booking_link', true),
  ('premium', 'image_gallery', true),
  ('premium', 'staff_profiles', true),
  ('premium', 'faq_section', true),
  ('premium', 'filters', true),
  ('premium', 'before_after_gallery', true),
  ('premium', 'stripe_checkout', true),
  ('premium', 'shopping_cart', true),
  ('premium', 'order_management', true),
  ('premium', 'embedded_booking', true),
  ('premium', 'recurring_pricing', true),
  ('premium', 'sales_analytics', true),
  ('premium', 'product_management', true),
  ('premium', 'live_chat', true),
  ('premium', 'advanced_booking', true),
  ('premium', 'email_automation', true),
  ('premium', 'crm_integration', true),
  ('premium', 'multi_location', true),
  ('premium', 'custom_domain', true),
  ('premium', 'ab_testing', true),
  ('premium', 'blog_cms', true)
ON CONFLICT (plan, feature) DO NOTHING;






