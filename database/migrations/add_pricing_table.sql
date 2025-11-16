-- ============================================
-- PRICING MANAGEMENT TABLE
-- ============================================
-- Allows admin to manage subscription pricing from dashboard
-- without code changes

CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  price_monthly INTEGER NOT NULL, -- in cents (e.g., 1500 = $15.00)
  price_annual INTEGER, -- in cents (optional annual pricing)
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  trial_days INTEGER DEFAULT 14,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT valid_plan_name CHECK (plan IN ('starter', 'pro', 'premium')),
  CONSTRAINT positive_price CHECK (price_monthly > 0),
  CONSTRAINT valid_trial CHECK (trial_days >= 0)
);

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_pricing_plan ON pricing(plan);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS pricing_updated_at ON pricing;
CREATE TRIGGER pricing_updated_at
  BEFORE UPDATE ON pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default pricing (current approved pricing)
INSERT INTO pricing (plan, name, price_monthly, price_annual, description, features, trial_days, is_popular, display_order)
VALUES 
  (
    'starter',
    'Starter',
    1500, -- $15/month
    14400, -- $144/year (20% discount)
    'Perfect for service businesses',
    '["1 Website (display only)", "31 Industry Templates", "Foundation Features", "Custom subdomain", "SSL included", "Email support"]'::jsonb,
    14,
    false,
    1
  ),
  (
    'pro',
    'Pro',
    4500, -- $45/month
    43200, -- $432/year (20% discount)
    'Add e-commerce and payments',
    '["Everything in Starter", "E-commerce (unlimited products)", "Shopping cart & checkout", "Order management", "Analytics dashboard", "Pro Features (Phase 1B)", "Remove branding", "Priority email support"]'::jsonb,
    14,
    true, -- Most popular
    2
  ),
  (
    'premium',
    'Premium',
    10000, -- $100/month
    96000, -- $960/year (20% discount)
    'Full automation and advanced tools',
    '["Everything in Pro", "Booking system", "Point of Sale (POS)", "Multi-staff scheduling", "SMS reminders", "Customer loyalty programs", "Gift cards", "Advanced inventory", "Multi-location support", "Custom domain included", "White-label option", "Priority phone + chat support"]'::jsonb,
    14,
    false,
    3
  )
ON CONFLICT (plan) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  trial_days = EXCLUDED.trial_days,
  is_popular = EXCLUDED.is_popular,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================
-- PRICING HISTORY TABLE (Optional - Track Changes)
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan VARCHAR(50) NOT NULL,
  old_price INTEGER,
  new_price INTEGER,
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_history_plan ON pricing_history(plan, changed_at DESC);

-- Trigger to log price changes
CREATE OR REPLACE FUNCTION log_pricing_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price_monthly IS DISTINCT FROM NEW.price_monthly THEN
    INSERT INTO pricing_history (plan, old_price, new_price, changed_by)
    VALUES (NEW.plan, OLD.price_monthly, NEW.price_monthly, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_change_log ON pricing;
CREATE TRIGGER pricing_change_log
  AFTER UPDATE ON pricing
  FOR EACH ROW
  WHEN (OLD.price_monthly IS DISTINCT FROM NEW.price_monthly)
  EXECUTE FUNCTION log_pricing_change();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- Active pricing view (only show active plans)
CREATE OR REPLACE VIEW active_pricing AS
SELECT 
  plan,
  name,
  price_monthly,
  price_annual,
  description,
  features,
  trial_days,
  is_popular,
  display_order,
  ROUND(price_monthly::numeric / 100, 2) as price_monthly_dollars,
  ROUND(price_annual::numeric / 100, 2) as price_annual_dollars,
  ROUND((price_annual::numeric / 12) / 100, 2) as annual_monthly_equivalent
FROM pricing
WHERE is_active = true
ORDER BY display_order;

-- Pricing comparison view
CREATE OR REPLACE VIEW pricing_comparison AS
SELECT 
  plan,
  name,
  price_monthly,
  price_annual,
  ROUND((price_monthly::numeric - (price_annual::numeric / 12)) / (price_monthly::numeric / 100), 0) as annual_savings_percent,
  ROUND((price_monthly * 12 - price_annual)::numeric / 100, 2) as annual_savings_dollars
FROM pricing
WHERE is_active = true AND price_annual IS NOT NULL;

