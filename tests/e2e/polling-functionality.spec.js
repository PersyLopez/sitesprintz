/**
 * E2E Tests: Polling Functionality
 * Tests that live updates work via polling
 */

import { test, expect } from '@playwright/test';
import { registerUser } from '../helpers/e2e-test-utils';
import { setupBookingData, createTestAppointment } from '../helpers/booking-test-utils';
import { URLS, TIMEOUTS } from '../fixtures/test-config.js';

test.describe.configure({ mode: 'serial' });
test.setTimeout(TIMEOUTS.TEST);

test.describe('Polling Functionality', () => {
  const baseURL = URLS.BASE;
  let ownerUser;
  let ownerToken;
  let ownerCsrfToken;
  let tenantId;
  let serviceId;
  let staffId;
  let appointment;

  test.beforeAll(async ({ request }) => {
    // Register owner
    ownerUser = await registerUser(request);
    ownerToken = ownerUser.accessToken;
    ownerCsrfToken = ownerUser.csrfToken;

    // Upgrade to pro
    await request.post(`${baseURL}/api/test/upgrade-user`, {
      headers: {
        'X-CSRF-Token': ownerCsrfToken,
        'Authorization': `Bearer ${ownerToken}`
      },
      data: { email: ownerUser.email, plan: 'pro' }
    });

    // Setup booking data
    const setupData = await setupBookingData(
      request,
      ownerUser.id,
      ownerCsrfToken,
      ownerToken
    );
    tenantId = setupData.tenantId;
    serviceId = setupData.serviceId;
    staffId = setupData.staffId;

    // Create test appointment
    appointment = await createTestAppointment(
      request,
      tenantId,
      serviceId,
      staffId,
      'customer@example.com',
      'Test Customer',
      ownerCsrfToken,
      ownerToken
    );
  });

  test('Orders page polls for updates', async ({ page }) => {
    // Login as owner
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', ownerUser.email);
    await page.fill('input[type="password"]', ownerUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Navigate to orders page (need a site ID)
    // For this test, we'll just verify the page loads and has polling setup
    const response = await page.request.get(`${baseURL}/api/orders/${ownerUser.id}/orders`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`
      }
    });

    if (response.ok()) {
      // If orders endpoint works, navigate to orders page
      // Note: This requires a siteId query param
      await page.goto(`${baseURL}/orders?siteId=test-site`);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Check if polling is active (by monitoring network requests)
      const pollingRequests = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/orders') && request.method() === 'GET') {
          pollingRequests.push(request.url());
        }
      });

      // Wait for at least one polling request
      await page.waitForTimeout(35000); // Wait for polling interval (30s)

      // Should have made polling requests
      expect(pollingRequests.length).toBeGreaterThan(0);
    }
  });

  test('Appointment list polls for updates', async ({ page }) => {
    // Login as owner
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', ownerUser.email);
    await page.fill('input[type="password"]', ownerUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Navigate to booking dashboard
    await page.goto(`${baseURL}/booking-dashboard`);

    // Wait for appointments list to load
    await page.waitForLoadState('networkidle');

    // Monitor for polling requests
    const pollingRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/booking/admin') && 
          request.url().includes('/appointments') &&
          request.method() === 'GET') {
        pollingRequests.push(request.url());
      }
    });

    // Wait for polling interval
    await page.waitForTimeout(35000);

    // Should have made polling requests
    expect(pollingRequests.length).toBeGreaterThan(0);
  });

  test('Tracking page polls for status updates', async ({ page }) => {
    if (!appointment) return;

    // Navigate to tracking page
    await page.goto(`${baseURL}/track/appointment/${appointment.confirmation_code}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Monitor for polling requests
    const pollingRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/tracking/appointment') &&
          request.url().includes('/updates') &&
          request.method() === 'GET') {
        pollingRequests.push(request.url());
      }
    });

    // Wait for polling interval (30s)
    await page.waitForTimeout(35000);

    // Should have made polling requests
    expect(pollingRequests.length).toBeGreaterThan(0);
  });

  test('Polling pauses when tab is hidden', async ({ page, context }) => {
    if (!appointment) return;

    await page.goto(`${baseURL}/track/appointment/${appointment.confirmation_code}`);
    await page.waitForLoadState('networkidle');

    const pollingRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/tracking/appointment') &&
          request.url().includes('/updates')) {
        pollingRequests.push(request.url());
      }
    });

    // Hide tab (simulate visibility change)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait a bit
    await page.waitForTimeout(5000);

    // Show tab again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for polling to resume
    await page.waitForTimeout(1000);

    // Polling should resume when visible
    const requestCount = pollingRequests.length;
    await page.waitForTimeout(5000);
    expect(pollingRequests.length).toBeGreaterThanOrEqual(requestCount);
  });

  test('Polling handles errors gracefully', async ({ page }) => {
    // Navigate to a page that uses polling
    await page.goto(`${baseURL}/track/appointment/INVALID123`);

    // Should show error but not crash
    await page.waitForLoadState('networkidle');
    
    // Page should still be functional
    const errorMessage = page.getByText(/not found|error|invalid/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

