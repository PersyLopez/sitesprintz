import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-config.js';

test.describe('Site Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for consoles and errors for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (!text.includes('Crisp') && !text.includes('Content Security Policy')) {
        console.log(`BROWSER LOG: ${text}`);
      }
    });
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
    page.on('requestfailed', request => {
      const url = request.url();
      if (!url.includes('crisp.chat')) {
        console.log(`REQUEST FAILED: ${url} - ${request.failure()?.errorText || 'No error text'}`);
      }
    });

    // Mock template data for stability
    await page.route(/\/data\/templates\/index\.json/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          templates: [
            {
              id: 'restaurant-casual',
              templateId: 'restaurant-casual',
              name: 'Casual Dining',
              description: 'Perfect for casual restaurants',
              plan: 'Starter',
              type: 'restaurant'
            },
            {
              id: 'restaurant',
              templateId: 'restaurant',
              name: 'Restaurant Pro',
              description: 'Professional restaurant template',
              plan: 'Pro',
              type: 'restaurant'
            }
          ]
        })
      });
    });

    // Mock specific template details
    await page.route('**/data/templates/restaurant.json', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'restaurant',
          brand: { name: 'Restaurant Pro' },
          hero: { title: 'Welcome', subtitle: 'Best food in town' }
        })
      });
    });

    // Ensure we are on the dashboard and authenticated
    await page.goto('/dashboard.html');
    await page.waitForURL(/\/dashboard\.html/, { timeout: TIMEOUTS.LONG });

    // Set flag to bypass welcome modal if it exists
    await page.evaluate(() => localStorage.setItem('hasVisitedDashboard', 'true'));
    await page.reload();
  });

  test('should display dashboard with create site button', async ({ page }) => {
    await expect(page.locator(SELECTORS.DASHBOARD.CREATE_SITE_BUTTON).first()).toBeVisible();
  });

  test('should show template selection in setup', async ({ page }) => {
    await page.goto('/setup.html');
    await page.waitForLoadState('networkidle');

    // Verify template grid is visible
    await expect(page.locator(SELECTORS.TEMPLATE.GRID).first()).toBeVisible({ timeout: TIMEOUTS.LONG });
    await expect(page.locator(SELECTORS.TEMPLATE.CARD).first()).toBeVisible();
  });

  test('should create a new site flow', async ({ page }) => {
    await page.goto('/setup.html');

    // 1. Select a template
    await expect(page.locator(SELECTORS.TEMPLATE.CARD).first()).toBeVisible({ timeout: TIMEOUTS.LONG });
    const selectBtn = page.locator(SELECTORS.TEMPLATE.SELECT_BUTTON).first();
    await selectBtn.click();

    // 2. Wait for customization panel
    await expect(page.locator(SELECTORS.EDITOR.PANEL)).toBeVisible({ timeout: TIMEOUTS.LONG });

    // 3. Fill basic info
    await page.fill(SELECTORS.EDITOR.BUSINESS_NAME, 'My New Test Site');

    // 4. Click Publish (redirects to quick-publish.html)
    await page.click(SELECTORS.EDITOR.PUBLISH_BUTTON);

    // 5. Verify redirect to quick-publish then auto-publish to success
    await page.waitForURL(/\/publish-success\.html/, { timeout: TIMEOUTS.EXTENDED });

    // Verify success message
    const successHeading = page.locator('h1:has-text("Your Site is Live!")');
    const successText = page.locator('text=/published|success|live/i');
    await expect(successHeading.or(successText).first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  });

  test('should edit existing site flow', async ({ page }) => {
    // Navigate directly to edit mode
    await page.goto('/setup.html?edit=test-restaurant');

    // 1. Wait for customization panel
    await expect(page.locator(SELECTORS.EDITOR.PANEL)).toBeVisible({ timeout: TIMEOUTS.LONG });

    // 2. Update info
    await page.fill(SELECTORS.EDITOR.BUSINESS_NAME, 'Updated Restaurant Name');

    // 3. Click Publish
    await page.click(SELECTORS.EDITOR.PUBLISH_BUTTON);

    // 4. Verify redirect
    await page.waitForURL(/\/quick-publish\.html/, { timeout: TIMEOUTS.LONG });
  });

  test('should complete full publish flow', async ({ page }) => {
    await page.goto('/setup.html?edit=test-restaurant');
    await expect(page.locator(SELECTORS.EDITOR.PANEL)).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Click Publish
    await page.click(SELECTORS.EDITOR.PUBLISH_BUTTON);

    // Wait for redirect to quick-publish
    await page.waitForURL(/\/quick-publish\.html/, { timeout: TIMEOUTS.LONG });

    // Since user is authenticated, it should auto-publish or show the publish button
    const publishBtn = page.locator('button:has-text("Publish My Site")');
    if (await publishBtn.isVisible()) {
      await publishBtn.click();
    }

    // Should eventually redirect to success page
    await page.waitForURL(/\/publish-success\.html/, { timeout: TIMEOUTS.EXTENDED });

    // Verify success message
    const successHeading = page.locator('h1:has-text("Your Site is Live!")');
    const successText = page.locator('text=/published|success|live/i');
    await expect(successHeading.or(successText).first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  });
});
