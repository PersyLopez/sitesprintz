-- ============================================
-- BOOKING SYSTEM - PHASE 1 MIGRATION
-- ============================================
-- Creates core tables for basic booking functionality
-- Date: 2025-11-15

-- ============================================
-- TENANT & BUSINESS MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS booking_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to SiteSprintz user/site (for integrated mode)
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  site_id VARCHAR(255) REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100), -- 'salon', 'consultant', 'medical', 'fitness', etc.
  phone VARCHAR(50),
  email VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Settings
  booking_page_enabled BOOLEAN DEFAULT TRUE,
  confirmation_email_enabled BOOLEAN DEFAULT TRUE,
  reminder_email_enabled BOOLEAN DEFAULT TRUE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Each user can only have one tenant for now
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_tenants_user ON booking_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_tenants_site ON booking_tenants(site_id);

-- ============================================
-- STAFF MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS booking_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Staff Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  title VARCHAR(255), -- e.g., 'Senior Stylist', 'Massage Therapist'
  bio TEXT,
  avatar_url TEXT,
  
  -- Scheduling Settings
  buffer_time_after INTEGER DEFAULT 0, -- Minutes after appointments
  max_advance_booking_days INTEGER DEFAULT 90,
  min_advance_booking_hours INTEGER DEFAULT 2,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  
  -- Status
  is_primary BOOLEAN DEFAULT FALSE, -- First staff member
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_staff_tenant ON booking_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_staff_status ON booking_staff(status);

-- ============================================
-- SERVICES & OFFERINGS
-- ============================================

CREATE TABLE IF NOT EXISTS booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Service Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'haircut', 'massage', 'consultation', etc.
  
  -- Duration & Pricing
  duration_minutes INTEGER NOT NULL, -- e.g., 30, 60, 90
  price_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Availability
  online_booking_enabled BOOLEAN DEFAULT TRUE,
  requires_approval BOOLEAN DEFAULT FALSE, -- Manual approval before confirming
  
  -- Display
  display_order INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_services_tenant ON booking_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_status ON booking_services(status);
CREATE INDEX IF NOT EXISTS idx_booking_services_category ON booking_services(category);

-- ============================================
-- AVAILABILITY SCHEDULE
-- ============================================

CREATE TABLE IF NOT EXISTS booking_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES booking_staff(id) ON DELETE CASCADE,
  
  -- Weekly Schedule
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure valid time range
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

CREATE INDEX IF NOT EXISTS idx_availability_tenant ON booking_availability_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_staff ON booking_availability_rules(staff_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON booking_availability_rules(day_of_week);

-- ============================================
-- APPOINTMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Appointment Details
  service_id UUID NOT NULL REFERENCES booking_services(id),
  staff_id UUID NOT NULL REFERENCES booking_staff(id),
  
  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  
  -- Customer Information
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_notes TEXT,
  
  -- Booking Details
  confirmation_code VARCHAR(50) UNIQUE NOT NULL,
  booking_source VARCHAR(50) DEFAULT 'online', -- 'online', 'manual', 'widget', 'api'
  
  -- Status
  status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed', 'no_show'
  requires_approval BOOLEAN DEFAULT FALSE,
  
  -- Cancellation
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50), -- 'customer', 'staff', 'admin'
  
  -- Pricing
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Internal Notes
  internal_notes TEXT, -- Staff-only notes
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_appointment_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_email ON appointments(customer_email);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation ON appointments(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON appointments(start_time, end_time);

-- ============================================
-- NOTIFICATIONS LOG
-- ============================================

CREATE TABLE IF NOT EXISTS booking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Notification Details
  type VARCHAR(50) NOT NULL, -- 'confirmation', 'reminder', 'cancellation', 'update'
  channel VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email', 'sms'
  
  -- Recipients
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  
  -- Content
  subject VARCHAR(500),
  message TEXT,
  
  -- Delivery
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMP,
  error_message TEXT,
  
  -- Provider Info
  provider VARCHAR(50), -- 'resend', 'sendgrid', 'twilio'
  provider_message_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON booking_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON booking_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON booking_notifications(status);

-- ============================================
-- DEFAULT DATA FOR TESTING (Optional)
-- ============================================

COMMENT ON TABLE booking_tenants IS 'Business/organization that uses the booking system';
COMMENT ON TABLE booking_staff IS 'Staff members who provide services';
COMMENT ON TABLE booking_services IS 'Services offered by the business';
COMMENT ON TABLE booking_availability_rules IS 'Weekly availability schedule for staff';
COMMENT ON TABLE appointments IS 'Customer appointments/bookings';
COMMENT ON TABLE booking_notifications IS 'Email/SMS notifications sent to customers';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Booking System Phase 1 tables created successfully!' as status;

