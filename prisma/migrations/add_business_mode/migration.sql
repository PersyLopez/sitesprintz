-- Migration: Add Business Mode Support for Solo vs. Team Operations
-- This enables templates to flawlessly handle both solo and multi-staff booking scenarios

-- 1. Add business_mode to booking_tenants
ALTER TABLE booking_tenants 
ADD COLUMN IF NOT EXISTS business_mode VARCHAR(20) DEFAULT 'solo';

-- 2. Add staff_selection_enabled to control whether customers can choose staff
ALTER TABLE booking_tenants 
ADD COLUMN IF NOT EXISTS staff_selection_enabled BOOLEAN DEFAULT false;

-- 3. Add allow_no_preference to enable "Any available" option
ALTER TABLE booking_tenants 
ADD COLUMN IF NOT EXISTS allow_no_preference BOOLEAN DEFAULT true;

-- 4. Add no_preference_text to customize the "Any available" label
ALTER TABLE booking_tenants 
ADD COLUMN IF NOT EXISTS no_preference_text VARCHAR(100) DEFAULT 'Any Available';

-- 5. Create service_staff junction table for service-specific staff assignments
CREATE TABLE IF NOT EXISTS service_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES booking_staff(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP(6) DEFAULT NOW(),
  UNIQUE(service_id, staff_id)
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_staff_service ON service_staff(service_id);
CREATE INDEX IF NOT EXISTS idx_service_staff_staff ON service_staff(staff_id);
CREATE INDEX IF NOT EXISTS idx_booking_tenants_business_mode ON booking_tenants(business_mode);

-- 7. Add specialties column to booking_staff for better staff display
ALTER TABLE booking_staff 
ADD COLUMN IF NOT EXISTS specialties TEXT;

-- 8. Add photo_url column to booking_staff (if not exists)
ALTER TABLE booking_staff 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 9. Comment on new columns for documentation
COMMENT ON COLUMN booking_tenants.business_mode IS 'Business operation mode: solo, team, or hybrid';
COMMENT ON COLUMN booking_tenants.staff_selection_enabled IS 'Whether customers can select specific staff members';
COMMENT ON COLUMN booking_tenants.allow_no_preference IS 'Whether to show "Any Available" option in staff selection';
COMMENT ON COLUMN booking_tenants.no_preference_text IS 'Customizable label for no-preference option (e.g., "Any Stylist", "First Available")';
COMMENT ON TABLE service_staff IS 'Junction table linking services to staff members who can perform them';


