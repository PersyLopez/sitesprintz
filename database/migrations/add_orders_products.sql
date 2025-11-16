-- ============================================
-- ORDERS & PRODUCTS TABLES
-- For Pro site e-commerce functionality
-- ============================================

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  subdomain VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  inventory INTEGER DEFAULT 0 CHECK (inventory >= 0),
  images JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',
  modifiers JSONB DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_subdomain ON products(subdomain);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_order ON products(subdomain, display_order);

-- Updated_at trigger
DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain VARCHAR(255) NOT NULL,
  
  -- Customer info
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  
  -- Order details
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Payment
  stripe_payment_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'pending',
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')
  ),
  
  -- Fulfillment
  fulfillment_type VARCHAR(50) DEFAULT 'delivery',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  special_instructions TEXT,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_subdomain ON orders(subdomain);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled ON orders(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment ON orders(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ORDER_ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  
  -- Item details (stored for historical record)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Customization
  modifiers JSONB DEFAULT '[]',
  special_instructions TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id) WHERE product_id IS NOT NULL;

-- ============================================
-- APPLICATION FEES TRACKING (Your Revenue)
-- ============================================
CREATE TABLE IF NOT EXISTS application_fees (
  id SERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  subdomain VARCHAR(255) NOT NULL,
  
  -- Fee details
  order_total DECIMAL(10,2) NOT NULL,
  fee_percentage DECIMAL(5,4) NOT NULL, -- e.g., 0.1000 for 10%
  fee_amount DECIMAL(10,2) NOT NULL,
  
  -- Stripe tracking
  stripe_payment_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  stripe_account_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'collected', 'failed', 'refunded')
  ),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collected_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_fees_subdomain ON application_fees(subdomain);
CREATE INDEX IF NOT EXISTS idx_app_fees_status ON application_fees(status);
CREATE INDEX IF NOT EXISTS idx_app_fees_created_at ON application_fees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_fees_stripe_payment ON application_fees(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;

-- ============================================
-- INVENTORY TRANSACTIONS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Transaction details
  quantity_change INTEGER NOT NULL, -- Positive for restock, negative for sale
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (
    transaction_type IN ('sale', 'restock', 'adjustment', 'return')
  ),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory_transactions(created_at DESC);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Orders & Products tables created successfully!' AS message;

