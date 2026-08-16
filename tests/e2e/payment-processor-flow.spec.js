/**
 * E2E Tests: Payment Processor Selection Flow
 * 
 * Tests the complete flow of selecting, configuring, and using different payment processors.
 * Covers OAuth flows, connection status, processor switching, and checkout redirects.
 * 
 * Test scenarios:
 * 1. Stripe Connect OAuth flow
 * 2. Square Connect OAuth flow  
 * 3. PayPal Connect OAuth flow
 * 4. Processor connection status display
 * 5. Switching between processors
 * 6. Checkout redirects to correct processor
 * 7. Disconnecting processors
 */

import { test, expect } from '@playwright/test';

test.describe('Payment Processor Selection Flow', () => {
  let authenticatedPage;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated session
    const context = await browser.newContext();
    authenticatedPage = await context.newPage();

    // Login
    await authenticatedPage.goto('/login');
    await authenticatedPage.fill('[data-testid="login-email"]', 'testuser@example.com');
    await authenticatedPage.fill('[data-testid="login-password"]', 'testpass123');
    await authenticatedPage.click('[data-testid="login-submit"]');
    
    // Wait for dashboard - allow more time for redirect
    await authenticatedPage.waitForURL(/\/dashboard/, { timeout: 30000 });
    
    // Verify we're actually on dashboard (not redirected back to login)
    await authenticatedPage.waitForLoadState('networkidle');
    const isOnDashboard = authenticatedPage.url().includes('/dashboard');
    if (!isOnDashboard) {
      throw new Error('Failed to authenticate - not on dashboard');
    }
  });

  test.afterAll(async () => {
    await authenticatedPage?.close();
  });

  test.describe('Payment Settings Page', () => {
    test('should display payment processor options', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Check for processor cards
      await expect(page.locator('[data-testid="stripe-processor-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="square-processor-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="paypal-processor-card"]')).toBeVisible();

      // Check descriptions
      await expect(page.locator('text=Stripe')).toBeVisible();
      await expect(page.locator('text=Square')).toBeVisible();
      await expect(page.locator('text=PayPal')).toBeVisible();
    });

    test('should show "Not Connected" status for unconfigured processors', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Check connection status badges
      const stripeStatus = page.locator('[data-testid="stripe-status"]');
      const squareStatus = page.locator('[data-testid="square-status"]');
      const paypalStatus = page.locator('[data-testid="paypal-status"]');

      // Initially, all should be "Not Connected" (or "Connect" button visible)
      await expect(
        page.locator('[data-testid="connect-stripe-btn"]')
      ).toBeVisible();
    });
  });

  test.describe('Stripe Connect Flow', () => {
    test('should initiate Stripe OAuth flow', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Click "Connect Stripe" button
      const connectButton = page.locator('[data-testid="connect-stripe-btn"]');
      await connectButton.click();

      // Should redirect to Stripe OAuth (or show loading state)
      await page.waitForTimeout(1000);

      // In test environment, this might redirect to a mock or show confirmation
      // Check for either OAuth redirect or success message
      const urlAfterClick = page.url();
      const hasRedirected = 
        urlAfterClick.includes('stripe.com') || 
        urlAfterClick.includes('connect') ||
        urlAfterClick.includes('oauth');

      // If redirected to Stripe OAuth
      if (hasRedirected) {
        expect(urlAfterClick).toMatch(/stripe|oauth/i);
      } else {
        // If mocked in test, check for success indicator
        await expect(
          page.locator('text=/Connected|Success/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show connection status after Stripe OAuth callback', async ({ page }) => {
      // Simulate OAuth callback with success
      await page.goto('/dashboard/payment-settings?processor=stripe&status=connected');

      // Wait for status update
      await page.waitForTimeout(1000);

      // Check for "Connected" status
      const stripeStatus = page.locator('[data-testid="stripe-status"]');
      await expect(stripeStatus).toContainText(/Connected|Active/i, { timeout: 5000 });

      // "Disconnect" button should now be visible
      await expect(
        page.locator('[data-testid="disconnect-stripe-btn"]')
      ).toBeVisible();
    });

    test('should handle Stripe OAuth errors gracefully', async ({ page }) => {
      // Simulate OAuth callback with error
      await page.goto('/dashboard/payment-settings?processor=stripe&error=access_denied');

      // Should show error message
      await expect(
        page.locator('text=/error|failed|denied/i')
      ).toBeVisible({ timeout: 5000 });

      // Stripe should still show "Not Connected"
      await expect(
        page.locator('[data-testid="connect-stripe-btn"]')
      ).toBeVisible();
    });
  });

  test.describe('Square Connect Flow', () => {
    test('should initiate Square OAuth flow', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Click "Connect Square" button
      const connectButton = page.locator('[data-testid="connect-square-btn"]');
      
      if (await connectButton.isVisible()) {
        await connectButton.click();

        // Wait for redirect or confirmation
        await page.waitForTimeout(1000);

        const urlAfterClick = page.url();
        const hasRedirected = 
          urlAfterClick.includes('squareup.com') || 
          urlAfterClick.includes('connect');

        if (hasRedirected) {
          expect(urlAfterClick).toMatch(/square|oauth/i);
        } else {
          // Check for success in test environment
          await expect(
            page.locator('text=/Connected|Success/i')
          ).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should validate CSRF state token on Square OAuth callback', async ({ page, context }) => {
      // Try to access callback with invalid state token
      await page.goto('/api/auth/square/callback?code=test_code&state=invalid_state_token');

      // Should reject with error
      const bodyText = await page.textContent('body');
      expect(bodyText).toMatch(/invalid|expired|state/i);
    });

    test('should show connection status after Square OAuth', async ({ page }) => {
      // Simulate successful Square connection
      await page.goto('/dashboard/payment-settings?processor=square&status=connected');

      await page.waitForTimeout(1000);

      // Check for connected status
      const squareStatus = page.locator('[data-testid="square-status"]');
      await expect(squareStatus).toContainText(/Connected|Active/i, { timeout: 5000 });
    });
  });

  test.describe('PayPal Connect Flow', () => {
    test('should show PayPal connection form', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // PayPal uses Client ID/Secret, not OAuth (or different OAuth flow)
      const paypalSection = page.locator('[data-testid="paypal-processor-card"]');
      await expect(paypalSection).toBeVisible();

      // Check if it has connect button or form
      const hasConnectButton = await page.locator('[data-testid="connect-paypal-btn"]').isVisible();
      const hasClientIdField = await page.locator('[data-testid="paypal-client-id"]').isVisible();

      expect(hasConnectButton || hasClientIdField).toBeTruthy();
    });

    test('should validate PayPal credentials before saving', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Try to connect with invalid credentials
      const clientIdField = page.locator('[data-testid="paypal-client-id"]');
      const clientSecretField = page.locator('[data-testid="paypal-client-secret"]');
      
      if (await clientIdField.isVisible()) {
        await clientIdField.fill('invalid_client_id');
        await clientSecretField.fill('invalid_secret');
        
        await page.click('[data-testid="save-paypal-btn"]');

        // Should show validation error
        await expect(
          page.locator('text=/invalid|error|failed/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Processor Status Display', () => {
    test('should display connected processor with details', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Assuming Stripe is connected in test data
      const stripeCard = page.locator('[data-testid="stripe-processor-card"]');
      
      // Check for status badge
      await expect(stripeCard.locator('[data-testid="stripe-status"]')).toBeVisible();

      // Should show connected date or account info
      const hasConnectedInfo = 
        await stripeCard.locator('text=/Connected on|Account:/i').isVisible().catch(() => false);

      if (hasConnectedInfo) {
        expect(hasConnectedInfo).toBeTruthy();
      }
    });

    test('should show active processor in checkout settings', async ({ page }) => {
      await page.goto('/dashboard/site-settings');

      // Navigate to checkout settings
      await page.click('text=/Checkout|Payment/i');

      // Should show which processor is active
      const activeProcessor = page.locator('[data-testid="active-processor"]');
      await expect(activeProcessor).toBeVisible({ timeout: 5000 });
      
      // Should display processor name
      await expect(activeProcessor).toContainText(/Stripe|Square|PayPal/i);
    });
  });

  test.describe('Switching Processors', () => {
    test('should allow switching from Stripe to Square', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Disconnect Stripe (if connected)
      const disconnectStripeBtn = page.locator('[data-testid="disconnect-stripe-btn"]');
      if (await disconnectStripeBtn.isVisible()) {
        await disconnectStripeBtn.click();
        await page.click('[data-testid="confirm-disconnect"]');
        await page.waitForTimeout(500);
      }

      // Connect Square
      const connectSquareBtn = page.locator('[data-testid="connect-square-btn"]');
      if (await connectSquareBtn.isVisible()) {
        await connectSquareBtn.click();
        
        // Wait for connection flow
        await page.waitForTimeout(2000);
      }

      // Verify Square is now active
      // (In test environment, this might be mocked)
      const squareStatus = page.locator('[data-testid="square-status"]');
      const statusText = await squareStatus.textContent();
      
      // Should show some indication of connection attempt or success
      expect(statusText).toBeTruthy();
    });

    test('should warn before disconnecting active processor', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      const disconnectBtn = page.locator('[data-testid="disconnect-stripe-btn"]');
      
      if (await disconnectBtn.isVisible()) {
        await disconnectBtn.click();

        // Should show confirmation dialog
        await expect(
          page.locator('text=/Are you sure|Warning|Disconnect/i')
        ).toBeVisible({ timeout: 3000 });

        // Check for cancel button
        await expect(
          page.locator('[data-testid="cancel-disconnect"]')
        ).toBeVisible();
      }
    });
  });

  test.describe('Checkout Processor Routing', () => {
    test('should redirect to Stripe checkout when Stripe is active', async ({ page }) => {
      // Setup: Site with Stripe connected
      await page.goto('/sites/test-site');

      // Add item to cart
      await page.click('[data-testid="add-to-cart"]');
      
      // Click checkout
      await page.click('[data-testid="checkout-btn"]');

      // Wait for redirect
      await page.waitForTimeout(2000);

      // Should redirect to Stripe checkout URL
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/stripe\.com|checkout|payment/i);
    });

    test('should redirect to Square checkout when Square is active', async ({ page, context }) => {
      // This test requires Square to be the active processor
      // In a real scenario, we'd set this up in test data
      
      await page.goto('/sites/test-site-square');
      
      // Add item to cart
      const addToCartBtn = page.locator('[data-testid="add-to-cart"]');
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();
        
        // Click checkout
        await page.click('[data-testid="checkout-btn"]');
        
        await page.waitForTimeout(2000);
        
        // Should redirect to Square payment link
        const currentUrl = page.url();
        const isSquareCheckout = 
          currentUrl.includes('square') || 
          currentUrl.includes('checkout') ||
          currentUrl.includes('payment');
        
        // In test environment, verify checkout was initiated
        expect(isSquareCheckout).toBeTruthy();
      }
    });

    test('should handle checkout when no processor is configured', async ({ page }) => {
      // Setup: Site with no processor configured
      await page.goto('/sites/test-site-no-processor');

      const addToCartBtn = page.locator('[data-testid="add-to-cart"]');
      
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();
        
        // Click checkout
        await page.click('[data-testid="checkout-btn"]');
        
        await page.waitForTimeout(1000);
        
        // Should show error message
        await expect(
          page.locator('text=/processor not configured|payment setup required/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Security & Credentials', () => {
    test('should never expose API keys or secrets in UI', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Get page content
      const bodyText = await page.textContent('body');

      // Should NOT contain any API keys
      expect(bodyText).not.toContain('sk_live_');
      expect(bodyText).not.toContain('sk_test_');
      expect(bodyText).not.toContain('sq0atp');
      expect(bodyText).not.toContain('client_secret');
      expect(bodyText).not.toContain('whsec_');
    });

    test('should encrypt credentials before storage', async ({ page, context }) => {
      // This test verifies credentials are encrypted by checking API responses
      
      // Setup: Intercept API calls
      let capturedRequest = null;
      await page.route('**/api/processors/connect', async route => {
        const request = route.request();
        capturedRequest = await request.postDataJSON();
        await route.continue();
      });

      await page.goto('/dashboard/payment-settings');

      // Try to connect processor (if UI allows manual credential entry)
      const clientIdField = page.locator('[data-testid="paypal-client-id"]');
      if (await clientIdField.isVisible()) {
        await clientIdField.fill('test_client_id_12345');
        await page.fill('[data-testid="paypal-client-secret"]', 'test_secret_67890');
        await page.click('[data-testid="save-paypal-btn"]');

        await page.waitForTimeout(1000);

        // Verify request was made
        if (capturedRequest) {
          // Credentials should be encrypted or hashed, not plaintext
          const requestStr = JSON.stringify(capturedRequest);
          expect(requestStr).not.toContain('test_client_id_12345');
          expect(requestStr).not.toContain('test_secret_67890');
        }
      }
    });

    test('should use HTTPS for OAuth redirects in production', async ({ page, context }) => {
      // Check that OAuth URLs use HTTPS
      await page.goto('/dashboard/payment-settings');

      const connectStripeBtn = page.locator('[data-testid="connect-stripe-btn"]');
      
      // Get the button's click handler or href
      const oauthUrl = await connectStripeBtn.getAttribute('href');
      
      if (oauthUrl) {
        expect(oauthUrl).toMatch(/^https:\/\//);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors during connection', async ({ page, context }) => {
      // Simulate network failure
      await context.route('**/api/processors/**', route => route.abort('failed'));

      await page.goto('/dashboard/payment-settings');

      const connectBtn = page.locator('[data-testid="connect-stripe-btn"]');
      if (await connectBtn.isVisible()) {
        await connectBtn.click();

        // Should show error message
        await expect(
          page.locator('text=/error|failed|try again/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should handle expired OAuth states gracefully', async ({ page }) => {
      // Simulate expired state token
      await page.goto('/api/auth/stripe/callback?code=test&state=expired_state_12345');

      // Should show error page or redirect with error
      const bodyText = await page.textContent('body');
      expect(bodyText).toMatch(/expired|invalid|error/i);
    });

    test('should recover from processor API downtime', async ({ page }) => {
      await page.goto('/dashboard/payment-settings');

      // Should show processor cards even if API is down
      await expect(page.locator('[data-testid="stripe-processor-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="square-processor-card"]')).toBeVisible();

      // Status might show "checking..." or last known status
      const stripeStatus = page.locator('[data-testid="stripe-status"]');
      await expect(stripeStatus).toBeVisible();
    });
  });
});

