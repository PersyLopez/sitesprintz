-- Booking System Schema

-- Tenants (Business Profiles)
CREATE TABLE IF NOT EXISTS booking_tenants (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id VARCHAR(255), -- Optional link to site
  business_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS booking_services (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'general',
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER DEFAULT 0,
  online_booking_enabled BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff
CREATE TABLE IF NOT EXISTS booking_staff (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  title VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active',
  buffer_time_after INTEGER DEFAULT 0,
  min_advance_booking_hours INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability Rules
CREATE TABLE IF NOT EXISTS booking_availability_rules (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  staff_id INTEGER NOT NULL REFERENCES booking_staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
  staff_id INTEGER NOT NULL REFERENCES booking_staff(id) ON DELETE CASCADE,
  
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_notes TEXT,
  
  confirmation_code VARCHAR(20) UNIQUE NOT NULL,
  booking_source VARCHAR(50) DEFAULT 'online',
  status VARCHAR(50) DEFAULT 'confirmed', -- pending, confirmed, cancelled, completed, no_show
  
  total_price_cents INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_tenants_user ON booking_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_tenant ON booking_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_staff_tenant ON booking_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_availability_staff ON booking_availability_rules(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_time ON appointments(staff_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_code ON appointments(confirmation_code);
