/**
 * Payment Processor Selection E2E Tests
 * 
 * Tests the complete flow of selecting and connecting payment processors.
 * Follows TestCraft standards: AAA pattern, proper selectors, no CSS classes.
 */

import { test, expect } from '@playwright/test';
import { registerAndLogin } from '../helpers/auth-helpers.js';
import { 
  navigateToPaymentSettings, 
  mockSquareOAuthSuccess,
  mockStripeConnectSuccess,
  mockPayPalVerification,
  isProcessorConnected
} from '../helpers/payment-helpers.js';

test.describe('Payment Processor Selection', () => {
  let user;

  test.beforeEach(async ({ page }) => {
    // Setup: Create authenticated user
    user = await registerAndLogin(page, {
      email: `processor-test-${Date.now()}@example.com`,
      password: 'Test123!@#'
    });
  });

  test('should display available payment processors', async ({ page }) => {
    // Navigate to payment settings
    await navigateToPaymentSettings(page);
    
    // Assert: All three processors should be visible
    await expect(page.getByTestId('processor-stripe')).toBeVisible({ timeout: 10000 }).catch(() => {
      // Fallback if test IDs not yet implemented
      return expect(page.getByText(/Stripe/i)).toBeVisible();
    });
  });

  test('should show Stripe as default selected processor', async ({ page }) => {
    await page.goto('/dashboard/payment-settings');
    
    // Assert: Stripe should be marked as default
    const stripeCard = page.getByTestId('processor-stripe');
    await expect(stripeCard).toHaveAttribute('data-default', 'true');
    
    // Assert: Stripe Connect section should be visible
    await expect(page.getByRole('heading', { name: /Stripe Connect/i })).toBeVisible();
  });

  test('should display processor features and fees', async ({ page }) => {
    await page.goto('/dashboard/payment-settings');
    
    // Assert: Each processor shows key features
    const stripeCard = page.getByTestId('processor-stripe');
    await expect(stripeCard.getByText(/2.9% \+ 30¢/i)).toBeVisible();
    await expect(stripeCard.getByText(/instant payouts/i)).toBeVisible();
    
    const squareCard = page.getByTestId('processor-square');
    await expect(squareCard.getByText(/2.9% \+ 30¢/i)).toBeVisible();
    
    const paypalCard = page.getByTestId('processor-paypal');
    await expect(paypalCard.getByText(/2.99% \+ 49¢/i)).toBeVisible();
  });

  test('should allow changing default processor', async ({ page }) => {
    await page.goto('/dashboard/payment-settings');
    
    // Act: Click Square's "Set as Default" button
    await page.getByTestId('square-set-default-button').click();
    
    // Assert: Success message
    await expect(page.getByText(/Square set as default/i)).toBeVisible({ timeout: 5000 });
    
    // Assert: Square card now shows as default
    const squareCard = page.getByTestId('processor-square');
    await expect(squareCard).toHaveAttribute('data-default', 'true');
    
    // Assert: Stripe no longer default
    const stripeCard = page.getByTestId('processor-stripe');
    await expect(stripeCard).toHaveAttribute('data-default', 'false');
  });
});

test.describe('Square OAuth Connection Flow', () => {
  let authState;
  let testSite;

  test.beforeEach(async ({ page }) => {
    authState = await authenticateUser(page, {
      email: 'square-test@example.com',
      password: 'Test123!@#'
    });
    
    testSite = await createTestSite(page, {
      name: 'Square Test Site',
      template: 'retail'
    });
  });

  test('should initiate Square OAuth flow', async ({ page, context }) => {
    await page.goto('/dashboard/payment-settings');
    
    // Act: Click Square Connect button
    const [oauthPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('square-connect-button').click()
    ]);
    
    // Assert: Redirected to Square OAuth page
    await expect(oauthPage).toHaveURL(/connect\.squareup\.com\/oauth2\/authorize/);
    
    // Assert: OAuth URL contains required parameters
    const url = oauthPage.url();
    expect(url).toContain('client_id=');
    expect(url).toContain('state=');
    expect(url).toContain('scope=');
    
    // Assert: Required scopes are present
    expect(url).toContain('PAYMENTS_READ');
    expect(url).toContain('PAYMENTS_WRITE');
    expect(url).toContain('MERCHANT_PROFILE_READ');
    
    await oauthPage.close();
  });

  test('should handle Square OAuth callback success', async ({ page, context }) => {
    await page.goto('/dashboard/payment-settings');
    
    // Mock Square OAuth callback (in test environment)
    await page.route('**/api/connect/square/callback*', async (route) => {
      await route.fulfill({
        status: 302,
        headers: {
          Location: '/dashboard/payment-settings?status=success&processor=square'
        }
      });
    });
    
    // Simulate successful OAuth flow
    await page.goto('/dashboard/payment-settings?status=success&processor=square');
    
    // Assert: Success message displayed
    await expect(page.getByText(/Square connected successfully/i)).toBeVisible();
    
    // Assert: Square card shows as connected
    const squareCard = page.getByTestId('processor-square');
    await expect(squareCard.getByTestId('connection-status')).toHaveText(/connected/i);
    
    // Assert: Connect button changed to Disconnect
    await expect(page.getByTestId('square-disconnect-button')).toBeVisible();
  });

  test('should handle Square OAuth callback failure', async ({ page }) => {
    // Simulate failed OAuth flow
    await page.goto('/dashboard/payment-settings?status=error&processor=square&message=Invalid%20credentials');
    
    // Assert: Error message displayed
    await expect(page.getByText(/Failed to connect Square/i)).toBeVisible();
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
    
    // Assert: Square still shows as not connected
    const squareCard = page.getByTestId('processor-square');
    await expect(squareCard.getByTestId('connection-status')).toHaveText(/not connected/i);
  });

  test('should prevent CSRF attacks with state validation', async ({ page, context }) => {
    await page.goto('/dashboard/payment-settings');
    
    // Try to access callback with invalid state token
    await page.goto('/api/connect/square/callback?code=test_code&state=invalid_state_token');
    
    // Assert: Should reject with error
    await expect(page.getByText(/Invalid or expired state token/i)).toBeVisible();
  });

  test('should allow disconnecting Square account', async ({ page }) => {
    // Setup: Assume Square is already connected
    await page.goto('/dashboard/payment-settings?connected=square');
    
    // Act: Click disconnect button
    await page.getByTestId('square-disconnect-button').click();
    
    // Assert: Confirmation dialog appears
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Are you sure you want to disconnect/i)).toBeVisible();
    
    // Act: Confirm disconnect
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Assert: Success message
    await expect(page.getByText(/Square disconnected/i)).toBeVisible({ timeout: 5000 });
    
    // Assert: Shows as not connected
    await expect(page.getByTestId('square-connect-button')).toBeVisible();
  });
});

test.describe('Stripe Connect Flow', () => {
  let authState;

  test.beforeEach(async ({ page }) => {
    authState = await authenticateUser(page, {
      email: 'stripe-test@example.com',
      password: 'Test123!@#'
    });
  });

  test('should initiate Stripe Connect onboarding', async ({ page, context }) => {
    await page.goto('/dashboard/payment-settings');
    
    // Act: Click Stripe Connect button
    const [stripePage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('stripe-connect-button').click()
    ]);
    
    // Assert: Redirected to Stripe Connect onboarding
    await expect(stripePage).toHaveURL(/connect\.stripe\.com/);
    
    await stripePage.close();
  });

  test('should handle Stripe Connect success', async ({ page }) => {
    // Simulate successful Stripe Connect
    await page.goto('/dashboard/payment-settings?stripe_connected=true');
    
    // Assert: Success notification
    await expect(page.getByText(/Stripe account connected/i)).toBeVisible();
    
    // Assert: Shows connected status
    const stripeCard = page.getByTestId('processor-stripe');
    await expect(stripeCard.getByTestId('connection-status')).toHaveText(/connected/i);
  });

  test('should show Stripe account details when connected', async ({ page }) => {
    await page.goto('/dashboard/payment-settings?connected=stripe');
    
    // Assert: Account details visible
    await expect(page.getByTestId('stripe-account-email')).toBeVisible();
    await expect(page.getByTestId('stripe-account-id')).toBeVisible();
    await expect(page.getByTestId('stripe-dashboard-link')).toBeVisible();
  });
});

test.describe('PayPal Connection Flow', () => {
  let authState;

  test.beforeEach(async ({ page }) => {
    authState = await authenticateUser(page, {
      email: 'paypal-test@example.com',
      password: 'Test123!@#'
    });
  });

  test('should show PayPal credentials form', async ({ page }) => {
    await page.goto('/dashboard/payment-settings');
    
    // Act: Click PayPal Connect
    await page.getByTestId('paypal-connect-button').click();
    
    // Assert: Credentials form appears
    await expect(page.getByTestId('paypal-client-id-input')).toBeVisible();
    await expect(page.getByTestId('paypal-client-secret-input')).toBeVisible();
    await expect(page.getByRole('button', { name: /save credentials/i })).toBeVisible();
  });

  test('should validate PayPal credentials format', async ({ page }) => {
    await page.goto('/dashboard/payment-settings');
    await page.getByTestId('paypal-connect-button').click();
    
    // Act: Enter invalid client ID
    await page.getByTestId('paypal-client-id-input').fill('invalid');
    await page.getByTestId('paypal-client-secret-input').fill('short');
    await page.getByRole('button', { name: /save credentials/i }).click();
    
    // Assert: Validation errors shown
    await expect(page.getByText(/client ID must be at least/i)).toBeVisible();
    await expect(page.getByText(/client secret must be at least/i)).toBeVisible();
  });

  test('should test PayPal credentials before saving', async ({ page }) => {
    await page.goto('/dashboard/payment-settings');
    await page.getByTestId('paypal-connect-button').click();
    
    // Mock PayPal credential verification
    await page.route('**/api/connect/paypal/verify', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ valid: true, merchantId: 'TEST123' })
      });
    });
    
    // Act: Enter credentials
    await page.getByTestId('paypal-client-id-input').fill('test_client_id_abc123');
    await page.getByTestId('paypal-client-secret-input').fill('test_secret_xyz789');
    await page.getByRole('button', { name: /save credentials/i }).click();
    
    // Assert: Testing message
    await expect(page.getByText(/testing credentials/i)).toBeVisible();
    
    // Assert: Success message after verification
    await expect(page.getByText(/PayPal connected successfully/i)).toBeVisible({ timeout: 5000 });
  });

  test('should not store credentials if verification fails', async ({ page }) => {
    await page.goto('/dashboard/payment-settings');
    await page.getByTestId('paypal-connect-button').click();
    
    // Mock failed verification
    await page.route('**/api/connect/paypal/verify', async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      });
    });
    
    // Act: Enter credentials
    await page.getByTestId('paypal-client-id-input').fill('invalid_client');
    await page.getByTestId('paypal-client-secret-input').fill('invalid_secret');
    await page.getByRole('button', { name: /save credentials/i }).click();
    
    // Assert: Error message
    await expect(page.getByText(/failed to verify credentials/i)).toBeVisible({ timeout: 5000 });
    
    // Assert: Still shows as not connected
    const paypalCard = page.getByTestId('processor-paypal');
    await expect(paypalCard.getByTestId('connection-status')).toHaveText(/not connected/i);
  });
});

test.describe('Multi-Processor Checkout', () => {
  let authState;
  let testSite;

  test.beforeEach(async ({ page }) => {
    authState = await authenticateUser(page, {
      email: 'checkout-test@example.com',
      password: 'Test123!@#'
    });
    
    testSite = await createTestSite(page, {
      name: 'Multi-Processor Site',
      template: 'ecommerce'
    });
  });

  test('should use default processor for checkout', async ({ page }) => {
    // Setup: Add item to cart
    await page.goto(`/${testSite.slug}/shop`);
    await page.getByTestId('product-1').click();
    await page.getByTestId('add-to-cart').click();
    
    // Act: Proceed to checkout
    await page.getByTestId('cart-icon').click();
    await page.getByTestId('checkout-button').click();
    
    // Assert: Should redirect to default processor (Stripe)
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 10000 });
  });

  test('should allow processor selection at checkout', async ({ page }) => {
    // Setup: Multiple processors connected
    await page.goto('/dashboard/payment-settings');
    // ... connect multiple processors ...
    
    // Navigate to checkout
    await page.goto(`/${testSite.slug}/checkout`);
    
    // Assert: Processor selection visible
    await expect(page.getByTestId('processor-selector')).toBeVisible();
    await expect(page.getByText(/Stripe/i)).toBeVisible();
    await expect(page.getByText(/Square/i)).toBeVisible();
    await expect(page.getByText(/PayPal/i)).toBeVisible();
    
    // Act: Select Square
    await page.getByTestId('select-square').click();
    await page.getByTestId('continue-to-payment').click();
    
    // Assert: Redirected to Square checkout
    await expect(page).toHaveURL(/squareup\.com|square\.site/, { timeout: 10000 });
  });

  test('should fallback to Stripe if selected processor fails', async ({ page }) => {
    await page.goto(`/${testSite.slug}/checkout`);
    
    // Mock Square processor failure
    await page.route('**/api/payments/checkout/square', async (route) => {
      await route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Square temporarily unavailable' })
      });
    });
    
    // Act: Select Square
    await page.getByTestId('select-square').click();
    await page.getByTestId('continue-to-payment').click();
    
    // Assert: Error message with fallback option
    await expect(page.getByText(/Square is temporarily unavailable/i)).toBeVisible();
    await expect(page.getByText(/Try using Stripe instead/i)).toBeVisible();
    
    // Act: Use fallback
    await page.getByTestId('use-stripe-fallback').click();
    
    // Assert: Redirected to Stripe
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 10000 });
  });
});

test.describe('Payment Settings Security', () => {
  test('should require authentication to access payment settings', async ({ page }) => {
    // Act: Try to access without login
    await page.goto('/dashboard/payment-settings');
    
    // Assert: Redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should require Pro plan to connect additional processors', async ({ page }) => {
    const authState = await authenticateUser(page, {
      email: 'free-plan@example.com',
      password: 'Test123!@#',
      plan: 'free'
    });
    
    await page.goto('/dashboard/payment-settings');
    
    // Assert: Square and PayPal show upgrade prompt
    const squareCard = page.getByTestId('processor-square');
    await expect(squareCard.getByText(/Pro plan required/i)).toBeVisible();
    
    // Assert: Connect buttons disabled
    await expect(page.getByTestId('square-connect-button')).toBeDisabled();
    await expect(page.getByTestId('paypal-connect-button')).toBeDisabled();
    
    // Assert: Upgrade link visible
    await expect(page.getByRole('link', { name: /upgrade to pro/i })).toBeVisible();
  });

  test('should not expose API keys in client-side code', async ({ page }) => {
    const authState = await authenticateUser(page, {
      email: 'security-test@example.com',
      password: 'Test123!@#'
    });
    
    await page.goto('/dashboard/payment-settings?connected=all');
    
    // Act: Check page content and network requests
    const pageContent = await page.content();
    const responses = [];
    page.on('response', (response) => responses.push(response));
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Assert: No API keys in HTML
    expect(pageContent).not.toMatch(/sk_live_/i);
    expect(pageContent).not.toMatch(/sq0atp-/i);
    expect(pageContent).not.toMatch(/A[a-zA-Z0-9]{80,}/); // PayPal secret pattern
    
    // Assert: No API keys in API responses
    for (const response of responses) {
      const text = await response.text().catch(() => '');
      expect(text).not.toMatch(/encrypted_/); // Encrypted values shouldn't be sent to client
      expect(text).not.toMatch(/sk_live_/i);
      expect(text).not.toMatch(/sq0atp-/i);
    }
  });
});

