/**
 * E2E Test: Refund Flow
 * Tests business owner refund functionality
 * 
 * Test Flow:
 * 1. Login as business owner
 * 2. Navigate to appointments list
 * 3. Find paid appointment
 * 4. Click refund button
 * 5. Select refund reason
 * 6. Confirm refund
 * 7. Verify appointment status updated
 * 8. Verify refund notification sent
 * 
 * Uses: Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Refund Flow (E2E)', () => {
  let userId;
  let paidAppointment;

  test.beforeEach(async ({ page }) => {
    // Setup: Login as business owner
    await page.goto('http://localhost:5173/login');
    
    await page.getByTestId('login-email').fill('business@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // Wait for dashboard
    await expect(page.getByText(/Dashboard/i)).toBeVisible({ timeout: 5000 });

    userId = 'test-user-123';

    // Create a paid appointment for testing
    paidAppointment = {
      id: 'appt-refund-test-' + Date.now(),
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      payment_status: 'paid',
      payment_amount_cents: 5250,
      service_name: 'Haircut'
    };
  });

  test('should successfully process refund with customer request reason', async ({ page }) => {
    // Navigate to appointments
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    // Wait for appointments list to load
    await expect(page.getByTestId('appointment-item')).toBeVisible({ timeout: 5000 });

    // Find paid appointment
    const appointmentRow = page.locator(`[data-testid="appointment-item"]`)
      .filter({ hasText: 'John Doe' })
      .filter({ has: page.locator('.badge-green', { hasText: 'Paid' }) });

    await expect(appointmentRow).toBeVisible();

    // Verify payment status badge
    await expect(appointmentRow.getByText('Paid $52.50')).toBeVisible();

    // Click refund button
    const refundButton = appointmentRow.getByTestId(/refund-btn/);
    await expect(refundButton).toBeVisible();
    await expect(refundButton).toHaveText(/Refund/i);
    
    await refundButton.click();

    // Verify refund modal opens
    await expect(page.getByText('Issue Refund')).toBeVisible();
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('$52.50')).toBeVisible();

    // Select refund reason
    const reasonSelect = page.getByRole('combobox', { name: /Reason/i });
    await expect(reasonSelect).toBeVisible();
    await reasonSelect.selectOption('customer_request');

    // Intercept refund API call
    let refundCalled = false;
    await page.route('**/api/booking/admin/*/appointments/*/refund', (route) => {
      refundCalled = true;
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            success: true,
            appointmentId: paidAppointment.id,
            refundId: 're_test_123',
            amount: 5250,
            status: 'refunded'
          },
          message: 'Refund processed successfully'
        })
      });
    });

    // Mock confirmation dialog
    page.on('dialog', dialog => dialog.accept());

    // Click refund button
    const issueRefundButton = page.getByRole('button', { name: /Issue Refund/i });
    await issueRefundButton.click();

    // Wait for refund to process
    await page.waitForTimeout(1000);

    // Verify modal closes
    await expect(page.getByText('Issue Refund')).not.toBeVisible();

    // Verify success toast/notification
    await expect(page.getByText(/Refund processed successfully/i)).toBeVisible({ timeout: 3000 });

    // Verify appointment status updated in list
    await expect(appointmentRow.getByText('Refunded')).toBeVisible({ timeout: 2000 });
    
    // Refund button should no longer be visible
    await expect(refundButton).not.toBeVisible();

    // Verify API was called
    expect(refundCalled).toBe(true);
  });

  test('should process refund with business cancelled reason', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    // Find paid appointment
    const appointmentRow = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Paid' })
      .first();

    await appointmentRow.getByTestId(/refund-btn/).click();

    // Select business cancelled reason
    await page.getByRole('combobox').selectOption('business_cancelled');

    // Mock API response
    await page.route('**/refund', (route) => {
      const requestBody = route.request().postDataJSON();
      
      expect(requestBody.reason).toBe('business_cancelled');
      
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            success: true,
            status: 'refunded'
          }
        })
      });
    });

    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: /Issue Refund/i }).click();

    // Verify success
    await expect(page.getByText(/Refund processed/i)).toBeVisible();
  });

  test('should show confirmation dialog before processing refund', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    const appointmentRow = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Paid' })
      .first();

    await appointmentRow.getByTestId(/refund-btn/).click();

    // Track dialog
    let dialogShown = false;
    let dialogMessage = '';
    
    page.on('dialog', dialog => {
      dialogShown = true;
      dialogMessage = dialog.message();
      dialog.dismiss(); // Decline refund
    });

    await page.getByRole('button', { name: /Issue Refund/i }).click();

    // Wait for dialog
    await page.waitForTimeout(500);

    // Verify dialog was shown
    expect(dialogShown).toBe(true);
    expect(dialogMessage).toContain('$52.50');

    // Verify refund was NOT processed (user declined)
    await expect(page.getByText(/Refund processed/i)).not.toBeVisible();
    
    // Modal should still be open
    await expect(page.getByText('Issue Refund')).toBeVisible();
  });

  test('should close modal when cancel clicked', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    const appointmentRow = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Paid' })
      .first();

    await appointmentRow.getByTestId(/refund-btn/).click();

    // Verify modal is open
    await expect(page.getByText('Issue Refund')).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Verify modal is closed
    await expect(page.getByText('Issue Refund')).not.toBeVisible();

    // Appointment should still be paid
    await expect(appointmentRow.getByText('Paid')).toBeVisible();
  });

  test('should disable buttons while processing refund', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    const appointmentRow = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Paid' })
      .first();

    await appointmentRow.getByTestId(/refund-btn/).click();

    // Mock slow API response
    await page.route('**/refund', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: { status: 'refunded' } })
      });
    });

    page.on('dialog', dialog => dialog.accept());

    const issueButton = page.getByRole('button', { name: /Issue Refund/i });
    const cancelButton = page.getByRole('button', { name: 'Cancel' });

    await issueButton.click();

    // Buttons should be disabled immediately
    await expect(issueButton).toBeDisabled();
    await expect(cancelButton).toBeDisabled();

    // Button text should change
    await expect(page.getByRole('button', { name: /Processing/i })).toBeVisible();

    // Wait for completion
    await page.waitForTimeout(2500);

    // Modal should close
    await expect(page.getByText('Issue Refund')).not.toBeVisible();
  });

  test('should handle refund API error gracefully', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    const appointmentRow = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Paid' })
      .first();

    await appointmentRow.getByTestId(/refund-btn/).click();

    // Mock API error
    await page.route('**/refund', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'Refund failed: Payment already refunded'
        })
      });
    });

    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: /Issue Refund/i }).click();

    // Wait for error
    await page.waitForTimeout(1000);

    // Should show error message
    await expect(page.getByText(/Refund failed/i)).toBeVisible();

    // Modal should stay open (so user can retry)
    await expect(page.getByText('Issue Refund')).toBeVisible();

    // Buttons should be re-enabled
    await expect(page.getByRole('button', { name: /Issue Refund/i })).toBeEnabled();
  });

  test('should not show refund button for unpaid appointments', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    // Find unpaid appointment
    const unpaidAppointment = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Not Paid' })
      .first();

    if (await unpaidAppointment.isVisible()) {
      // Refund button should not exist
      await expect(unpaidAppointment.getByTestId(/refund-btn/)).not.toBeVisible();
    }
  });

  test('should not show refund button for already refunded appointments', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    // Find refunded appointment
    const refundedAppointment = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Refunded' })
      .first();

    if (await refundedAppointment.isVisible()) {
      // Refund button should not exist
      await expect(refundedAppointment.getByTestId(/refund-btn/)).not.toBeVisible();
    }
  });

  test('should filter appointments to show only paid', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    // Apply filter for paid appointments
    const statusFilter = page.getByRole('combobox', { name: /Status/i });
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('paid');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // All visible appointments should be paid
      const appointmentItems = page.locator('[data-testid="appointment-item"]');
      const count = await appointmentItems.count();

      for (let i = 0; i < count; i++) {
        await expect(appointmentItems.nth(i).getByText('Paid')).toBeVisible();
      }
    }
  });

  test('should show refund reason options', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    const appointmentRow = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Paid' })
      .first();

    await appointmentRow.getByTestId(/refund-btn/).click();

    // Verify all reason options exist
    const reasonSelect = page.getByRole('combobox');
    
    await expect(reasonSelect.locator('option', { hasText: 'Customer Request' })).toBeVisible();
    await expect(reasonSelect.locator('option', { hasText: 'Business Cancelled' })).toBeVisible();
    await expect(reasonSelect.locator('option', { hasText: 'Duplicate Booking' })).toBeVisible();
    await expect(reasonSelect.locator('option', { hasText: 'Other' })).toBeVisible();
  });

  test('should update appointment list after refund without reload', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    // Count paid appointments before refund
    const paidBefore = await page.locator('.badge-green').count();

    const appointmentRow = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: 'Paid' })
      .first();

    const customerName = await appointmentRow.locator('.appointment-customer').textContent();

    await appointmentRow.getByTestId(/refund-btn/).click();

    // Mock successful refund
    await page.route('**/refund', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: { status: 'refunded' }
        })
      });
    });

    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: /Issue Refund/i }).click();

    // Wait for list to update
    await page.waitForTimeout(2000);

    // Find the same appointment
    const sameAppointment = page.locator('[data-testid="appointment-item"]')
      .filter({ hasText: customerName });

    // Should now show refunded status
    await expect(sameAppointment.getByText('Refunded')).toBeVisible();

    // Count paid appointments after refund (should be 1 less)
    const paidAfter = await page.locator('.badge-green').count();
    expect(paidAfter).toBe(paidBefore - 1);
  });
});

test.describe('Refund Authorization', () => {
  test('should only allow business owner to issue refunds', async ({ page }) => {
    // Login as regular user (not owner)
    await page.goto('http://localhost:5173/login');
    await page.getByTestId('login-email').fill('regularuser@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // Try to access appointments for different business
    await page.goto('http://localhost:5173/dashboard/booking/appointments');

    // Should either:
    // 1. Not show any appointments (different business)
    // 2. Show 403 Forbidden
    // 3. Redirect to own dashboard

    // Attempt to directly call refund API
    const response = await page.request.post(
      'http://localhost:3000/api/booking/admin/other-user/appointments/appt-123/refund',
      {
        data: { reason: 'customer_request' }
      }
    );

    // Should be unauthorized
    expect(response.status()).toBe(403);
  });

  test('should require authentication for refund endpoint', async ({ page, request }) => {
    // Make request without auth
    const response = await request.post(
      'http://localhost:3000/api/booking/admin/user-123/appointments/appt-123/refund',
      {
        data: { reason: 'test' }
      }
    );

    // Should be unauthorized
    expect(response.status()).toBe(401);
  });
});


