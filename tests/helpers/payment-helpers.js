/**
 * Payment Settings Helper Functions for E2E Tests
 * Provides reusable payment processor setup flows
 */

/**
 * Navigate to payment settings page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export async function navigateToPaymentSettings(page) {
  await page.goto('/dashboard');
  
  // Wait for dashboard to load
  await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 5000 }).catch(() => {});
  
  // Navigate to payment settings (adjust selector based on actual implementation)
  await page.goto('/dashboard/settings/payments');
}

/**
 * Mock successful Square OAuth callback
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @returns {Promise<void>}
 */
export async function mockSquareOAuthSuccess(page, options = {}) {
  await page.route('**/api/connect/square/callback*', async (route) => {
    await route.fulfill({
      status: 302,
      headers: {
        Location: `/dashboard/settings/payments?status=success&processor=square&merchant=${options.merchantId || 'TEST123'}`
      }
    });
  });
}

/**
 * Mock failed Square OAuth callback
 * @param {import('@playwright/test').Page} page
 * @param {string} errorMessage
 * @returns {Promise<void>}
 */
export async function mockSquareOAuthFailure(page, errorMessage = 'Authentication failed') {
  await page.route('**/api/connect/square/callback*', async (route) => {
    await route.fulfill({
      status: 302,
      headers: {
        Location: `/dashboard/settings/payments?status=error&processor=square&message=${encodeURIComponent(errorMessage)}`
      }
    });
  });
}

/**
 * Mock Stripe Connect onboarding success
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @returns {Promise<void>}
 */
export async function mockStripeConnectSuccess(page, options = {}) {
  await page.route('**/api/stripe/connect/onboard', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        accountId: options.accountId || 'acct_test123',
        onboardingUrl: 'https://connect.stripe.com/setup/test'
      })
    });
  });
  
  await page.route('**/api/stripe/connect/status', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        connected: true,
        accountId: options.accountId || 'acct_test123',
        chargesEnabled: true,
        payoutsEnabled: true
      })
    });
  });
}

/**
 * Mock PayPal credential verification
 * @param {import('@playwright/test').Page} page
 * @param {boolean} valid
 * @returns {Promise<void>}
 */
export async function mockPayPalVerification(page, valid = true) {
  await page.route('**/api/connect/paypal/verify', async (route) => {
    if (valid) {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          valid: true,
          merchantId: 'PAYPAL_TEST_MERCHANT'
        })
      });
    } else {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({
          error: 'Invalid credentials',
          valid: false
        })
      });
    }
  });
}

/**
 * Get processor connection status from UI
 * @param {import('@playwright/test').Page} page
 * @param {string} processor - 'stripe', 'square', or 'paypal'
 * @returns {Promise<boolean>}
 */
export async function isProcessorConnected(page, processor) {
  const statusElement = await page.locator(`[data-testid="processor-${processor}"] [data-testid="connection-status"]`).textContent().catch(() => 'not connected');
  return statusElement.toLowerCase().includes('connected');
}

/**
 * Create a test site via API (faster than UI)
 * @param {import('@playwright/test').Page} page
 * @param {Object} siteData
 * @returns {Promise<Object>}
 */
export async function createTestSiteViaAPI(page, siteData = {}) {
  const response = await page.request.post('/api/sites', {
    data: {
      name: siteData.name || 'Test Site',
      template: siteData.template || 'starter',
      businessInfo: siteData.businessInfo || {}
    }
  });
  
  return await response.json();
}


