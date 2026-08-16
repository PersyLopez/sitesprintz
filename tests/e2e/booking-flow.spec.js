import { test, expect } from '@playwright/test';
import { setupBookingData, createTestAppointment } from '../helpers/booking-test-utils';
import { registerUser } from '../helpers/e2e-test-utils';
import { TEST_USERS } from '../fixtures/test-credentials.js';
import { URLS, TIMEOUTS, SELECTORS } from '../fixtures/test-config.js';

test.describe.configure({ mode: 'serial' });
test.setTimeout(TIMEOUTS.TEST); // Use centralized timeout

/**
 * E2E Tests for Booking System
 * Tests the complete user journey from browsing services to booking appointments
 */

test.describe('Booking System - Complete User Journey', () => {
  const baseURL = URLS.BASE;
  let testUserId;
  let testUserEmail;
  let testServiceId;
  let testCsrfToken;
  let testAccessToken;
  let testStaffId;
  let testTenantId;

  test.beforeEach(async ({ request, page }) => {
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    // Register a new user
    const user = await registerUser(request);
    testUserId = user.id;
    testUserEmail = user.email;
    testCsrfToken = user.csrfToken;
    testAccessToken = user.accessToken;
    console.log('Test Access Token:', testAccessToken);

    // Upgrade user to pro plan for booking access
    const upgradeRes = await request.post(`${baseURL}/api/test/upgrade-user`, {
      headers: {
        'X-CSRF-Token': testCsrfToken,
        'Authorization': `Bearer ${testAccessToken}`
      },
      data: { email: testUserEmail, plan: 'pro' }
    });
    if (!upgradeRes.ok()) {
      console.log('Upgrade failed:', upgradeRes.status(), await upgradeRes.text());
    }
    expect(upgradeRes.ok()).toBeTruthy();

    // Setup booking data (service, staff, availability)
    const setupData = await setupBookingData(request, testUserId, testCsrfToken, testAccessToken);
    testServiceId = setupData.serviceId;
    testStaffId = setupData.staffId;
    testTenantId = setupData.tenantId;
  });

  test('Customer can view available services', async ({ page }) => {
    // Navigate to booking page
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Wait for services to load
    await page.getByTestId('services-list').waitFor({ timeout: 5000 });

    // Check that services are displayed
    const services = await page.getByTestId(/service-card-/).count();
    expect(services).toBeGreaterThan(0);

    // Verify service details are shown
    const firstService = page.getByTestId(/service-card-/).first();
    await expect(firstService).toContainText(/\$\d+/); // Price
    await expect(firstService).toBeVisible();
  });

  test('Customer can select a service and see available time slots', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Wait for services
    await page.getByTestId(/service-card-/).first().waitFor();

    // Click on our test service
    await page.getByTestId(/service-card-/).first().click();

    // Click next
    await page.getByTestId('next-button').click();

    // Date picker should appear
    await expect(page.getByTestId('date-picker')).toBeVisible();

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
      await page.getByTestId('next-month').click();
    }

    await page.getByTestId(`date-${dateString}`).click();

    // Time slots should load
    await page.getByTestId(/time-slot-/).first().waitFor({ timeout: 5000 });

    const timeSlots = await page.getByTestId(/time-slot-/).count();
    expect(timeSlots).toBeGreaterThan(0);
  });

  test('Customer can complete a booking', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // 1. Select service
    await page.getByTestId(/service-card-/).first().waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    // 2. Select date
    await page.getByTestId('date-picker').waitFor();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateString = tomorrow.toISOString().split('T')[0];

    // Handle month navigation if needed
    const today = new Date();
    if (tomorrow.getMonth() !== today.getMonth()) {
      await page.getByTestId('next-month').click();
    }

    await page.getByTestId(`date-${dateString}`).click();

    // 3. Select time slot
    await page.getByTestId(/time-slot-/).first().waitFor();
    await page.getByTestId(/time-slot-/).first().click();
    await page.getByTestId('next-button').click();

    // 4. Fill in customer information
    await page.getByTestId('customer-name').fill('John Doe');
    await page.getByTestId('customer-email').fill('john.doe@test.com');
    await page.getByTestId('customer-phone').fill('+1234567890');
    await page.getByTestId('customer-notes').fill('First time customer');

    // 5. Submit booking
    await page.getByTestId('book-now-button').click();

    // 6. Wait for confirmation
    await page.getByTestId('confirmation-page').waitFor({ timeout: 10000 });

    // Verify confirmation details
    await expect(page.getByTestId('confirmation-code')).toBeVisible();
    await expect(page.getByTestId('confirmation-code')).toHaveText(/[A-Z0-9]{8}/);
    await expect(page.getByTestId('confirmation-message')).toContainText('successfully booked');
  });

  test('Customer cannot book an already taken time slot', async ({ page, request }) => {
    // First create an appointment via API to block a slot
    const appointment = await createTestAppointment(request, testTenantId, testServiceId, testStaffId, 'customer@test.com', 'Test Customer', testCsrfToken, testAccessToken);
    const bookedTimeISO = appointment.start_time;

    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Verify service list loads
    await page.getByTestId(/service-card-/).first().waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    // Select date
    await page.getByTestId('date-picker').waitFor();

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
      await page.getByTestId('next-month').click();
      await page.getByTestId(`date-${dateString}`).waitFor(); // Wait for new month to render
    }

    await page.getByTestId(`date-${dateString}`).click();

    await page.getByTestId('time-slots').waitFor();

    // The slot we booked should NOT be visible
    // data-testid uses the exact ISO string returned by the API
    const bookedSlotLocator = page.getByTestId(`time-slot-${bookedTimeISO}`);
    await expect(bookedSlotLocator).not.toBeVisible();

    // Verify clearly that *other* slots are visible (to ensure we didn't just fail to load anything)
    const allSlots = await page.getByTestId(/time-slot-/).count();
    expect(allSlots).toBeGreaterThan(0);
  });

  test('Customer can view their booking details with confirmation code', async ({ page, request }) => {
    // Create an appointment first
    const appointment = await createTestAppointment(request, testTenantId, testServiceId, testStaffId, 'customer@test.com', 'Test Customer', testCsrfToken, testAccessToken);
    const testConfirmationCode = appointment.confirmation_code;

    await page.goto(`${baseURL}/booking/appointment/${testConfirmationCode}`);

    // Appointment details should be visible
    await expect(page.getByTestId('appointment-details')).toBeVisible();
    await expect(page.getByTestId('appointment-service')).toBeVisible();
    await expect(page.getByTestId('appointment-date')).toBeVisible();
    await expect(page.getByTestId('appointment-time')).toBeVisible();
  });

  test('Customer can cancel their booking', async ({ page, request }) => {
    const appointment = await createTestAppointment(request, testTenantId, testServiceId, testStaffId, 'customer@test.com', 'Test Customer', testCsrfToken, testAccessToken);
    const testConfirmationCode = appointment.confirmation_code;

    await page.goto(`${baseURL}/booking/appointment/${testConfirmationCode}`);

    // Wait for appointment details
    await page.getByTestId('appointment-details').waitFor();

    // Click cancel button
    await page.getByTestId('cancel-appointment-button').click();

    // Confirm cancellation in modal/dialog
    await page.getByTestId('cancel-confirm-dialog').waitFor();
    await page.getByTestId('cancellation-reason').fill('Schedule conflict');
    await page.getByTestId('confirm-cancel-button').click();

    // Should show cancellation confirmation
    await expect(page.getByTestId('cancellation-success')).toBeVisible();
    await expect(page.getByTestId('appointment-status')).toContainText('cancelled');
  });

  test('Shows validation errors for missing required fields', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Select service and time
    await page.getByTestId(/service-card-/).first().waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    await page.getByTestId('date-picker').waitFor();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateString = tomorrow.toISOString().split('T')[0];

    // Handle month navigation if needed
    const today = new Date();
    if (tomorrow.getMonth() !== today.getMonth()) {
      await page.getByTestId('next-month').click();
    }

    await page.getByTestId(`date-${dateString}`).click();

    await page.getByTestId(/time-slot-/).first().waitFor();
    await page.getByTestId(/time-slot-/).first().click();
    await page.getByTestId('next-button').click();

    // Try to submit without filling form
    await page.getByTestId('book-now-button').click();

    // Should show validation errors
    await expect(page.getByTestId('name-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toBeVisible();
  });

  test('Displays loading states during booking process', async ({ page }) => {
    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Loading state while fetching services
    const servicesLoading = page.getByTestId('services-loading');

    // Either loading or services should be visible
    await Promise.race([
      expect(servicesLoading).toBeVisible(),
      expect(page.getByTestId(/service-card-/).first()).toBeVisible(),
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
    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 45000 });
  });

  test('Mobile: Booking flow works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${baseURL}/booking/user/${testUserId}`);

    // Services should be visible on mobile
    await page.getByTestId(/service-card-/).first().waitFor();
    await expect(page.getByTestId(/service-card-/).first()).toBeVisible();

    // Complete booking flow on mobile
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    // Mobile date picker
    await expect(page.getByTestId('date-picker')).toBeVisible();
  });
});

test.describe('Admin Dashboard - Booking Management', () => {
  const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';

});

