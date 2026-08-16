/**
 * E2E Tests: Customer Tracking Pages
 * Tests order and appointment tracking functionality
 */

import { test, expect } from '@playwright/test';
import { registerUser } from '../helpers/e2e-test-utils';
import { setupBookingData, createTestAppointment } from '../helpers/booking-test-utils';
import { URLS, TIMEOUTS } from '../fixtures/test-config.js';

test.describe.configure({ mode: 'serial' });
test.setTimeout(TIMEOUTS.TEST);

test.describe('Customer Tracking Pages', () => {
  const baseURL = URLS.BASE;
  let ownerUser;
  let ownerToken;
  let ownerCsrfToken;
  let tenantId;
  let serviceId;
  let appointment;
  let trackingToken;
  let orderId;

  test.beforeAll(async ({ request }) => {
    // Register owner user
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

    // Create a test appointment
    appointment = await createTestAppointment(
      request,
      tenantId,
      serviceId,
      setupData.staffId,
      'customer@example.com',
      'Test Customer',
      ownerCsrfToken,
      ownerToken
    );
  });

  test('Customer can lookup appointment by confirmation code', async ({ page }) => {
    await page.goto(`${baseURL}/track`);
    await page.waitForLoadState('networkidle');

    // Should show lookup form
    await expect(page.getByText(/Track Your Order or Appointment/i)).toBeVisible({ timeout: 10000 });

    // Select appointment type
    await page.selectOption('select#type', 'appointment');

    // Fill in confirmation code and email
    await page.fill('input#referenceId', appointment.confirmation_code);
    await page.fill('input#email', 'customer@example.com');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to tracking page (either by token or confirmation code)
    await page.waitForURL(/track\/appointment/, { timeout: 10000 });
    await expect(page.getByText(/Track Your Appointment|Appointment Status/i)).toBeVisible({ timeout: 5000 });
  });

  test('Customer can view appointment tracking page', async ({ page }) => {
    await page.goto(`${baseURL}/track/appointment/${appointment.confirmation_code}`);

    // Should show appointment details
    await expect(page.getByText(/Track Your Appointment/i)).toBeVisible();
    await expect(page.getByText(appointment.confirmation_code)).toBeVisible();
    await expect(page.getByText(/Test Customer/i)).toBeVisible();
  });

  test('Customer can lookup order by email and order ID', async ({ request, page }) => {
    // First, create a test order
    const orderResponse = await request.post(`${baseURL}/api/orders/${ownerUser.id}/orders`, {
      headers: {
        'X-CSRF-Token': ownerCsrfToken,
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        customer_name: 'Test Customer',
        customer_email: 'customer@example.com',
        customer_phone: '555-1234',
        total: 50.00,
        items: [{ name: 'Test Product', quantity: 1, price: 50.00 }],
        status: 'pending'
      }
    });

    if (orderResponse.ok()) {
      const orderData = await orderResponse.json();
      orderId = orderData.order?.id;

      // Generate tracking token
      const lookupResponse = await request.post(`${baseURL}/api/tracking/lookup`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          type: 'order',
          referenceId: orderId,
          email: 'customer@example.com'
        }
      });

      if (lookupResponse.ok()) {
        const lookupData = await lookupResponse.json();
        trackingToken = lookupData.token;

        // Navigate to tracking page
        await page.goto(`${baseURL}/track/order/${trackingToken}`);

        // Should show order details
        await expect(page.getByText(/Track Your Order/i)).toBeVisible();
        await expect(page.getByText(orderId)).toBeVisible();
      }
    }
  });

  test('Tracking page shows status timeline', async ({ page }) => {
    if (appointment) {
      await page.goto(`${baseURL}/track/appointment/${appointment.confirmation_code}`);

      // Should show progress timeline
      const timeline = page.locator('.progress-tracker, .status-timeline');
      if (await timeline.count() > 0) {
        await expect(timeline.first()).toBeVisible();
      }

      // Should show status
      await expect(page.getByText(/confirmed|pending|completed/i)).toBeVisible();
    }
  });

  test('Tracking page shows business contact info', async ({ page }) => {
    if (appointment) {
      await page.goto(`${baseURL}/track/appointment/${appointment.confirmation_code}`);

      // Should show business contact section
      const contactSection = page.getByText(/Business Contact|Contact/i);
      if (await contactSection.isVisible()) {
        await expect(contactSection).toBeVisible();
      }
    }
  });

  test('Invalid tracking token shows error', async ({ page }) => {
    await page.goto(`${baseURL}/track/order/invalid-token-12345`);

    // Should show error message
    await expect(page.getByText(/not found|invalid|error/i)).toBeVisible({ timeout: 5000 });
  });

  test('Invalid confirmation code shows error', async ({ page }) => {
    await page.goto(`${baseURL}/track/appointment/INVALID123`);

    // Should show error message
    await expect(page.getByText(/not found|invalid|error/i)).toBeVisible({ timeout: 5000 });
  });
});

