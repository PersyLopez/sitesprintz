-- ============================================
-- BOOKING PAYMENT FIELDS MIGRATION
-- ============================================
-- Adds payment tracking fields to booking system
-- Date: 2025-01-03
-- Phase: Phase 2 - Booking Payment Integration

-- ============================================
-- APPOINTMENTS TABLE - Payment Tracking
-- ============================================

-- Add payment status and tracking fields
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed')
  );

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  payment_method VARCHAR(20) CHECK (
    payment_method IN ('deposit', 'full', 'manual', 'none') OR payment_method IS NULL
  );

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  payment_intent_id VARCHAR(255);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  payment_amount_cents INT DEFAULT 0 CHECK (payment_amount_cents >= 0);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  deposit_paid_cents INT DEFAULT 0 CHECK (deposit_paid_cents >= 0);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  remaining_balance_cents INT DEFAULT 0 CHECK (remaining_balance_cents >= 0);

-- Add Stripe session tracking
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  stripe_session_id VARCHAR(255);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  stripe_charge_id VARCHAR(255);

-- Add payment timestamps
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  payment_initiated_at TIMESTAMP;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  paid_at TIMESTAMP;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  refunded_at TIMESTAMP;

-- Add refund tracking
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  refund_amount_cents INT DEFAULT 0 CHECK (refund_amount_cents >= 0);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  refund_reason TEXT;

-- Create indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_intent ON appointments(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_stripe_session ON appointments(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_paid_at ON appointments(paid_at) WHERE paid_at IS NOT NULL;

-- Add unique constraint on payment_intent_id (prevent duplicate payments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_payment_intent_unique ON appointments(payment_intent_id) WHERE payment_intent_id IS NOT NULL;

-- ============================================
-- BOOKING_SERVICES TABLE - Payment Configuration
-- ============================================

-- Add payment requirement fields
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS
  requires_payment BOOLEAN DEFAULT FALSE;

ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS
  payment_type VARCHAR(20) DEFAULT 'none' CHECK (
    payment_type IN ('none', 'deposit', 'full', 'optional')
  );

ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS
  deposit_percentage INT DEFAULT 50 CHECK (
    deposit_percentage >= 0 AND deposit_percentage <= 100
  );

-- Add policy fields
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS
  cancellation_policy TEXT;

ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS
  refund_policy VARCHAR(50) DEFAULT 'full' CHECK (
    refund_policy IN ('full', 'partial', 'none', 'policy_based')
  );

-- Create index for payment-required services
CREATE INDEX IF NOT EXISTS idx_booking_services_requires_payment ON booking_services(requires_payment) WHERE requires_payment = TRUE;

-- ============================================
-- BOOKING_TENANTS TABLE - Stripe Integration
-- ============================================

-- Add Stripe Connect account reference
-- Note: This links to users.stripe_account_id (business owner's Stripe account)
ALTER TABLE booking_tenants ADD COLUMN IF NOT EXISTS
  stripe_account_id VARCHAR(255);

ALTER TABLE booking_tenants ADD COLUMN IF NOT EXISTS
  payment_enabled BOOLEAN DEFAULT FALSE;

-- Add default payment policies
ALTER TABLE booking_tenants ADD COLUMN IF NOT EXISTS
  default_payment_type VARCHAR(20) DEFAULT 'none' CHECK (
    default_payment_type IN ('none', 'deposit', 'full', 'optional')
  );

ALTER TABLE booking_tenants ADD COLUMN IF NOT EXISTS
  default_deposit_percentage INT DEFAULT 50 CHECK (
    default_deposit_percentage >= 0 AND default_deposit_percentage <= 100
  );

ALTER TABLE booking_tenants ADD COLUMN IF NOT EXISTS
  cancellation_window_hours INT DEFAULT 24 CHECK (cancellation_window_hours >= 0);

-- Create index for Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_booking_tenants_stripe_account ON booking_tenants(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_tenants_payment_enabled ON booking_tenants(payment_enabled) WHERE payment_enabled = TRUE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN appointments.payment_status IS 'Payment status: unpaid, pending, paid, refunded, failed';
COMMENT ON COLUMN appointments.payment_method IS 'Payment method: deposit (partial), full, manual, none';
COMMENT ON COLUMN appointments.payment_intent_id IS 'Stripe Payment Intent ID or Checkout Session ID';
COMMENT ON COLUMN appointments.stripe_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN appointments.remaining_balance_cents IS 'Remaining balance if deposit payment was made';

COMMENT ON COLUMN booking_services.requires_payment IS 'Whether this service requires payment at booking';
COMMENT ON COLUMN booking_services.payment_type IS 'Payment type: none, deposit, full, optional';
COMMENT ON COLUMN booking_services.deposit_percentage IS 'Percentage required for deposit payment (0-100)';

COMMENT ON COLUMN booking_tenants.stripe_account_id IS 'Reference to users.stripe_account_id for Stripe Connect';
COMMENT ON COLUMN booking_tenants.payment_enabled IS 'Whether tenant has payment processing enabled';
COMMENT ON COLUMN booking_tenants.cancellation_window_hours IS 'Hours before appointment that cancellation is allowed';

-- ============================================
-- VALIDATION NOTES
-- ============================================

-- Migration adds 19 fields total:
-- - appointments: 13 fields
-- - booking_services: 5 fields
-- - booking_tenants: 5 fields

-- All fields use ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- Safe to run multiple times (idempotent)

-- Migration completed successfully


