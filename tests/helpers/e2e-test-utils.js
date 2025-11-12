import { test as base } from '@playwright/test';

/**
 * Extended Playwright test with authentication helpers
 */
export const test = base.extend({
  // Authenticated context
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    await use(page);
  },

  // Admin authenticated context
  adminPage: async ({ page }, use) => {
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/);
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
  await page.click('text=/create.*site|new site/i');
  await page.waitForURL(/setup|template/);
  
  // Select template
  const templateCard = page.locator(`[data-template="${template}"], .template-card`).first();
  await templateCard.click();
  
  // Fill details
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
 */
export async function login(page, email = 'test@example.com', password = 'password123') {
  await page.goto('/login.html');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 5000 });
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
 */
export async function register(page, options = {}) {
  const timestamp = Date.now();
  const {
    email = `test${timestamp}@example.com`,
    password = 'TestPassword123!',
    name = 'Test User'
  } = options;

  await page.goto('/register.html');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  if (await page.locator('input[name="name"]').count() > 0) {
    await page.fill('input[name="name"]', name);
  }
  
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|success/, { timeout: 5000 });
  
  return { email, password, name };
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

