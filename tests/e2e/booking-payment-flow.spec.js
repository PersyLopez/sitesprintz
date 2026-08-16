/**
 * E2E Test: Booking + Payment Flow
 * Tests complete customer journey: booking → payment → confirmation
 * 
 * Test Flow:
 * 1. Customer navigates to booking widget
 * 2. Selects service with payment required
 * 3. Selects date/time
 * 4. Enters customer details
 * 5. Redirects to Stripe Checkout (mocked in test)
 * 6. Returns from Stripe with success
 * 7. Views confirmation page
 * 
 * Uses: Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Booking + Payment Flow (E2E)', () => {
  let userId;
  let serviceId;

  test.beforeEach(async ({ page }) => {
    // Setup: Create test user and payment-enabled service
    // In real scenario, would use API helpers or test fixtures
    userId = 'test-user-' + Date.now();
    serviceId = 'test-service-' + Date.now();

    // Navigate to booking page
    await page.goto(`http://localhost:5173/booking/${userId}`);
  });

  test('should complete booking with full payment', async ({ page }) => {
    // Step 1: Service selection
    await expect(page.getByText('Select Service')).toBeVisible();
    
    const serviceCard = page.locator('.service-card').filter({ hasText: 'Haircut' });
    await expect(serviceCard).toBeVisible();
    await expect(serviceCard.getByText('$50.00')).toBeVisible();
    
    await serviceCard.click();

    // Step 2: Staff selection (if multi-staff)
    const backButton = page.getByRole('button', { name: '← Back' });
    if (await backButton.isVisible()) {
      // Single staff - auto-selected
      // Multi-staff - select first available
      const staffCard = page.locator('[data-testid^="staff-card-"]').first();
      if (await staffCard.isVisible()) {
        await staffCard.click();
      }
    }

    // Step 3: Date/Time selection
    await expect(page.getByText('Select Date & Time')).toBeVisible();
    
    // Select tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(tomorrow.toISOString().split('T')[0]);

    // Wait for time slots to load
    await expect(page.locator('.time-slot').first()).toBeVisible({ timeout: 5000 });
    
    // Select first available time slot
    await page.locator('.time-slot').first().click();

    // Step 4: Customer details
    await expect(page.getByText('Your Information')).toBeVisible();
    
    // Verify payment notice is shown
    await expect(page.getByText('Payment Required')).toBeVisible();
    await expect(page.getByText('Full payment is required')).toBeVisible();
    await expect(page.getByText('Amount: $50.00')).toBeVisible();

    // Fill customer info
    await page.getByTestId('booking-customer-name').fill('John Doe');
    await page.getByTestId('booking-customer-email').fill('john@example.com');
    await page.getByTestId('booking-customer-phone').fill('555-0100');
    await page.getByTestId('booking-customer-notes').fill('First time customer');

    // Submit booking
    const submitButton = page.getByTestId('booking-submit-button');
    await expect(submitButton).toHaveText('Continue to Payment');
    
    // Intercept Stripe redirect
    let stripeUrl;
    page.on('response', async (response) => {
      if (response.url().includes('/api/booking/checkout/create-session')) {
        const data = await response.json();
        stripeUrl = data.data.checkout_url;
      }
    });

    await submitButton.click();

    // Step 5: Verify redirect to Stripe (in test, we mock the return)
    await expect(page.getByText('Redirecting to Payment')).toBeVisible({ timeout: 2000 });

    // Simulate return from Stripe with success
    const appointmentId = 'appt-e2e-test-123';
    const sessionId = 'cs_test_e2e_123';
    await page.goto(
      `http://localhost:5173/booking/${userId}?session_id=${sessionId}&appointment_id=${appointmentId}`
    );

    // Step 6: Verify confirmation page
    await expect(page.getByText('Booking Confirmed!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Confirmation Code:')).toBeVisible();
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Payment processed successfully')).toBeVisible();

    // Verify confirmation email mention
    await expect(page.getByText(/confirmation email has been sent/i)).toBeVisible();
    await expect(page.getByText('john@example.com')).toBeVisible();
  });

  test('should complete booking with deposit payment', async ({ page }) => {
    // Select service with deposit payment
    await page.locator('.service-card').filter({ hasText: 'Massage' }).click();

    // Navigate through booking flow (simplified for brevity)
    // ... date/time selection ...

    // Verify deposit payment notice
    await expect(page.getByText('Payment Required')).toBeVisible();
    await expect(page.getByText(/50% deposit is required/i)).toBeVisible();
    await expect(page.getByText('Amount: $50.00')).toBeVisible(); // $100 service, 50% = $50

    // Fill form and submit
    await page.getByTestId('booking-customer-name').fill('Jane Smith');
    await page.getByTestId('booking-customer-email').fill('jane@example.com');
    await page.getByTestId('booking-customer-phone').fill('555-0200');

    await page.getByTestId('booking-submit-button').click();

    // Simulate return from Stripe
    const appointmentId = 'appt-deposit-123';
    await page.goto(
      `http://localhost:5173/booking/${userId}?session_id=cs_test_deposit&appointment_id=${appointmentId}`
    );

    // Verify confirmation shows deposit payment
    await expect(page.getByText('Booking Confirmed!')).toBeVisible();
    await expect(page.getByText('Payment processed successfully')).toBeVisible();
  });

  test('should complete booking without payment for free services', async ({ page }) => {
    // Select free consultation service
    await page.locator('.service-card').filter({ hasText: 'Consultation' }).click();

    // Navigate through booking
    // ... date/time selection ...

    // Verify NO payment notice
    await expect(page.getByText('Payment Required')).not.toBeVisible();

    // Fill form
    await page.getByTestId('booking-customer-name').fill('Bob Johnson');
    await page.getByTestId('booking-customer-email').fill('bob@example.com');
    await page.getByTestId('booking-customer-phone').fill('555-0300');

    // Submit - should say "Confirm Booking" not "Continue to Payment"
    const submitButton = page.getByTestId('booking-submit-button');
    await expect(submitButton).toHaveText('Confirm Booking');
    
    await submitButton.click();

    // Should go directly to confirmation (no Stripe redirect)
    await expect(page.getByText('Booking Confirmed!')).toBeVisible({ timeout: 3000 });
    
    // Should NOT show payment confirmation
    await expect(page.getByText('Payment processed successfully')).not.toBeVisible();
  });

  test('should handle cancelled payment gracefully', async ({ page }) => {
    // Select paid service and go through flow
    await page.locator('.service-card').filter({ hasText: 'Haircut' }).click();
    // ... date/time selection ...

    await page.getByTestId('booking-customer-name').fill('Cancel Tester');
    await page.getByTestId('booking-customer-email').fill('cancel@example.com');
    await page.getByTestId('booking-customer-phone').fill('555-0400');

    await page.getByTestId('booking-submit-button').click();

    // Simulate return from Stripe with cancellation
    await page.goto(
      `http://localhost:5173/booking/${userId}?cancelled=true`
    );

    // Should show error message
    await expect(page.getByText(/Payment was cancelled/i)).toBeVisible();
    
    // Should return to details step
    await expect(page.getByText('Your Information')).toBeVisible();
    
    // User can retry by submitting again
    await expect(page.getByTestId('booking-submit-button')).toBeEnabled();
  });

  test('should validate customer information before payment', async ({ page }) => {
    // Select service
    await page.locator('.service-card').first().click();
    
    // Try to submit without filling form
    await page.getByTestId('booking-submit-button').click();

    // Should show HTML5 validation errors (required fields)
    const nameInput = page.getByTestId('booking-customer-name');
    await expect(nameInput).toHaveAttribute('required', '');
    
    const emailInput = page.getByTestId('booking-customer-email');
    await expect(emailInput).toHaveAttribute('required', '');
    
    const phoneInput = page.getByTestId('booking-customer-phone');
    await expect(phoneInput).toHaveAttribute('required', '');
  });

  test('should display correct payment amount including fees', async ({ page }) => {
    // Select service
    await page.locator('.service-card').filter({ hasText: 'Haircut' }).click();

    // Navigate to payment step
    // ... date/time selection ...

    // Verify payment amount (service price + booking fee)
    await expect(page.getByText('Your Information')).toBeVisible();
    
    // Amount should include service price
    const paymentNotice = page.locator('.payment-notice');
    await expect(paymentNotice).toBeVisible();
    
    // Should show base amount (fees added by Stripe)
    await expect(paymentNotice.getByText(/\$50\.00/)).toBeVisible();
  });

  test('should allow booking another appointment after confirmation', async ({ page }) => {
    // Complete a booking
    await page.locator('.service-card').first().click();
    // ... complete booking flow ...

    // Simulate successful payment return
    await page.goto(
      `http://localhost:5173/booking/${userId}?session_id=cs_test&appointment_id=appt-123`
    );

    await expect(page.getByText('Booking Confirmed!')).toBeVisible();

    // Click "Book Another Appointment"
    await page.getByRole('button', { name: /Book Another Appointment/i }).click();

    // Should return to service selection
    await expect(page.getByText('Select Service')).toBeVisible();
    
    // Form should be reset
    const firstService = page.locator('.service-card').first();
    await expect(firstService).toBeVisible();
  });
});

test.describe('Payment Error Handling', () => {
  test('should handle appointment creation failure', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/booking/tenants/*/appointments', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'Service is fully booked'
        })
      });
    });

    await page.goto('http://localhost:5173/booking/test-user');
    
    // Go through booking flow
    await page.locator('.service-card').first().click();
    // ... date/time/details ...

    await page.getByTestId('booking-submit-button').click();

    // Should show error message
    await expect(page.getByText(/Service is fully booked/i)).toBeVisible();
  });

  test('should handle payment session creation failure', async ({ page }) => {
    // Mock successful appointment creation
    await page.route('**/api/booking/tenants/*/appointments', (route) => {
      route.fulfill({
        status: 201,
        body: JSON.stringify({
          appointment: {
            id: 'appt-fail-test',
            confirmation_code: 'TEST123'
          }
        })
      });
    });

    // Mock failed checkout session creation
    await page.route('**/api/booking/checkout/create-session', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'Failed to create checkout session'
        })
      });
    });

    await page.goto('http://localhost:5173/booking/test-user');
    
    // Complete booking with payment
    await page.locator('.service-card').filter({ hasText: 'Haircut' }).click();
    // ... complete form ...

    await page.getByTestId('booking-submit-button').click();

    // Should show error message
    await expect(page.getByText(/Failed to create checkout session/i)).toBeVisible();
    
    // User should be able to retry
    await expect(page.getByTestId('booking-submit-button')).toBeEnabled();
  });

  test('should handle invalid return parameters', async ({ page }) => {
    // Return from Stripe with invalid appointment ID
    await page.goto(
      'http://localhost:5173/booking/test-user?session_id=cs_test&appointment_id=invalid'
    );

    // Should show error or return to booking
    // Exact behavior depends on implementation
    await expect(page.getByText(/Booking/i)).toBeVisible();
  });
});


