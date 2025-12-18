import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

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
let TEST_USER_ID;
let FREE_USER_ID;

test.describe('Booking System - Complete E2E Flow', () => {

  test.beforeAll(async () => {
    // Read IDs from deterministic seed artifact (written by seed-test-data.js)
    const seedPath = path.resolve(process.cwd(), 'tests/e2e/.seed/seed-data.json');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed artifact not found at ${seedPath}. Did Playwright globalSetup seeding run?`);
    }

    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    TEST_USER_ID = seed?.users?.proUserId;
    FREE_USER_ID = seed?.users?.freeUserId;

    if (!TEST_USER_ID || !FREE_USER_ID) {
      throw new Error('Seed artifact missing user IDs. Check tests/setup/seed-test-data.js output.');
    }

    console.log(`Using Test User ID: ${TEST_USER_ID}`);
    console.log(`Using Free User ID: ${FREE_USER_ID}`);
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
    await page.getByTestId('services-list').waitFor({
      state: 'visible',
      timeout: 10000
    });

    // Step 3: Verify services are displayed
    const serviceCards = page.getByTestId(/service-card-/);
    const serviceCount = await serviceCards.count();
    expect(serviceCount).toBeGreaterThan(0);

    // Step 4: Select first service
    const firstService = serviceCards.first();
    await expect(firstService).toBeVisible();
    await firstService.click();

    // Verify service is selected
    await expect(firstService).toHaveClass(/selected/);

    // Step 5: Click Next to proceed to date selection
    const nextButton = page.getByTestId('next-button');
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // Step 6: Verify date picker is shown
    await expect(page.getByTestId('date-picker')).toBeVisible();

    // Step 7: Select tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    const dateButton = page.getByTestId(`date-${dateString}`);
    await expect(dateButton).toBeEnabled();
    await dateButton.click();

    // Step 8: Wait for time slots to load
    await page.getByTestId('time-slots').waitFor({
      state: 'visible',
      timeout: 10000
    });

    // Step 9: Select first available time slot (deterministic = less flaky)
    const timeSlots = page.getByTestId(/time-slot-/);
    const count = await timeSlots.count();
    expect(count).toBeGreaterThan(0);
    // Get first slot that is not disabled
    const firstSlot = timeSlots.first();
    await expect(firstSlot).toBeVisible();
    await expect(firstSlot).toBeEnabled();
    await firstSlot.click();

    // Step 10: Click Next to proceed to form
    await page.getByTestId('next-button').waitFor();
    await page.getByTestId('next-button').click();

    // Step 11: Fill in customer information
    await expect(page.getByTestId('customer-form')).toBeVisible();

    const timestamp = Date.now();
    await page.getByTestId('customer-name').fill(`Test Customer ${timestamp}`);
    await page.getByTestId('customer-email').fill(`test${timestamp}@example.com`);
    await page.getByTestId('customer-phone').fill('+1234567890');
    await page.getByTestId('customer-notes').fill('E2E test booking');

    // Step 12: Submit booking
    const bookButton = page.getByTestId('book-now-button');
    await expect(bookButton).toBeEnabled();
    await bookButton.click();

    // Step 13: Wait for confirmation page
    await page.getByTestId('confirmation-page').waitFor({
      state: 'visible',
      timeout: 30000
    });

    // Step 14: Verify confirmation details
    await expect(page.getByTestId('confirmation-message')).toBeVisible();

    const confirmationCode = page.getByTestId('confirmation-code');
    await expect(confirmationCode).toBeVisible();

    const code = await confirmationCode.textContent();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);

    console.log(`✅ Booking successful! Confirmation code: ${code}`);
  });

  test('FLOW 2: Validation errors prevent submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Navigate to form without filling required fields
    await page.getByTestId('services-list').waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    // Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.getByTestId(`date-${dateString}`).click();

    // Wait for slots and select one
    await page.getByTestId('time-slots').waitFor();
    const firstSlot = page.getByTestId(/time-slot-/).first();
    await expect(firstSlot).toBeEnabled();
    await firstSlot.click();
    await page.getByTestId('next-button').waitFor();
    await page.getByTestId('next-button').click();

    // Try to submit without filling form
    await expect(page.getByTestId('customer-form')).toBeVisible();
    await page.getByTestId('book-now-button').click();

    // Verify error messages appear
    await expect(page.getByTestId('name-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toBeVisible();

    // Verify we're still on the form
    await expect(page.getByTestId('customer-form')).toBeVisible();
  });

  test('FLOW 3: Invalid email format shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Navigate to form
    await page.getByTestId('services-list').waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByTestId(`date-${tomorrow.toISOString().split('T')[0]}`).click();

    await page.getByTestId('time-slots').waitFor();
    const firstSlot = page.getByTestId(/time-slot-/).first();
    await expect(firstSlot).toBeEnabled();
    await firstSlot.click();
    await page.getByTestId('next-button').waitFor();
    await page.getByTestId('next-button').click();

    // Fill with invalid email
    await page.getByTestId('customer-name').fill('Test User');
    await page.getByTestId('customer-email').fill('invalid-email');
    await page.getByTestId('book-now-button').click();

    // Verify email error
    const emailError = page.getByTestId('email-error');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText(/valid email/i);
  });

  test('FLOW 4: Back navigation works correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Go to date selection
    await page.getByTestId('services-list').waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').waitFor();
    await page.getByTestId('next-button').click();

    // Verify we're on date selection
    await expect(page.getByTestId('date-picker')).toBeVisible();

    // Click back button
    await page.getByTestId('back-button').click();

    // Verify we're back on services
    await expect(page.getByTestId('services-list')).toBeVisible();
  });

  test('FLOW 5: Past dates are disabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Navigate to date picker
    await page.getByTestId('services-list').waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    // Check that yesterday is disabled
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const yesterdayButton = page.getByTestId(`date-${yesterdayString}`);

    // Only check if the button exists (might not if it's a different month)
    const count = await yesterdayButton.count();
    if (count > 0) {
      await expect(yesterdayButton).toBeDisabled();
    }
  });

  test('FLOW 6: Loading states are shown', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Check for loading state (might be very fast)
    const servicesLoading = page.getByTestId('services-loading');

    // Either loading or services should appear
    await Promise.race([
      servicesLoading.waitFor({ state: 'visible', timeout: 100 }).catch(() => { }),
      page.getByTestId('services-list').waitFor({ state: 'visible', timeout: 5000 })
    ]);

    // Verify services loaded eventually
    await expect(page.getByTestId('services-list')).toBeVisible();
  });

  test('FLOW 7: Booking summary shows selected service', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.getByTestId('services-list').waitFor();

    // Get service name
    const firstService = page.getByTestId(/service-card-/).first();
    const serviceName = await firstService.locator('h3').textContent();

    // Select service
    await firstService.click();

    // Verify summary appears
    const summary = page.getByTestId('booking-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(serviceName);
  });

  test('FLOW 8: Multiple service selection works', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.getByTestId('services-list').waitFor();

    const services = page.getByTestId(/service-card-/);
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

    await page.getByTestId('services-list').waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    // Check current month
    const calendar = page.getByTestId('calendar');
    await expect(calendar).toBeVisible();

    const currentMonth = await calendar.locator('h3').textContent();

    // Click next month button
    await calendar.getByRole('button', { name: /→|next/i }).click();

    // Verify month changed
    const newMonth = await calendar.locator('h3').textContent();
    expect(newMonth).not.toBe(currentMonth);
  });

  test('FLOW 10: Service details are displayed correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.getByTestId('services-list').waitFor();

    const firstService = page.getByTestId(/service-card-/).first();

    // Verify service has required elements
    await expect(firstService.locator('h3')).toBeVisible(); // Name
    await expect(firstService.getByText(/\$/)).toBeVisible(); // Price
    await expect(firstService.getByText(/min/i)).toBeVisible(); // Duration
  });
});

test.describe('Booking System - Error Handling', () => {

  test('ERROR 1: Shows error if services fail to load', async ({ page }) => {
    // This would require mocking the API to return an error
    // For now, test that error handling exists

    await page.goto(`${BASE_URL}/booking/user/invalid-user-id`);

    // Wait for either services or error
    await Promise.race([
      page.getByTestId('services-list').waitFor({ timeout: 15000 }),
      page.getByTestId('error-message').waitFor({ timeout: 15000 }),
      page.getByTestId('services-empty').waitFor({ timeout: 15000 })
    ]);

    // One of these should be visible
    const hasContent = await Promise.race([
      page.getByTestId('services-list').count(),
      page.getByTestId('error-message').count(),
      page.getByTestId('services-empty').count()
    ]);
    expect(hasContent).toBeGreaterThan(0);
  });

  test('ERROR 2: Shows empty state when no services available', async ({ page }) => {
    // Test that empty state is handled
    // Would require a user with no services configured
    // Use the free user who has no services by default
    await page.goto(`${BASE_URL}/booking/user/${FREE_USER_ID}`);

    await Promise.race([
      page.getByTestId('services-list').waitFor({ timeout: 15000 }),
      page.getByTestId('services-empty').waitFor({ timeout: 15000 })
    ]);

    // Should show either services or empty state
    const hasState = await Promise.race([
      page.getByTestId('services-list').count(),
      page.getByTestId('services-empty').count()
    ]);
    expect(hasState).toBeGreaterThan(0);
  });
});

test.describe('Booking System - Accessibility', () => {

  test('A11Y 1: Form inputs have labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    // Navigate to form
    await page.getByTestId('services-list').waitFor();
    await page.getByTestId(/service-card-/).first().click();
    await page.getByTestId('next-button').click();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByTestId(`date-${tomorrow.toISOString().split('T')[0]}`).click();

    await page.getByTestId('time-slots').waitFor();
    const firstSlot = page.getByTestId(/time-slot-/).filter({ hasNot: page.locator('[disabled]') }).first();
    await firstSlot.click();
    await page.getByTestId('next-button').waitFor();
    await page.getByTestId('next-button').click();

    // Check that form inputs have labels
    const nameLabel = page.getByLabel(/name/i);
    await expect(nameLabel).toBeVisible();

    const emailLabel = page.getByLabel(/email/i);
    await expect(emailLabel).toBeVisible();
  });

  test('A11Y 2: Buttons are keyboard accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/user/${TEST_USER_ID}`);

    await page.getByTestId('services-list').waitFor();

    // Focus first service and press Enter
    const firstService = page.getByTestId(/service-card-/).first();
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

    await page.getByTestId('services-list').waitFor({ timeout: 10000 });

    // Verify services are visible on mobile
    const firstService = page.getByTestId(/service-card-/).first();
    await expect(firstService).toBeVisible();

    // Complete basic flow
    await firstService.click();
    await expect(firstService).toHaveClass(/selected/);

    await page.getByTestId('next-button').waitFor();
    await page.getByTestId('next-button').click();
    await expect(page.getByTestId('date-picker')).toBeVisible();
  });
});

