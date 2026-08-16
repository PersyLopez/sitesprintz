import { test as base } from '@playwright/test';
import { TEST_USERS, STRONG_PASSWORD } from '../fixtures/test-credentials.js';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-config.js';

/**
 * Extended Playwright test with authentication helpers
 */
export const test = base.extend({
  // Authenticated context (Pro user)
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill(SELECTORS.AUTH.EMAIL_INPUT, TEST_USERS.PRO_USER.email);
    await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, TEST_USERS.PRO_USER.password);
    await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
    await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.LONG });
    await use(page);
  },

  // Admin authenticated context
  adminPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill(SELECTORS.AUTH.EMAIL_INPUT, TEST_USERS.ADMIN.email);
    await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, TEST_USERS.ADMIN.password);
    await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
    await page.waitForURL(/dashboard|admin/, { timeout: TIMEOUTS.LONG });
    await use(page);
  }
});

export { expect } from '@playwright/test';

/**
 * Helper to create a test site
 */
export async function createTestSite(page, options = {}) {
  const {
    name = `Test Site ${Date.now()}`,
    subdomain = `testsite${Date.now()}`,
    template = 'restaurant-casual'
  } = options;

  await page.goto('/dashboard');

  // Handle welcome modal if it appears
  const welcomeModal = page.locator('.welcome-modal .btn-primary');
  if (await welcomeModal.count() > 0 && await welcomeModal.isVisible()) {
    await welcomeModal.click();
  }

  // Click create site button (use specific class to avoid ambiguity)
  await page.click('.dashboard-header-actions a[href="/setup"]');
  await page.waitForURL(/setup|template/);

  // Select template
  // Wait for templates to load
  await page.waitForSelector('.template-card', { timeout: 10000 });

  // Select template
  const templateCard = page.locator(`[data-template="${template}"]`).first();
  if (await templateCard.count() > 0) {
    // Try clicking select button if available, otherwise card
    const selectBtn = templateCard.locator('.btn-select, button:has-text("Use Template")');
    if (await selectBtn.count() > 0) {
      await selectBtn.click();
    } else {
      await templateCard.click();
    }
  } else {
    console.log(`Template ${template} not found, selecting first available`);
    await page.locator('.template-card').first().click();
  }

  // Fill details
  await page.waitForSelector('input[name="subdomain"]', { state: 'visible', timeout: 10000 });
  await page.fill('input[name="subdomain"]', subdomain);
  if (await page.locator('input[name="name"]').count() > 0) {
    await page.fill('input[name="name"]', name);
  }

  // Continue
  await page.click('button:has-text("Continue"), button:has-text("Next"), button[type="submit"]');

  return { name, subdomain, template };
}

/**
 * Helper to login
 * @param {Page} page - Playwright page
 * @param {string} email - User email (defaults to PRO_USER)
 * @param {string} password - User password (defaults to PRO_USER password)
 */
export async function login(page, email = TEST_USERS.PRO_USER.email, password = TEST_USERS.PRO_USER.password) {
  await page.goto('/login.html');
  await page.fill(SELECTORS.AUTH.EMAIL_INPUT, email);
  await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, password);
  await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
  await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.MEDIUM });

  // Dismiss welcome modal if present
  const welcomeModal = page.locator(SELECTORS.DASHBOARD.WELCOME_MODAL);
  if (await welcomeModal.count() > 0 && await welcomeModal.isVisible()) {
    await welcomeModal.click();
  }
}

/**
 * Helper to logout
 */
export async function logout(page) {
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
  if (await logoutButton.count() > 0) {
    await logoutButton.click();
    await page.waitForURL(/login|\/$/);
  }
}

/**
 * Helper to register a new user
 * @param {Page} page - Playwright page
 * @param {object} options - Registration options
 * @returns {Promise<{email: string, password: string, name: string}>}
 */
export async function register(page, options = {}) {
  // Debug browser logs
  page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

  const timestamp = Date.now();
  const {
    email = `test${timestamp}@example.com`,
    password = STRONG_PASSWORD,
    name = 'Test User'
  } = options;

  await page.goto('/register.html');

  // Wait for fields to be present
  const emailSelector = '#email, input[name="email"], input[type="email"]';
  const passwordSelector = '#password, input[name="password"], input[type="password"]';

  await page.waitForSelector(emailSelector, { state: 'visible', timeout: 10000 });
  await page.fill(emailSelector, email);
  await page.fill(passwordSelector, password);

  // Fill confirm password
  const confirmSelector = '#confirmPassword';
  if (await page.locator(confirmSelector).count() > 0) {
    await page.fill(confirmSelector, password);
  } else {
    // Fallback for types if IDs missing
    const confirmInput = page.locator('input[name="confirmPassword"]');
    if (await confirmInput.count() > 0) {
      await confirmInput.fill(password);
    }
  }

  if (await page.locator('input[name="name"]').count() > 0) {
    await page.fill('input[name="name"]', name);
  }

  // Accept the legal agreements (required clickwrap consent)
  const acceptTerms = page.locator('[data-testid="register-accept-terms"]');
  if (await acceptTerms.count() > 0) {
    await acceptTerms.check();
  }

  await page.click('button[type="submit"]');

  // Wait for the URL to change and the network to settle
  // This helps handle the 800ms delayed redirect in register.html
  await page.waitForURL(/dashboard|success|login/, { timeout: 10000 });
  await page.waitForLoadState('networkidle').catch(() => { });

  return { email, password, name };
}

/**
 * Helper to register a new user via API
 * @param {APIRequestContext} request - Playwright request context
 * @param {object} options - Registration options
 * @returns {Promise<object>} User data with csrfToken
 */
export async function registerUser(request, options = {}) {
  const timestamp = Date.now();
  const {
    email = `test${timestamp}@example.com`,
    password = STRONG_PASSWORD,
    name = 'Test User'
  } = options;

  // 1. Get CSRF token
  const csrfResponse = await request.get('/api/csrf-token');
  if (!csrfResponse.ok()) {
    throw new Error('Failed to fetch CSRF token');
  }
  const { csrfToken } = await csrfResponse.json();

  const response = await request.post('/api/auth/register', {
    headers: {
      'X-CSRF-Token': csrfToken
    },
    data: {
      email,
      password,
      name,
      acceptedTerms: true
    }
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to register user: ${response.status()} ${response.statusText()} - ${text}`);
  }

  const data = await response.json();
  return { ...data.user, accessToken: data.accessToken, password, csrfToken };
}

/**
 * Helper to wait for API response
 */
export async function waitForApiResponse(page, urlPattern, callback) {
  const responsePromise = page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() === 200
  );

  await callback();

  return await responsePromise;
}

/**
 * Helper to check if element exists
 */
export async function elementExists(page, selector) {
  return (await page.locator(selector).count()) > 0;
}

/**
 * Helper to take screenshot on failure
 */
export async function screenshotOnFailure(page, testInfo) {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot();
    await testInfo.attach('failure-screenshot', {
      body: screenshot,
      contentType: 'image/png'
    });
  }
}

/**
 * Helper to mock API responses
 */
export async function mockApiResponse(page, url, response) {
  await page.route(url, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Helper to intercept API calls
 */
export async function interceptApiCall(page, url) {
  const calls = [];

  await page.route(url, route => {
    calls.push({
      method: route.request().method(),
      url: route.request().url(),
      postData: route.request().postData()
    });
    route.continue();
  });

  return calls;
}

/**
 * Helper to fill and submit form
 */
export async function fillAndSubmitForm(page, fields, submitSelector = 'button[type="submit"]') {
  for (const [name, value] of Object.entries(fields)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);

    if (await input.count() > 0) {
      const tagName = await input.evaluate(el => el.tagName.toLowerCase());

      if (tagName === 'select') {
        await input.selectOption(value);
      } else {
        await input.fill(value);
      }
    }
  }

  await page.click(submitSelector);
}

/**
 * Helper to check console errors
 */
export function captureConsoleErrors(page) {
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return errors;
}

/**
 * Helper to wait for navigation
 */
export async function waitForNavigation(page, callback) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    callback()
  ]);
}

/**
 * Helper to create a test site via API (bypassing UI)
 */
export async function createTestSiteViaApi(request, options = {}) {
  const timestamp = Date.now();
  const {
    templateId = 'restaurant', // Use valid template ID (not restaurant-casual)
    email = 'test@example.com',
    businessName = `API Site ${timestamp}`,
    plan = 'starter',
    publish = true
  } = options;

  // 1. Get CSRF token
  const csrfResponse = await request.get('/api/csrf-token');
  if (!csrfResponse.ok()) {
    throw new Error('Failed to fetch CSRF token');
  }
  const { csrfToken } = await csrfResponse.json();
  const headers = { 'X-CSRF-Token': csrfToken };

  // 2. Create Draft
  const draftResponse = await request.post('/api/drafts', {
    headers,
    data: {
      templateId,
      businessData: { businessName }
    }
  });

  if (!draftResponse.ok()) {
    throw new Error(`Failed to create draft: ${await draftResponse.text()}`);
  }

  const draft = await draftResponse.json();
  const draftId = draft.draftId;

  if (!publish) {
    const draftSiteResponse = await request.post('/api/test/create-draft-site', {
      headers,
      data: {
        email,
        businessName,
        templateId
      }
    });

    if (!draftSiteResponse.ok()) {
      throw new Error(`Failed to create draft site via test route: ${await draftSiteResponse.text()}`);
    }

    const { site } = await draftSiteResponse.json();
    return {
      id: site.id,
      draftId: site.id,
      subdomain: site.subdomain,
      name: businessName,
      template: templateId,
      status: 'draft'
    };
  }

  // 3. Publish Draft
  // Note: The request object inherits cookies from the test context's storageState,
  // so cookies (including session tokens) are automatically included
  const publishResponse = await request.post(`/api/drafts/${draftId}/publish`, {
    headers,
    data: {
      email,
      plan
    }
  });

  if (!publishResponse.ok()) {
    const errorText = await publishResponse.text();
    console.error('[TEST] Publish failed:', {
      status: publishResponse.status(),
      statusText: publishResponse.statusText(),
      error: errorText,
      draftId,
      email,
      plan
    });
    throw new Error(`Failed to publish site: ${errorText}`);
  }

  const responseData = await publishResponse.json();
  const site = responseData.site || responseData;
  return {
    ...site,
    id: site.id || site.subdomain,
    subdomain: site.subdomain,
    name: businessName,
    template: templateId,
    status: 'published'
  };
}

