import { test, expect } from '@playwright/test';

test.describe('Site Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should display dashboard with create site button', async ({ page }) => {
    await expect(page.locator('text=/create.*site|new site/i')).toBeVisible();
  });

  test('should show template selection', async ({ page }) => {
    await page.click('text=/create.*site|new site/i');
    
    // Should show template grid
    await expect(page.locator('.template-grid, [data-testid="template-grid"]')).toBeVisible({ timeout: 5000 });
  });

  test('should create a new site', async ({ page }) => {
    // Click create site
    await page.click('text=/create.*site|new site/i');
    
    // Wait for template page
    await page.waitForURL(/setup|template/, { timeout: 5000 });
    
    // Select first template
    const firstTemplate = page.locator('.template-card, [data-template]').first();
    await firstTemplate.click();
    
    // Fill in site details
    const timestamp = Date.now();
    await page.fill('input[name="subdomain"]', `testsite${timestamp}`);
    
    // Continue to editor
    await page.click('button:has-text("Continue"), button:has-text("Next")');
    
    // Should reach editor or setup page
    await page.waitForURL(/setup|editor/, { timeout: 10000 });
  });

  test('should customize site in editor', async ({ page }) => {
    // Assuming we're in the editor
    await page.goto('/setup.html?siteId=test-site');
    
    // Should show editor interface
    await expect(page.locator('.editor-panel, [data-testid="editor"]')).toBeVisible({ timeout: 5000 });
  });

  test('should preview site', async ({ page }) => {
    await page.goto('/setup.html?siteId=test-site');
    
    // Click preview button
    await page.click('button:has-text("Preview")');
    
    // Should show preview
    await expect(page.locator('.preview-frame, iframe')).toBeVisible({ timeout: 5000 });
  });

  test('should publish site', async ({ page }) => {
    await page.goto('/setup.html?siteId=test-site');
    
    // Click publish button
    await page.click('button:has-text("Publish")');
    
    // Should show confirmation or success message
    await expect(page.locator('text=/published|success|live/i')).toBeVisible({ timeout: 5000 });
  });
});

