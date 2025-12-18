/**
 * E2E Tests: Google OAuth Authentication Flow (Test Mode)
 *
 * In `NODE_ENV=test` we mock Google OAuth in `server.js` when real credentials
 * are not configured. This keeps E2E deterministic and avoids external Google.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
  
test.describe('Google OAuth Authentication Flow (Test Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/login`);
  });

  test('should display Google Sign-In button on login page', async ({ page }) => {
    const googleButton = page
      .locator(
        '.google-oauth-button, button:has-text("Continue with Google"), button:has-text("Google"), a[href*="/auth/google"]'
      )
      .first();

    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('should complete OAuth flow and land in the app (no external Google)', async ({ page }) => {
    const googleButton = page
      .locator(
        '.google-oauth-button, button:has-text("Continue with Google"), button:has-text("Google"), a[href*="/auth/google"]'
      )
      .first();

    await Promise.all([
      page.waitForURL(/\/oauth\/callback\?token=/, { timeout: 15_000 }),
      googleButton.click(),
    ]);

    // OAuthCallback saves token and redirects to /dashboard (or /admin)
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15_000 });

    const tokenInStorage = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(tokenInStorage).toBeTruthy();
  });

  test('should handle OAuth error gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/google/callback?error=access_denied`);
    await expect(page).toHaveURL(/register\.html\?error=access_denied/);
  });
});







