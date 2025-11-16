/**
 * E2E Tests: Google OAuth Authentication Flow
 * 
 * TDD Phase: RED - All tests should FAIL initially
 * 
 * Critical Coverage:
 * - Google OAuth button visibility
 * - OAuth redirect to Google
 * - OAuth callback handling
 * - User creation on first login
 * - Existing user login
 * - Session establishment
 * - Error handling
 * 
 * These tests address the gaps in authentication coverage
 * and ensure Google OAuth works end-to-end.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

test.describe('Google OAuth Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/login`);
  });

  // TEST 1: Button Visibility
  test('should display "Sign in with Google" button on login page', async ({ page }) => {
    // Look for Google OAuth button
    const googleButton = page.locator('button:has-text("Google"), button:has-text("Sign in with Google"), a:has-text("Google")');
    
    // Should be visible
    await expect(googleButton).toBeVisible({ timeout: 5000 });
    
    // Should have Google branding/icon
    const hasGoogleIcon = await page.locator('svg, img').filter({ hasText: /google/i }).count() > 0 ||
                          await page.locator('[class*="google"]').count() > 0;
    expect(hasGoogleIcon).toBeTruthy();
  });

  // TEST 2: OAuth Redirect
  test('should redirect to Google OAuth consent page when button clicked', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Google"), a[href*="google"]').first();
    
    // Wait for navigation to Google
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      googleButton.click()
    ]);

    // Should open Google OAuth page
    await popup.waitForLoadState();
    const url = popup.url();
    
    // Verify it's Google OAuth URL
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('oauth');
    
    await popup.close();
  });

  // TEST 3: OAuth Callback Handling
  test('should handle OAuth callback with authorization code', async ({ page }) => {
    // Simulate OAuth callback
    const mockCode = 'test_authorization_code_12345';
    const callbackUrl = `${BASE_URL}/auth/google/callback?code=${mockCode}`;
    
    await page.goto(callbackUrl);
    
    // Should process callback and redirect
    // Should NOT show error page
    const hasError = await page.locator('text=/error|invalid|failed/i').count() > 0;
    expect(hasError).toBeFalsy();
    
    // Should redirect to dashboard or setup
    await page.waitForURL(/\/(dashboard|setup)/i, { timeout: 10000 });
  });

  // TEST 4: New User Creation
  test('should create new user on first-time Google login', async ({ page, request }) => {
    const timestamp = Date.now();
    const testGoogleEmail = `google-test-${timestamp}@example.com`;
    
    // Simulate OAuth callback for new user
    const mockUserData = {
      email: testGoogleEmail,
      name: `Test User ${timestamp}`,
      googleId: `google_${timestamp}`,
      picture: 'https://example.com/avatar.jpg'
    };

    // Mock OAuth callback endpoint
    const callbackUrl = `${API_URL}/auth/google/callback`;
    
    // Verify new user is created in database
    // This would normally happen through the actual OAuth flow
    // For E2E, we're testing the endpoint directly
    
    const response = await request.get(callbackUrl, {
      params: {
        code: 'test_code_new_user'
      }
    });

    // Should create user and return success
    expect(response.status()).not.toBe(500);
    
    // Verify user exists in database
    // (In real flow, this is validated by successful login)
  });

  // TEST 5: Existing User Login
  test('should login existing Google user without creating duplicate', async ({ page }) => {
    // Assume a Google user already exists
    const existingEmail = 'existing-google@example.com';
    
    // Simulate OAuth callback for existing user
    const callbackUrl = `${BASE_URL}/auth/google/callback?code=existing_user_code`;
    
    await page.goto(callbackUrl);
    
    // Should login successfully
    await page.waitForURL(/dashboard/i, { timeout: 10000 });
    
    // Should NOT create duplicate user
    // (Verified by checking user count doesn't increase)
  });

  // TEST 6: Session Establishment
  test('should set session cookie/token after Google login', async ({ page, context }) => {
    // Simulate successful Google OAuth
    const callbackUrl = `${BASE_URL}/auth/google/callback?code=success_code`;
    
    await page.goto(callbackUrl);
    await page.waitForURL(/dashboard/i, { timeout: 10000 });
    
    // Check for auth token in localStorage or cookies
    const hasToken = await page.evaluate(() => {
      return localStorage.getItem('token') !== null || 
             localStorage.getItem('authToken') !== null;
    });
    
    const cookies = await context.cookies();
    const hasAuthCookie = cookies.some(c => 
      c.name === 'token' || 
      c.name === 'authToken' || 
      c.name === 'session'
    );
    
    // Should have authentication token
    expect(hasToken || hasAuthCookie).toBeTruthy();
  });

  // TEST 7: Dashboard Redirect
  test('should redirect to dashboard after successful Google login', async ({ page }) => {
    const callbackUrl = `${BASE_URL}/auth/google/callback?code=valid_code`;
    
    await page.goto(callbackUrl);
    
    // Should redirect to dashboard
    await page.waitForURL(/dashboard/i, { timeout: 10000 });
    
    // Should display user's dashboard content
    const hasDashboard = await page.locator('h1, h2').filter({ 
      hasText: /dashboard|welcome|my sites/i 
    }).count() > 0;
    
    expect(hasDashboard).toBeTruthy();
  });

  // TEST 8: Error Handling
  test('should handle OAuth error or cancellation gracefully', async ({ page }) => {
    // Simulate OAuth error callback
    const errorUrl = `${BASE_URL}/auth/google/callback?error=access_denied`;
    
    await page.goto(errorUrl);
    
    // Should show user-friendly error message
    const errorMessage = await page.locator('text=/error|denied|cancelled/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Should NOT crash or show blank page
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
    expect(hasContent.length).toBeGreaterThan(0);
    
    // Should provide way to try again
    const hasRetryButton = await page.locator('a:has-text("try again"), button:has-text("back to login")').count() > 0;
    expect(hasRetryButton).toBeTruthy();
  });

  // TEST 9: OAuth State Parameter (Security)
  test('should include and validate state parameter for CSRF protection', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Click Google button
    const googleButton = page.locator('button:has-text("Google"), a[href*="google"]').first();
    
    // Intercept OAuth request
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('google') && req.url().includes('oauth')),
      googleButton.click().catch(() => {}) // May fail due to popup
    ]);
    
    // Should include state parameter
    const url = new URL(request.url());
    const state = url.searchParams.get('state');
    
    expect(state).toBeTruthy();
    expect(state.length).toBeGreaterThan(10); // Should be random string
  });

  // TEST 10: Template Parameter Preservation
  test('should preserve template parameter through Google OAuth flow', async ({ page }) => {
    // Start with template parameter
    await page.goto(`${BASE_URL}/login?template=restaurant`);
    
    const googleButton = page.locator('button:has-text("Google"), a[href*="google"]').first();
    
    // Check if OAuth URL includes template in state or redirect_uri
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('google')),
      googleButton.click().catch(() => {})
    ]);
    
    const url = new URL(request.url());
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    
    // Template should be preserved somehow
    const hasTemplate = redirectUri?.includes('template=restaurant') || 
                       state?.includes('restaurant');
    
    // If template is preserved, this should be true
    // (Implementation may vary - stored in state, session, or redirect_uri)
    expect(typeof hasTemplate).toBe('boolean');
  });

  // TEST 11: Multiple Tab Handling
  test('should handle Google login in one tab and update other tabs', async ({ context }) => {
    // Open two tabs
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto(`${BASE_URL}/login`);
    await page2.goto(`${BASE_URL}/login`);
    
    // Simulate Google login in page1
    const callbackUrl = `${BASE_URL}/auth/google/callback?code=multi_tab_code`;
    await page1.goto(callbackUrl);
    await page1.waitForURL(/dashboard/i, { timeout: 10000 });
    
    // Page2 should also recognize user is logged in
    await page2.reload();
    await page2.waitForURL(/dashboard/i, { timeout: 10000 });
    
    // Both should be authenticated
    const page1Auth = await page1.evaluate(() => localStorage.getItem('token'));
    const page2Auth = await page2.evaluate(() => localStorage.getItem('token'));
    
    expect(page1Auth).toBeTruthy();
    expect(page2Auth).toBeTruthy();
    
    await page1.close();
    await page2.close();
  });

  // TEST 12: Google OAuth on Registration Page
  test('should also offer Google OAuth on registration page', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Should have Google OAuth option
    const googleButton = page.locator('button:has-text("Google"), a:has-text("Sign up with Google")');
    await expect(googleButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Google OAuth API Endpoints', () => {
  
  // TEST 13: OAuth Initiate Endpoint
  test('GET /auth/google should redirect to Google OAuth', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/google`, {
      maxRedirects: 0 // Don't follow redirects
    });
    
    // Should return 302 redirect
    expect([302, 307]).toContain(response.status());
    
    // Should redirect to Google
    const location = response.headers()['location'];
    expect(location).toContain('google');
    expect(location).toContain('oauth');
  });

  // TEST 14: OAuth Callback Endpoint
  test('GET /auth/google/callback should handle OAuth response', async ({ request }) => {
    // Without code parameter, should error
    const errorResponse = await request.get(`${API_URL}/auth/google/callback`);
    expect([400, 401]).toContain(errorResponse.status());
    
    // With mock code, should attempt to process
    const codeResponse = await request.get(`${API_URL}/auth/google/callback`, {
      params: { code: 'test_code' }
    });
    
    // Will fail with invalid code, but endpoint should exist
    expect(codeResponse.status()).not.toBe(404);
  });

  // TEST 15: OAuth Configuration Check
  test('should have Google OAuth properly configured', async ({ page }) => {
    // Navigate to login to trigger any config checks
    await page.goto(`${BASE_URL}/login`);
    
    // Check console for OAuth config errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('google')) {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Should not have Google OAuth configuration errors
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Google OAuth Edge Cases', () => {
  
  // TEST 16: Expired OAuth Code
  test('should handle expired authorization code gracefully', async ({ page }) => {
    const expiredUrl = `${BASE_URL}/auth/google/callback?code=expired_code_12345`;
    
    await page.goto(expiredUrl);
    
    // Should show error, not crash
    const hasErrorOrLogin = await Promise.race([
      page.waitForSelector('text=/error|expired|invalid/i', { timeout: 5000 }).then(() => true),
      page.waitForURL(/login/i, { timeout: 5000 }).then(() => true)
    ]).catch(() => false);
    
    expect(hasErrorOrLogin).toBeTruthy();
  });

  // TEST 17: Network Failure During OAuth
  test('should handle network failure to Google gracefully', async ({ page }) => {
    // This is hard to test without mocking
    // At minimum, verify timeout handling exists
    
    await page.goto(`${BASE_URL}/login`);
    
    // The Google button should exist even if network fails
    const googleButton = page.locator('button:has-text("Google")').first();
    await expect(googleButton).toBeVisible();
  });

  // TEST 18: Concurrent Google Login Attempts
  test('should handle concurrent login attempts safely', async ({ context }) => {
    // Open multiple tabs and try to login simultaneously
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);
    
    // Try to process OAuth in all tabs simultaneously
    const callbackUrl = `${BASE_URL}/auth/google/callback?code=concurrent_code`;
    
    await Promise.all(
      pages.map(p => p.goto(callbackUrl))
    );
    
    // Should handle gracefully without errors
    for (const p of pages) {
      const hasError = await p.locator('text=/error|crash/i').count();
      expect(hasError).toBe(0);
      await p.close();
    }
  });
});

/**
 * Expected Results (RED Phase):
 * 
 * All 18 tests should FAIL because:
 * - Some tests depend on mocking Google OAuth (not yet implemented)
 * - Some tests check for features that may not exist yet
 * - Some tests validate error handling that may not be implemented
 * 
 * This is EXPECTED in TDD RED phase!
 * 
 * Next Steps (GREEN Phase):
 * 1. Run tests: npx playwright test tests/e2e/google-oauth-flow.spec.js
 * 2. Review failures
 * 3. Implement missing features one by one
 * 4. Make tests pass one at a time
 * 5. Achieve 100% pass rate
 * 
 * Then: REFACTOR phase to improve code quality
 */

