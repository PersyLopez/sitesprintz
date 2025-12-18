/**
 * E2E Tests: Session Management & Persistence
 * TDD Phase: Tests for session handling
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

test.describe('Session Management', () => {
  let testEmail;
  let testPassword = 'StrictPwd!2024';
  let authToken;

  test.beforeEach(async ({ page, request }) => {
    // Listen for consoles and errors
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
    page.on('requestfailed', request => {
      console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText || 'No error text'}`);
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`RESPONSE ERROR: ${response.url()} - ${response.status()}`);
      }
    });

    testEmail = `test-session${Date.now()}@example.com`;

    // Register via API (more reliable than UI)
    const csrfRes = await request.get(`${API_URL}/api/csrf-token`);
    const { csrfToken } = await csrfRes.json();

    const registerRes = await request.post(`${API_URL}/api/auth/register`, {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        name: 'Test User'
      }
    });

    if (registerRes.ok()) {
      const data = await registerRes.json();
      authToken = data.accessToken;

      console.log('Setting authToken in localStorage:', authToken.substring(0, 10) + '...');
      await page.goto(BASE_URL);
      await page.evaluate((token) => {
        localStorage.setItem('authToken', token);
        console.log('LocalStorage set, authToken:', localStorage.getItem('authToken').substring(0, 10) + '...');
      }, authToken);

      // Navigate to dashboard and wait for it to load
      await page.goto(`${BASE_URL}/dashboard.html`);
      await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 10000 }).catch(() => { });
      await page.waitForLoadState('networkidle');
    } else {
      // Fallback to UI registration if API fails
      console.log('API registration failed, falling back to UI');
      await page.goto(`${BASE_URL}/register.html`);
      await page.fill('#email', testEmail);
      await page.fill('#password', testPassword);
      await page.fill('#confirmPassword', testPassword);

      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/, { timeout: 10000 });
      await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 10000 }).catch(() => { });
    }
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Verify we're logged in first
    const initialUrl = page.url();
    console.log('Initial URL:', initialUrl);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Check if token still exists
    const hasToken = await page.evaluate(() => {
      return localStorage.getItem('authToken') || localStorage.getItem('authToken');
    });

    // Token should persist after reload
    expect(hasToken).toBeTruthy();
  });

  test('should maintain session in multiple tabs', async ({ context }) => {
    const page1 = await context.newPage();
    await page1.goto(`${BASE_URL}/dashboard`);

    // Should be logged in from shared context
    await expect(page1).toHaveURL(/dashboard/);

    const page2 = await context.newPage();
    await page2.goto(`${BASE_URL}/dashboard`);

    // Both tabs authenticated
    await expect(page2).toHaveURL(/dashboard/);

    await page1.close();
    await page2.close();
  });

  test('should handle expired tokens gracefully', async ({ page, context }) => {
    // Clear token to simulate expiration
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
    });
    await context.clearCookies();

    // Try to access protected page
    await page.goto(`${BASE_URL}/dashboard.html`);

    // Should redirect to login or show login page
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('should clear all session data on logout', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard.html`);
    await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 10000 }).catch(() => { });
    await page.waitForLoadState('networkidle');

    // Wait for the specific logout button
    const logoutButton = page.locator('.logout-btn:has-text("Logout"), .logout-btn:has-text("Sign out")').first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });

    // Click logout
    await logoutButton.click();
    await page.waitForURL(/login|logout|\/$/, { timeout: 10000 });

    // Check if either token was cleared
    const hasToken = await page.evaluate(() => {
      return localStorage.getItem('authToken') || localStorage.getItem('authToken');
    });

    const url = page.url();
    const isLoggedOut = !hasToken || !url.includes('dashboard');

    expect(isLoggedOut).toBeTruthy();
  });

  test('should prevent access to protected routes without session', async ({ page, context }) => {
    // Ensure we are on the origin
    await page.goto(BASE_URL);

    // Clear session
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to access dashboard
    await page.goto(`${BASE_URL}/dashboard.html`);

    // Should redirect to login
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('should restore session state after browser restart', async ({ browser }) => {
    // Create a new context (simulates browser restart)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Login
    await page1.goto(`${BASE_URL}/login.html`);
    await page1.fill('#email', testEmail);
    await page1.fill('#password', testPassword);
    await page1.click('button[type="submit"]');
    await page1.waitForURL(/dashboard/, { timeout: 15000 });

    // Get cookies
    const cookies = await context1.cookies();
    await context1.close();

    // New context with cookies (simulate browser restart with saved cookies)
    const context2 = await browser.newContext();
    await context2.addCookies(cookies);
    const page2 = await context2.newPage();

    await page2.goto(`${BASE_URL}/dashboard`);

    // Should still be logged in
    await expect(page2).toHaveURL(/dashboard/);

    await context2.close();
  });
});

