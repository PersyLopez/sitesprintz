import { test, expect } from '@playwright/test';
import { createTestSiteViaApi } from '../helpers/e2e-test-utils.js';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-config.js';

test.describe('Site Management', () => {
  let siteSubdomain;

  // Rule 9: Use global pre-authentication
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page, request }) => {
    const site = await createTestSiteViaApi(request, {
      businessName: `Mgt Test ${Date.now()}`,
      templateId: 'restaurant-casual',
      publish: false // Test React editor flow
    });

    siteSubdomain = site.subdomain;
    console.log(`[Test] Created site subdomain: ${siteSubdomain}`);

    // Navigate to React dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Log all subdomains on page
    const subdomains = await page.locator('[data-testid="site-card"]').evaluateAll(elements => elements.map(el => el.getAttribute('data-subdomain')));
    console.log(`[Test] Subdomains on page: ${subdomains.join(', ')}`);
  });

  test('should edit existing site', async ({ page }) => {
    console.log(`[Test] Targeting site: ${siteSubdomain}`);
    await page.waitForSelector(`[data-subdomain="${siteSubdomain}"]`, { timeout: TIMEOUTS.LONG });
    const siteCard = page.locator(`[data-testid="site-card"][data-subdomain="${siteSubdomain}"]`).first();
    await expect(siteCard).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Click edit button
    await siteCard.locator(SELECTORS.DASHBOARD.EDIT_BUTTON).first().click({ force: true });

    // Should navigate to setup/editor page
    await page.waitForTimeout(1000); // Give it a sec
    await page.waitForURL(/\/setup/, { timeout: TIMEOUTS.EXTENDED });

    // Verify we're in edit mode
    await expect(page.locator(SELECTORS.EDITOR.PANEL)).toBeVisible({ timeout: TIMEOUTS.EXTENDED });

    // Edit business name
    const newName = `Updated Site ${Date.now()}`;
    console.log(`[Test] Filling new name: ${newName}`);
    await page.fill(SELECTORS.EDITOR.BUSINESS_NAME, newName);

    // Click Save Draft
    console.log('[Test] Clicking save draft...');
    await page.click('[data-testid="save-draft-button"]');

    // Wait for success
    await page.waitForTimeout(2000);

    // Navigate back to dashboard to verify
    console.log('[Test] Verifying on dashboard...');
    await page.goto('/dashboard');
    await expect(page.locator(`[data-subdomain="${siteSubdomain}"]`)).toContainText(newName);
    console.log('[Test] Edit verified successfully!');
  });

  test('should delete site with confirmation', async ({ page }) => {
    const siteCard = page.locator(`[data-testid="site-card"][data-subdomain="${siteSubdomain}"]`).first();
    await expect(siteCard).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Find delete button using standard selector
    const deleteButton = siteCard.locator(SELECTORS.DASHBOARD.DELETE_BUTTON).first();

    // Set up dialog handler
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await deleteButton.click();

    // Wait for card to disappear
    await expect(siteCard).not.toBeVisible({ timeout: TIMEOUTS.LONG });
  });

  test('should display site status correctly', async ({ page }) => {
    const siteCard = page.locator(`[data-testid="site-card"][data-subdomain="${siteSubdomain}"]`).first();
    await expect(siteCard).toBeVisible();

    // Check for status indicators
    const statusLabel = siteCard.locator('.site-status');
    await expect(statusLabel).toBeVisible();
    await expect(statusLabel).toContainText(/Published|Draft/i);
  });
});









