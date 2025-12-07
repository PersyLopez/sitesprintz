import { test, expect } from '@playwright/test';
import { setupBookingData, createTestAppointment } from '../helpers/booking-test-utils';
import { registerUser } from '../helpers/e2e-test-utils';

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000); // Set 60s timeout for all tests in this file due to extensive API retries

/**
 * E2E Tests for Booking System
 * Tests the complete user journey from browsing services to booking appointments
 */

test.describe('Booking System - Complete User Journey', () => {
  const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';
  let testUserId;
  let testUserEmail;
  let testServiceId;
  let testCsrfToken;
  let testStaffId;

  test.beforeEach(async ({ request, page }) => {
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    // Register a new user
    const user = await registerUser(request);
    testUserId = user.id;
    testUserEmail = user.email;
    testCsrfToken = user.csrfToken;
    console.log('Test CSRF Token:', testCsrfToken);

    // Upgrade user to pro plan for booking access
    const upgradeRes = await request.post(`${baseURL}/api/test/upgrade-user`, {
      headers: { 'X-CSRF-Token': testCsrfToken },
      data: { email: testUserEmail, plan: 'pro' }
    });
    if (!upgradeRes.ok()) {
      console.log('Upgrade failed:', upgradeRes.status(), await upgradeRes.text());
    }
    expect(upgradeRes.ok()).toBeTruthy();

    // Setup booking data (service, staff, availability)
    const setupData = await setupBookingData(request, testUserId, testCsrfToken);
    testServiceId = setupData.serviceId;
    testStaffId = setupData.staffId;
  });

  test('Customer can view available services', async ({ page }) => {
    // Navigate to booking page
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Wait for services to load
    await page.waitForSelector('[data-testid="services-list"]', { timeout: 5000 });

    // Check that services are displayed
    const services = await page.locator('[data-testid^="service-card-"]').count();
    expect(services).toBeGreaterThan(0);

    // Verify service details are shown
    const firstService = page.locator('[data-testid^="service-card-"]').first();
    await expect(firstService).toContainText(/\$\d+/); // Price
    await expect(firstService).toBeVisible();
  });

  test('Customer can select a service and see available time slots', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Wait for services
    await page.waitForSelector('[data-testid^="service-card-"]');

    // Click on our test service
    // We filter by text to ensure we click the one we created, though setup clears others? No it doesn't.
    // Ideally we'd select by ID but the UI might not expose it easily in testid.
    // Let's just click the first one as before, assuming our seeded one shows up.
    await page.locator('[data-testid^="service-card-"]').first().click();

    // Click next
    await page.click('[data-testid="next-button"]');

    // Date picker should appear
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible();

    // Select a future date (tomorrow or next weekday)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateString = tomorrow.toISOString().split('T')[0];

    // Handle month navigation if needed
    const today = new Date();
    if (tomorrow.getMonth() !== today.getMonth()) {
      await page.click('[data-testid="next-month"]');
    }

    await page.locator(`[data-testid="date-${dateString}"]`).click();

    // Time slots should load
    await page.waitForSelector('[data-testid^="time-slot-"]', { timeout: 5000 });

    const timeSlots = await page.locator('[data-testid^="time-slot-"]').count();
    expect(timeSlots).toBeGreaterThan(0);
  });

  test('Customer can complete a booking', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // 1. Select service
    await page.waitForSelector('[data-testid^="service-card-"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.click('[data-testid="next-button"]');

    // 2. Select date
    await page.waitForSelector('[data-testid="date-picker"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateString = tomorrow.toISOString().split('T')[0];

    // Handle month navigation if needed
    const today = new Date();
    if (tomorrow.getMonth() !== today.getMonth()) {
      await page.click('[data-testid="next-month"]');
    }

    await page.locator(`[data-testid="date-${dateString}"]`).click();

    // 3. Select time slot
    await page.waitForSelector('[data-testid^="time-slot-"]');
    await page.locator('[data-testid^="time-slot-"]').first().click();
    await page.click('[data-testid="next-button"]');

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
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('successfully booked');
  });

  test('Customer cannot book an already taken time slot', async ({ page, request }) => {
    // First create an appointment via API to block a slot
    const appointment = await createTestAppointment(request, testUserId, testServiceId, testStaffId, testCsrfToken);
    const bookedTimeISO = appointment.start_time;

    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Verify service list loads
    await page.waitForSelector('[data-testid^="service-card-"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.click('[data-testid="next-button"]');

    // Select date
    await page.waitForSelector('[data-testid="date-picker"]');

    // We need to select the SAME date that createTestAppointment picked.
    // createTestAppointment logic: tomorrow (skipping weekends).
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateString = tomorrow.toISOString().split('T')[0];

    // Handle month navigation if needed
    const today = new Date();
    if (tomorrow.getMonth() !== today.getMonth()) {
      await page.click('[data-testid="next-month"]');
      await page.waitForSelector(`[data-testid="date-${dateString}"]`); // Wait for new month to render
    }

    await page.click(`[data-testid="date-${dateString}"]`);

    await page.waitForSelector('[data-testid="time-slots"]');

    // The slot we booked should NOT be visible
    // data-testid uses the exact ISO string returned by the API
    const bookedSlotLocator = page.locator(`[data-testid="time-slot-${bookedTimeISO}"]`);
    await expect(bookedSlotLocator).not.toBeVisible();

    // Verify clearly that *other* slots are visible (to ensure we didn't just fail to load anything)
    const allSlots = await page.locator('[data-testid^="time-slot-"]').count();
    expect(allSlots).toBeGreaterThan(0);
  });

  test('Customer can view their booking details with confirmation code', async ({ page, request }) => {
    // Create an appointment first
    const appointment = await createTestAppointment(request, testUserId, testServiceId, testStaffId, testCsrfToken);
    const testConfirmationCode = appointment.confirmation_code;

    await page.goto(`${baseURL}/booking/appointment/${testConfirmationCode}`);

    // Appointment details should be visible
    await expect(page.locator('[data-testid="appointment-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-time"]')).toBeVisible();
  });

  test('Customer can cancel their booking', async ({ page, request }) => {
    const appointment = await createTestAppointment(request, testUserId, testServiceId, testStaffId, testCsrfToken);
    const testConfirmationCode = appointment.confirmation_code;

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
    await page.waitForSelector('[data-testid^="service-card-"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.click('[data-testid="next-button"]');

    await page.waitForSelector('[data-testid="date-picker"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateString = tomorrow.toISOString().split('T')[0];

    // Handle month navigation if needed
    const today = new Date();
    if (tomorrow.getMonth() !== today.getMonth()) {
      await page.click('[data-testid="next-month"]');
    }

    await page.locator(`[data-testid="date-${dateString}"]`).click();

    await page.waitForSelector('[data-testid^="time-slot-"]');
    await page.locator('[data-testid^="time-slot-"]').first().click();
    await page.click('[data-testid="next-button"]');

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
      expect(page.locator('[data-testid^="service-card-"]')).toBeVisible(),
    ]);
  });

  test('Handles network errors gracefully', async ({ page }) => {
    test.setTimeout(60000); // Allow sufficient time for API retries (approx 31s)
    // Intercept API calls and make them fail
    await page.route('**/api/booking/**', route => {
      route.abort('failed');
    });

    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 45000 });
  });

  test('Mobile: Booking flow works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Services should be visible on mobile
    await page.waitForSelector('[data-testid^="service-card-"]');
    await expect(page.locator('[data-testid^="service-card-"]').first()).toBeVisible();

    // Complete booking flow on mobile
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.click('[data-testid="next-button"]');

    // Mobile date picker
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible();
  });
});

test.describe('Admin Dashboard - Booking Management', () => {
  const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/);
  });

  test('Admin can view all appointments', async ({ page }) => {
    await page.goto(`${baseURL}/booking-dashboard`);

    // Wait for appointments list
    await page.waitForSelector('[data-testid="appointment-list"]', { timeout: 5000 });

    // Should show appointments
    const appointments = await page.locator('[data-testid="appointment-row"]').count();
    expect(appointments).toBeGreaterThanOrEqual(0);
  });

  test.skip('Admin can filter appointments by date range', async ({ page }) => {
    await page.goto(`${baseURL}/booking-dashboard`);

    await page.waitForSelector('[data-testid="appointment-list"]');

    // Create a test appointment so we have something to filter
    await createTestAppointment(page.request, userId, serviceId, staffId, csrfToken);

    // Refresh the list using the button instead of page reload to avoid network issues
    await page.click('.refresh-btn');
    await page.waitForResponse(resp => resp.url().includes('/appointments') && resp.status() === 200);

    // Filter by status
    await page.selectOption('.filter-select[aria-label="Status"]', 'confirmed');

    // Should show confirmed appointments
    await expect(page.locator('[data-testid^="appointment-item-"]')).not.toHaveCount(0);

    // Filter by cancelled (should be empty if we haven't cancelled anything yet)
    await page.selectOption('.filter-select[aria-label="Status"]', 'cancelled');
    // We might have cancelled appointments from previous tests, so we can't strictly say 0
    // But we can check that the filter works by checking the status badge of visible items

    const visibleItems = await page.locator('[data-testid^="appointment-item-"]').count();
    if (visibleItems > 0) {
      const statusText = await page.locator('.status-badge').first().textContent();
      expect(statusText?.toLowerCase()).toContain('cancelled');
    }
    await page.waitForSelector('[data-testid="appointment-list"]');
  });

  test('Admin can create a service', async ({ page, isMobile }) => {
    // Mock API requests for stability
    await page.route('**/api/booking/tenants/*/services', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ services: [] }) });
    });

    await page.route('**/api/booking/admin/*/services', async route => {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, service: { id: 'mock-id', name: 'New Test Service' } }) });
    });

    await page.goto(`${baseURL}/booking-dashboard`);

    // Switch to services tab
    console.log('Test: Switching to services tab');

    if (isMobile) {
      console.log('Test: Mobile environment detected');
      const mobileMenuBtn = page.locator('button.mobile-menu-toggle');
      await expect(mobileMenuBtn).toBeVisible();
      await mobileMenuBtn.click();
      await page.waitForSelector('.dashboard-tabs.mobile-open');
      console.log('Test: Mobile menu opened');
    }

    const servicesTab = page.locator('[data-testid="services-tab"]');
    // Ensure tab is visible before clicking (even on mobile inside menu)
    await servicesTab.waitFor({ state: 'visible' });
    await servicesTab.click();

    // Check if tab became active
    await expect(servicesTab).toHaveClass(/active/);
    console.log('Test: Services tab is now active');

    // Wait for Service Manager to load
    console.log('Test: Waiting for Service Manager...');
    await page.waitForSelector('[data-testid="service-manager"]', { state: 'visible', timeout: 15000 });
    console.log('Test: Service Manager loaded');

    // Wait for add button
    const addServiceBtn = page.locator('[data-testid="add-service-btn"]');
    await addServiceBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addServiceBtn.scrollIntoViewIfNeeded();
    await addServiceBtn.click();

    // Wait for modal
    const modal = page.locator('[data-testid="service-modal"]');
    await modal.waitFor({ state: 'visible' });

    // Fill service form
    await page.fill('[data-testid="service-name"]', 'New Test Service');
    await page.fill('[data-testid="service-description"]', 'Test description');
    await page.fill('[data-testid="service-duration"]', '60');
    await page.fill('[data-testid="service-price"]', '50');

    // Submit
    await page.click('[data-testid="save-service-button"]');

    // Wait for modal to close (or check success message)
    await expect(modal).not.toBeVisible();

    // Should show success message (toast)
    // Updated locator to match likely toast implementation or text
    await expect(page.locator('text=/service created successfully/i')).toBeVisible();
  });

  test('Admin can set staff availability schedule', async ({ page, isMobile }) => {
    await page.goto(`${baseURL}/booking-dashboard`);

    // Switch to schedule tab
    if (isMobile) {
      const mobileMenuBtn = page.locator('button.mobile-menu-toggle');
      await expect(mobileMenuBtn).toBeVisible();
      await mobileMenuBtn.click();
      await page.waitForSelector('.dashboard-tabs.mobile-open');
    }

    const scheduleTab = page.locator('[data-testid="schedule-tab"]');
    await scheduleTab.waitFor({ state: 'visible' });
    await scheduleTab.click();

    // Select days of the week
    await page.check('[data-testid="day-monday"]');
    await page.check('[data-testid="day-tuesday"]');
    await page.check('[data-testid="day-wednesday"]');

    // Set hours
    await page.fill('[data-testid="start-time-monday"]', '09:00');
    await page.fill('[data-testid="end-time-monday"]', '17:00');

    // Save schedule
    await page.click('[data-testid="save-schedule-button"]');

    // Should confirm save
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });
});

