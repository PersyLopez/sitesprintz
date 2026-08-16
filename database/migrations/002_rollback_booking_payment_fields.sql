-- ============================================
-- ROLLBACK: BOOKING PAYMENT FIELDS MIGRATION
-- ============================================
-- Removes payment tracking fields from booking system
-- Date: 2025-01-03
-- Use this to rollback 002_add_booking_payment_fields.sql

-- ============================================
-- APPOINTMENTS TABLE - Remove Payment Fields
-- ============================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_appointments_payment_status;
DROP INDEX IF EXISTS idx_appointments_payment_intent;
DROP INDEX IF EXISTS idx_appointments_stripe_session;
DROP INDEX IF EXISTS idx_appointments_paid_at;
DROP INDEX IF EXISTS idx_appointments_payment_intent_unique;

-- Drop columns
ALTER TABLE appointments DROP COLUMN IF EXISTS payment_status;
ALTER TABLE appointments DROP COLUMN IF EXISTS payment_method;
ALTER TABLE appointments DROP COLUMN IF EXISTS payment_intent_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS payment_amount_cents;
ALTER TABLE appointments DROP COLUMN IF EXISTS deposit_paid_cents;
ALTER TABLE appointments DROP COLUMN IF EXISTS remaining_balance_cents;
ALTER TABLE appointments DROP COLUMN IF EXISTS stripe_session_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS stripe_charge_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS payment_initiated_at;
ALTER TABLE appointments DROP COLUMN IF EXISTS paid_at;
ALTER TABLE appointments DROP COLUMN IF EXISTS refunded_at;
ALTER TABLE appointments DROP COLUMN IF EXISTS refund_amount_cents;
ALTER TABLE appointments DROP COLUMN IF EXISTS refund_reason;

-- ============================================
-- BOOKING_SERVICES TABLE - Remove Payment Config
-- ============================================

-- Drop indexes
DROP INDEX IF EXISTS idx_booking_services_requires_payment;

-- Drop columns
ALTER TABLE booking_services DROP COLUMN IF EXISTS requires_payment;
ALTER TABLE booking_services DROP COLUMN IF EXISTS payment_type;
ALTER TABLE booking_services DROP COLUMN IF EXISTS deposit_percentage;
ALTER TABLE booking_services DROP COLUMN IF EXISTS cancellation_policy;
ALTER TABLE booking_services DROP COLUMN IF EXISTS refund_policy;

-- ============================================
-- BOOKING_TENANTS TABLE - Remove Stripe Integration
-- ============================================

-- Drop indexes
DROP INDEX IF EXISTS idx_booking_tenants_stripe_account;
DROP INDEX IF EXISTS idx_booking_tenants_payment_enabled;

-- Drop columns
ALTER TABLE booking_tenants DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE booking_tenants DROP COLUMN IF EXISTS payment_enabled;
ALTER TABLE booking_tenants DROP COLUMN IF EXISTS default_payment_type;
ALTER TABLE booking_tenants DROP COLUMN IF EXISTS default_deposit_percentage;
ALTER TABLE booking_tenants DROP COLUMN IF EXISTS cancellation_window_hours;

-- Rollback completed successfully


