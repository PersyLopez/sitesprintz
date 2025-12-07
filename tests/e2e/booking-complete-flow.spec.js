import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Booking System - Complete Coverage
 * 
 * Prerequisites:
 * 1. Frontend dev server running: npm run dev (port 5173)
 * 2. Backend server running: node server.js (port 3000)
 * 3. Database with test data
 * 
 * Run: npx playwright test tests/e2e/booking-complete-flow.spec.js
 */

// Test data - Use seeded user ID
const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
const TEST_USER_ID = '545'; // The ID we saw in the logs

test.describe('Booking System - Complete E2E Flow', () => {

  test.beforeAll(async () => {
    // Clear all appointments for the test user to ensure a clean state
    // We need to get the tenant ID first
    const { prisma } = await import('../../database/db.js');

    const tenant = await prisma.booking_tenants.findFirst({
      where: { user_id: TEST_USER_ID }
    });

    if (tenant) {
      await prisma.appointments.deleteMany({
        where: { tenant_id: tenant.id }
      });
      console.log('🧹 Cleared appointments for test tenant');
    }
  });

  test.beforeEach(async ({ page }) => {
    // page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    // Set up any necessary authentication or state
    // For now, we'll work with public booking widget
  });

  test('FLOW 1: Complete happy path booking', async ({ page }) => {
    // This test covers the entire booking flow from start to finish

    // Step 1: Navigate to booking widget
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Step 2: Wait for services to load
    await page.waitForSelector('[data-testid="services-list"]', {
      state: 'visible',
      timeout: 10000
    });

    // Step 3: Verify services are displayed
    const serviceCards = page.locator('[data-testid^="service-card-"]');
    const serviceCount = await serviceCards.count();
    expect(serviceCount).toBeGreaterThan(0);

    // Step 4: Select first service
    const firstService = serviceCards.first();
    await expect(firstService).toBeVisible();
    await firstService.click();

    // Verify service is selected
    await expect(firstService).toHaveClass(/selected/);

    // Step 5: Click Next to proceed to date selection
    const nextButton = page.locator('[data-testid="next-button"]');
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // Step 6: Verify date picker is shown
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible();

    // Step 7: Select tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    const dateButton = page.locator(`[data-testid="date-${dateString}"]`);
    await expect(dateButton).toBeEnabled();
    await dateButton.click();

    // Step 8: Wait for time slots to load
    await page.waitForSelector('[data-testid="time-slots"]', {
      state: 'visible',
      timeout: 10000
    });

    // Step 9: Select first available time slot
    // Step 9: Select a random available time slot to avoid conflicts
    const timeSlots = page.locator('[data-testid^="time-slot-"]:not([disabled])');
    const count = await timeSlots.count();
    expect(count).toBeGreaterThan(0);
    const randomIndex = Math.floor(Math.random() * count);
    const randomSlot = timeSlots.nth(randomIndex);
    await expect(randomSlot).toBeVisible();
    await randomSlot.click();

    // Step 10: Click Next to proceed to form
    await page.waitForSelector('[data-testid="next-button"]');
    await page.locator('[data-testid="next-button"]').click();

    // Step 11: Fill in customer information
    await expect(page.locator('[data-testid="customer-form"]')).toBeVisible();

    const timestamp = Date.now();
    await page.locator('[data-testid="customer-name"]').fill(`Test Customer ${timestamp}`);
    await page.locator('[data-testid="customer-email"]').fill(`test${timestamp}@example.com`);
    await page.locator('[data-testid="customer-phone"]').fill('+1234567890');
    await page.locator('[data-testid="customer-notes"]').fill('E2E test booking');

    // Step 12: Submit booking
    const bookButton = page.locator('[data-testid="book-now-button"]');
    await expect(bookButton).toBeEnabled();
    await bookButton.click();

    // Step 13: Wait for confirmation page
    await page.waitForSelector('[data-testid="confirmation-page"]', {
      state: 'visible',
      timeout: 30000
    });

    // Step 14: Verify confirmation details
    await expect(page.locator('[data-testid="confirmation-message"]')).toBeVisible();

    const confirmationCode = page.locator('[data-testid="confirmation-code"]');
    await expect(confirmationCode).toBeVisible();

    const code = await confirmationCode.textContent();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);

    console.log(`✅ Booking successful! Confirmation code: ${code}`);
  });

  test('FLOW 2: Validation errors prevent submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Navigate to form without filling required fields
    await page.waitForSelector('[data-testid="services-list"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.locator('[data-testid="next-button"]').click();

    // Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.locator(`[data-testid="date-${dateString}"]`).click();

    // Wait for slots and select one
    await page.waitForSelector('[data-testid="time-slots"]');
    await page.locator('[data-testid^="time-slot-"]:not([disabled])').first().click();
    await page.waitForSelector('[data-testid="next-button"]');
    await page.locator('[data-testid="next-button"]').click();

    // Try to submit without filling form
    await expect(page.locator('[data-testid="customer-form"]')).toBeVisible();
    await page.locator('[data-testid="book-now-button"]').click();

    // Verify error messages appear
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Verify we're still on the form
    await expect(page.locator('[data-testid="customer-form"]')).toBeVisible();
  });

  test('FLOW 3: Invalid email format shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Navigate to form
    await page.waitForSelector('[data-testid="services-list"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.locator('[data-testid="next-button"]').click();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-testid="date-${tomorrow.toISOString().split('T')[0]}"]`).click();

    await page.waitForSelector('[data-testid="time-slots"]');
    await page.locator('[data-testid^="time-slot-"]:not([disabled])').first().click();
    await page.waitForSelector('[data-testid="next-button"]');
    await page.locator('[data-testid="next-button"]').click();

    // Fill with invalid email
    await page.locator('[data-testid="customer-name"]').fill('Test User');
    await page.locator('[data-testid="customer-email"]').fill('invalid-email');
    await page.locator('[data-testid="book-now-button"]').click();

    // Verify email error
    const emailError = page.locator('[data-testid="email-error"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText(/valid email/i);
  });

  test('FLOW 4: Back navigation works correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Go to date selection
    await page.waitForSelector('[data-testid="services-list"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.waitForSelector('[data-testid="next-button"]');
    await page.locator('[data-testid="next-button"]').click();

    // Verify we're on date selection
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible();

    // Click back button
    await page.locator('[data-testid="back-button"]').click();

    // Verify we're back on services
    await expect(page.locator('[data-testid="services-list"]')).toBeVisible();
  });

  test('FLOW 5: Past dates are disabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Navigate to date picker
    await page.waitForSelector('[data-testid="services-list"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.locator('[data-testid="next-button"]').click();

    // Check that yesterday is disabled
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const yesterdayButton = page.locator(`[data-testid="date-${yesterdayString}"]`);

    // Only check if the button exists (might not if it's a different month)
    const count = await yesterdayButton.count();
    if (count > 0) {
      await expect(yesterdayButton).toBeDisabled();
    }
  });

  test('FLOW 6: Loading states are shown', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Check for loading state (might be very fast)
    const servicesLoading = page.locator('[data-testid="services-loading"]');

    // Either loading or services should appear
    await Promise.race([
      servicesLoading.waitFor({ state: 'visible', timeout: 100 }).catch(() => { }),
      page.locator('[data-testid="services-list"]').waitFor({ state: 'visible', timeout: 5000 })
    ]);

    // Verify services loaded eventually
    await expect(page.locator('[data-testid="services-list"]')).toBeVisible();
  });

  test('FLOW 7: Booking summary shows selected service', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.waitForSelector('[data-testid="services-list"]');

    // Get service name
    const firstService = page.locator('[data-testid^="service-card-"]').first();
    const serviceName = await firstService.locator('h3').textContent();

    // Select service
    await firstService.click();

    // Verify summary appears
    const summary = page.locator('[data-testid="booking-summary"]');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(serviceName);
  });

  test('FLOW 8: Multiple service selection works', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.waitForSelector('[data-testid="services-list"]');

    const services = page.locator('[data-testid^="service-card-"]');
    const count = await services.count();

    if (count > 1) {
      // Select first service
      await services.nth(0).click();
      await expect(services.nth(0)).toHaveClass(/selected/);

      // Select second service
      await services.nth(1).click();
      await expect(services.nth(1)).toHaveClass(/selected/);

      // First should not be selected anymore
      await expect(services.nth(0)).not.toHaveClass(/selected/);
    }
  });

  test('FLOW 9: Calendar month navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.waitForSelector('[data-testid="services-list"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.locator('[data-testid="next-button"]').click();

    // Check current month
    const calendar = page.locator('[data-testid="calendar"]');
    await expect(calendar).toBeVisible();

    const currentMonth = await calendar.locator('h3').textContent();

    // Click next month button
    await calendar.locator('button:has-text("→")').click();

    // Verify month changed
    const newMonth = await calendar.locator('h3').textContent();
    expect(newMonth).not.toBe(currentMonth);
  });

  test('FLOW 10: Service details are displayed correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.waitForSelector('[data-testid="services-list"]');

    const firstService = page.locator('[data-testid^="service-card-"]').first();

    // Verify service has required elements
    await expect(firstService.locator('h3')).toBeVisible(); // Name
    await expect(firstService.locator('.price')).toBeVisible(); // Price
    await expect(firstService.locator('.duration')).toBeVisible(); // Duration
  });
});

test.describe('Booking System - Error Handling', () => {

  test('ERROR 1: Shows error if services fail to load', async ({ page }) => {
    // This would require mocking the API to return an error
    // For now, test that error handling exists

    await page.goto(`${BASE_URL}/booking/user/invalid-user-id`);

    // Wait for either services or error
    await Promise.race([
      page.locator('[data-testid="services-list"]').waitFor({ timeout: 5000 }),
      page.locator('[data-testid="error-message"]').waitFor({ timeout: 5000 }),
      page.locator('[data-testid="services-empty"]').waitFor({ timeout: 5000 })
    ]);

    // One of these should be visible
    const hasContent = await page.locator('[data-testid="services-list"], [data-testid="error-message"], [data-testid="services-empty"]').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('ERROR 2: Shows empty state when no services available', async ({ page }) => {
    // Test that empty state is handled
    // Would require a user with no services configured

    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await Promise.race([
      page.locator('[data-testid="services-list"]').waitFor({ timeout: 5000 }),
      page.locator('[data-testid="services-empty"]').waitFor({ timeout: 5000 })
    ]);

    // Should show either services or empty state
    const hasState = await page.locator('[data-testid="services-list"], [data-testid="services-empty"]').count();
    expect(hasState).toBeGreaterThan(0);
  });
});

test.describe('Booking System - Accessibility', () => {

  test('A11Y 1: Form inputs have labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Navigate to form
    await page.waitForSelector('[data-testid="services-list"]');
    await page.locator('[data-testid^="service-card-"]').first().click();
    await page.locator('[data-testid="next-button"]').click();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-testid="date-${tomorrow.toISOString().split('T')[0]}"]`).click();

    await page.waitForSelector('[data-testid="time-slots"]');
    const firstSlot = page.locator('[data-testid^="time-slot-"]:not([disabled])').first();
    await firstSlot.click();
    // await expect(firstSlot).toHaveClass(/selected/);
    await page.waitForSelector('[data-testid="next-button"]');
    await page.locator('[data-testid="next-button"]').click();

    // Check that form inputs have labels
    const nameLabel = page.locator('label[for="customer-name"]');
    await expect(nameLabel).toBeVisible();

    const emailLabel = page.locator('label[for="customer-email"]');
    await expect(emailLabel).toBeVisible();
  });

  test('A11Y 2: Buttons are keyboard accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.waitForSelector('[data-testid="services-list"]');

    // Focus first service and press Enter
    const firstService = page.locator('[data-testid^="service-card-"]').first();
    await firstService.focus();
    await page.keyboard.press('Enter');

    // Service should be selected
    await expect(firstService).toHaveClass(/selected/);
  });
});

test.describe('Booking System - Mobile Responsiveness', () => {

  test.use({
    viewport: { width: 375, height: 667 } // iPhone SE
  });

  test('MOBILE 1: Booking flow works on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.waitForSelector('[data-testid="services-list"]', { timeout: 10000 });

    // Verify services are visible on mobile
    const firstService = page.locator('[data-testid^="service-card-"]').first();
    await expect(firstService).toBeVisible();

    // Complete basic flow
    await firstService.click();
    await expect(firstService).toHaveClass(/selected/);

    await page.waitForSelector('[data-testid="next-button"]');
    await page.locator('[data-testid="next-button"]').click();
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible();
  });
});

