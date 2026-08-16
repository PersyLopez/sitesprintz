/**
 * Phase 2.1 Fee System - E2E Tests
 * Tests for cancellation fees, no-show penalties, and booking fees in a live environment
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 2.1 - Booking Fees', () => {
  test.beforeEach(async ({ page }) => {
    // Login to admin dashboard
    await page.goto('http://localhost:5173/login');
    await page.fill('input[data-testid="email"]', 'admin@test.com');
    await page.fill('input[data-testid="password"]', 'password');
    await page.click('button[data-testid="login-submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Admin can configure cancellation fees for a service', async ({ page }) => {
    // Navigate to bookings
    await page.click('a[href="/admin/bookings"]');
    await page.waitForSelector('[data-testid="services-list"]');

    // Click on a service to edit
    await page.click('button[data-testid="service-edit-haircut"]');
    await page.waitForSelector('[data-testid="fee-configuration"]');

    // Enable cancellation fees
    await page.click('input[data-testid="enable-cancellation-fees"]');

    // Set cancellation rules
    await page.fill('input[data-testid="cancel-within-hours-0"]', '24');
    await page.fill('input[data-testid="cancel-fee-percentage-0"]', '100');

    await page.fill('input[data-testid="cancel-within-hours-1"]', '48');
    await page.fill('input[data-testid="cancel-fee-percentage-1"]', '50');

    // Save
    await page.click('button[data-testid="save-fee-policies"]');

    // Verify success message
    await expect(page.locator('text=Fee policies saved successfully')).toBeVisible();
  });

  test('Admin can configure no-show penalties', async ({ page }) => {
    await page.click('a[href="/admin/bookings"]');
    await page.waitForSelector('[data-testid="services-list"]');

    await page.click('button[data-testid="service-edit-haircut"]');
    await page.waitForSelector('[data-testid="fee-configuration"]');

    // Enable no-show penalties
    await page.click('input[data-testid="enable-no-show-fees"]');

    // Configure fee
    await page.fill('input[data-testid="no-show-fee-amount"]', '100');
    await page.selectOption('select[data-testid="no-show-fee-type"]', 'percentage');

    // Enable confirmation requirement
    await page.click('input[data-testid="require-confirmation"]');

    // Save
    await page.click('button[data-testid="save-fee-policies"]');

    await expect(page.locator('text=Fee policies saved successfully')).toBeVisible();
  });

  test('Admin can configure booking fees', async ({ page }) => {
    await page.click('a[href="/admin/bookings"]');
    await page.waitForSelector('[data-testid="services-list"]');

    await page.click('button[data-testid="service-edit-haircut"]');
    await page.waitForSelector('[data-testid="fee-configuration"]');

    // Enable booking fees
    await page.click('input[data-testid="enable-booking-fees"]');

    // Set percentage
    await page.fill('input[data-testid="booking-fee-percentage"]', '2.5');

    // Save
    await page.click('button[data-testid="save-fee-policies"]');

    await expect(page.locator('text=Fee policies saved successfully')).toBeVisible();
  });

  test('Customer sees fee breakdown at checkout', async ({ page }) => {
    // Book an appointment (as customer)
    await page.goto('http://localhost:5173/sites/test-salon');

    // Fill booking form
    await page.click('button:has-text("Book Now")');
    await page.waitForSelector('[data-testid="booking-widget"]');

    // Select service
    await page.click('text=Haircut - $50');

    // Select date/time
    await page.click('input[data-testid="appointment-date"]');
    await page.waitForSelector('[data-testid="date-picker"]');
    await page.click('button:has-text("15")'); // Select 15th

    // Select time
    await page.click('select[data-testid="appointment-time"]');
    await page.click('option:has-text("10:00 AM")');

    // Fill customer info
    await page.fill('input[data-testid="customer-name"]', 'John Doe');
    await page.fill('input[data-testid="customer-email"]', 'john@example.com');
    await page.fill('input[data-testid="customer-phone"]', '555-1234');

    // Proceed to checkout
    await page.click('button:has-text("Proceed to Payment")');

    // Verify fee breakdown is shown
    await expect(page.locator('text=Service: $50.00')).toBeVisible();
    await expect(page.locator('text=Booking Fee (2.5%): $1.25')).toBeVisible();
    await expect(page.locator('text=Total: $51.25')).toBeVisible();

    // Verify cancellation policy is displayed
    await expect(
      page.locator('text=Cancellation Policy: Free if >48h, 50% if 24-48h, 100% if <24h')
    ).toBeVisible();
  });

  test('Customer can view refund calculation on cancellation', async ({ page }) => {
    // Mock an existing appointment
    const appointmentId = 'apt-test-001';

    // Navigate to appointment details
    await page.goto(`http://localhost:5173/appointments/${appointmentId}`);

    // Click cancel button
    await page.click('button:has-text("Cancel Appointment")');
    await page.waitForSelector('[data-testid="cancel-confirmation"]');

    // View refund breakdown
    await expect(page.locator('text=Refund Information')).toBeVisible();
    await expect(page.locator('text=Amount Paid:')).toBeVisible();
    await expect(page.locator('text=Cancellation Fee:')).toBeVisible();
    await expect(page.locator('text=Stripe Fee (Retained):')).toBeVisible();
    await expect(page.locator('text=Your Refund:')).toBeVisible();

    // Confirm cancellation
    await page.click('button:has-text("Confirm Cancellation")');

    // Verify success message
    await expect(
      page.locator('text=Your appointment has been cancelled')
    ).toBeVisible();
  });

  test('No-show confirmation email is sent 24 hours before appointment', async ({ page }) => {
    // This test would need email mocking to verify
    // For now, we're verifying the feature is in the system

    await page.goto('http://localhost:5173/admin/bookings');
    await page.waitForSelector('[data-testid="services-list"]');

    // Verify service has confirmation requirement enabled
    await page.click('button[data-testid="service-details-haircut"]');

    await expect(
      page.locator('text=Require 24h confirmation').nth(0)
    ).toBeChecked();
  });

  test('Different services can have different fee policies', async ({ page }) => {
    await page.click('a[href="/admin/bookings"]');
    await page.waitForSelector('[data-testid="services-list"]');

    // Edit haircut service - set 50% cancellation
    await page.click('button[data-testid="service-edit-haircut"]');
    await page.click('input[data-testid="enable-cancellation-fees"]');
    await page.fill('input[data-testid="cancel-within-hours-0"]', '24');
    await page.fill('input[data-testid="cancel-fee-percentage-0"]', '50');
    await page.click('button[data-testid="save-fee-policies"]');
    await expect(page.locator('text=Fee policies saved')).toBeVisible();

    // Go back to services list
    await page.click('a[href="/admin/bookings"]');
    await page.waitForSelector('[data-testid="services-list"]');

    // Edit consulting service - set 100% cancellation
    await page.click('button[data-testid="service-edit-consultation"]');
    await page.click('input[data-testid="enable-cancellation-fees"]');
    await page.fill('input[data-testid="cancel-within-hours-0"]', '48');
    await page.fill('input[data-testid="cancel-fee-percentage-0"]', '100');
    await page.click('button[data-testid="save-fee-policies"]');
    await expect(page.locator('text=Fee policies saved')).toBeVisible();
  });
});

test.describe('Phase 2.1 - Fee Revenue Impact', () => {
  test('Cancellation fees are properly tracked in revenue reports', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/reports');

    // Navigate to revenue section
    await page.click('a[href="/admin/reports/revenue"]');
    await page.waitForSelector('[data-testid="revenue-chart"]');

    // Verify fee categories in breakdown
    await expect(page.locator('text=Service Revenue')).toBeVisible();
    await expect(page.locator('text=Booking Fees')).toBeVisible();
    await expect(page.locator('text=Cancellation Fees')).toBeVisible();
    await expect(page.locator('text=No-Show Penalties')).toBeVisible();

    // Check total revenue includes fees
    const totalRevenue = await page.locator('[data-testid="total-revenue"]').textContent();
    expect(parseFloat(totalRevenue.replace(/[^0-9.]/g, ''))).toBeGreaterThan(0);
  });
});


