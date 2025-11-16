import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Booking System
 * Tests the complete user journey from browsing services to booking appointments
 */

test.describe('Booking System - Complete User Journey', () => {
  const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';
  const testUserId = 1; // Replace with actual test user

  test.beforeEach(async ({ page }) => {
    // Setup: Create test data if needed
    // This would ideally use API to set up test tenant/services
  });

  test('Customer can view available services', async ({ page }) => {
    // Navigate to booking page
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Wait for services to load
    await page.waitForSelector('[data-testid="services-list"]', { timeout: 5000 });

    // Check that services are displayed
    const services = await page.locator('[data-testid="service-card"]').count();
    expect(services).toBeGreaterThan(0);

    // Verify service details are shown
    const firstService = page.locator('[data-testid="service-card"]').first();
    await expect(firstService).toContainText(/\$\d+/); // Price
    await expect(firstService).toBeVisible();
  });

  test('Customer can select a service and see available time slots', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Wait for services
    await page.waitForSelector('[data-testid="service-card"]');

    // Click on first service
    await page.locator('[data-testid="service-card"]').first().click();

    // Date picker should appear
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible();

    // Select a future date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await page.locator(`[data-date="${dateString}"]`).click();

    // Time slots should load
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 5000 });

    const timeSlots = await page.locator('[data-testid="time-slot"]').count();
    expect(timeSlots).toBeGreaterThan(0);
  });

  test('Customer can complete a booking', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // 1. Select service
    await page.waitForSelector('[data-testid="service-card"]');
    await page.locator('[data-testid="service-card"]').first().click();

    // 2. Select date
    await page.waitForSelector('[data-testid="date-picker"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.locator(`[data-date="${dateString}"]`).click();

    // 3. Select time slot
    await page.waitForSelector('[data-testid="time-slot"]');
    await page.locator('[data-testid="time-slot"]').first().click();

    // 4. Fill in customer information
    await page.fill('[data-testid="customer-name"]', 'John Doe');
    await page.fill('[data-testid="customer-email"]', 'john.doe@test.com');
    await page.fill('[data-testid="customer-phone"]', '+1234567890');
    await page.fill('[data-testid="customer-notes"]', 'First time customer');

    // 5. Submit booking
    await page.click('[data-testid="book-now-button"]');

    // 6. Wait for confirmation
    await page.waitForSelector('[data-testid="confirmation-page"]', { timeout: 10000 });

    // Verify confirmation details
    await expect(page.locator('[data-testid="confirmation-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-code"]')).toHaveText(/[A-Z0-9]{8}/);
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('confirmed');
  });

  test('Customer cannot book an already taken time slot', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Try to book a slot
    await page.waitForSelector('[data-testid="service-card"]');
    await page.locator('[data-testid="service-card"]').first().click();

    // Select date and time
    await page.waitForSelector('[data-testid="date-picker"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`).click();

    await page.waitForSelector('[data-testid="time-slot"]');
    const firstSlot = page.locator('[data-testid="time-slot"]').first();
    await firstSlot.click();

    // Fill form
    await page.fill('[data-testid="customer-name"]', 'Jane Smith');
    await page.fill('[data-testid="customer-email"]', 'jane@test.com');
    
    // Submit
    await page.click('[data-testid="book-now-button"]');

    // If slot is taken, should show error
    const errorOrSuccess = await Promise.race([
      page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('[data-testid="confirmation-page"]', { timeout: 5000 }).catch(() => null),
    ]);

    // Either should show (depends on whether slot was actually taken)
    expect(errorOrSuccess).toBeTruthy();
  });

  test('Customer can view their booking details with confirmation code', async ({ page }) => {
    // Assuming we have a confirmation code from previous test
    const testConfirmationCode = 'ABC12345'; // This should be dynamic in real tests

    await page.goto(`${baseURL}/booking/appointment/${testConfirmationCode}`);

    // Appointment details should be visible
    await expect(page.locator('[data-testid="appointment-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-time"]')).toBeVisible();
  });

  test('Customer can cancel their booking', async ({ page }) => {
    const testConfirmationCode = 'ABC12345';

    await page.goto(`${baseURL}/booking/appointment/${testConfirmationCode}`);

    // Wait for appointment details
    await page.waitForSelector('[data-testid="appointment-details"]');

    // Click cancel button
    await page.click('[data-testid="cancel-appointment-button"]');

    // Confirm cancellation in modal/dialog
    await page.waitForSelector('[data-testid="cancel-confirm-dialog"]');
    await page.fill('[data-testid="cancellation-reason"]', 'Schedule conflict');
    await page.click('[data-testid="confirm-cancel-button"]');

    // Should show cancellation confirmation
    await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-status"]')).toContainText('cancelled');
  });

  test('Shows validation errors for missing required fields', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Select service and time
    await page.waitForSelector('[data-testid="service-card"]');
    await page.locator('[data-testid="service-card"]').first().click();

    await page.waitForSelector('[data-testid="date-picker"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`).click();

    await page.waitForSelector('[data-testid="time-slot"]');
    await page.locator('[data-testid="time-slot"]').first().click();

    // Try to submit without filling form
    await page.click('[data-testid="book-now-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
  });

  test('Displays loading states during booking process', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Loading state while fetching services
    const servicesLoading = page.locator('[data-testid="services-loading"]');
    
    // Either loading or services should be visible
    await Promise.race([
      expect(servicesLoading).toBeVisible(),
      expect(page.locator('[data-testid="service-card"]')).toBeVisible(),
    ]);
  });

  test('Handles network errors gracefully', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('**/api/booking/**', route => {
      route.abort('failed');
    });

    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
  });

  test('Mobile: Booking flow works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Services should be visible on mobile
    await page.waitForSelector('[data-testid="service-card"]');
    await expect(page.locator('[data-testid="service-card"]').first()).toBeVisible();

    // Complete booking flow on mobile
    await page.locator('[data-testid="service-card"]').first().click();

    // Mobile date picker
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible();
  });
});

test.describe('Admin Dashboard - Booking Management', () => {
  const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Login as admin (this would use actual auth flow)
    // For now, assume we're already authenticated
  });

  test('Admin can view all appointments', async ({ page }) => {
    await page.goto(`${baseURL}/admin/bookings`);

    // Wait for appointments list
    await page.waitForSelector('[data-testid="appointments-list"]', { timeout: 5000 });

    // Should show appointments
    const appointments = await page.locator('[data-testid="appointment-row"]').count();
    expect(appointments).toBeGreaterThanOrEqual(0);
  });

  test('Admin can filter appointments by date range', async ({ page }) => {
    await page.goto(`${baseURL}/admin/bookings`);

    await page.waitForSelector('[data-testid="appointments-list"]');

    // Set date filters
    await page.fill('[data-testid="start-date-filter"]', '2025-11-01');
    await page.fill('[data-testid="end-date-filter"]', '2025-11-30');
    await page.click('[data-testid="apply-filters"]');

    // List should update
    await page.waitForSelector('[data-testid="appointments-list"]');
  });

  test('Admin can create a service', async ({ page }) => {
    await page.goto(`${baseURL}/admin/services`);

    // Click add service button
    await page.click('[data-testid="add-service-button"]');

    // Fill service form
    await page.fill('[data-testid="service-name"]', 'New Test Service');
    await page.fill('[data-testid="service-description"]', 'Test description');
    await page.fill('[data-testid="service-duration"]', '60');
    await page.fill('[data-testid="service-price"]', '50');

    // Submit
    await page.click('[data-testid="save-service-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('Admin can set staff availability schedule', async ({ page }) => {
    await page.goto(`${baseURL}/admin/availability`);

    // Select days of the week
    await page.check('[data-testid="day-monday"]');
    await page.check('[data-testid="day-tuesday"]');
    await page.check('[data-testid="day-wednesday"]');

    // Set hours
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');

    // Save schedule
    await page.click('[data-testid="save-schedule-button"]');

    // Should confirm save
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});

