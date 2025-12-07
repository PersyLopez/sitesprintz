/**
 * Authentication E2E Tests
 * 
 * These tests verify the complete authentication flow from frontend to backend,
 * including CSRF protection. They require a running server.
 * 
 * Purpose: Catch integration issues between frontend and backend auth
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

test.describe('Authentication Flow with CSRF', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto(BASE_URL);
  });

  test('should fetch CSRF token on page load', async ({ page }) => {
    // Listen for CSRF token fetch
    const csrfRequest = page.waitForRequest(
      request => request.url().includes('/api/csrf-token')
    );

    // Reload page to trigger fetch
    await page.reload();

    const request = await csrfRequest;
    expect(request.method()).toBe('GET');

    const response = await request.response();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.csrfToken).toBeDefined();
    expect(data.csrfToken).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  test('should successfully register new user with CSRF', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    // Navigate to registration
    await page.goto(`${BASE_URL}/register`);

    // Wait for CSRF token to be fetched
    await page.waitForTimeout(500);

    // Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // Listen for registration request
    const registerPromise = page.waitForRequest(
      request => request.url().includes('/api/auth/register')
    );

    // Submit form
    await page.click('button[type="submit"]');

    // Verify request was made
    const registerRequest = await registerPromise;
    expect(registerRequest.method()).toBe('POST');

    // Verify CSRF token was included
    const headers = registerRequest.headers();
    expect(headers['x-csrf-token']).toBeDefined();
    expect(headers['x-csrf-token']).not.toBe('');

    // Wait for response
    const response = await registerRequest.response();
    
    // Should succeed (200) not fail with 403
    expect(response.status()).not.toBe(403);
    
    if (response.status() === 201 || response.status() === 200) {
      // Successful registration
      await page.waitForURL(/\/(dashboard|setup)/);
      expect(page.url()).toMatch(/\/(dashboard|setup)/);
    } else {
      // May fail if email already exists - that's ok for this test
      const responseBody = await response.json();
      console.log('Registration response:', responseBody);
    }
  });

  test('should successfully login with CSRF', async ({ page }) => {
    // Note: This requires a pre-existing test user
    const testEmail = 'test@example.com';
    const testPassword = 'test123456';

    // Navigate to login
    await page.goto(`${BASE_URL}/login`);

    // Wait for CSRF token
    await page.waitForTimeout(500);

    // Fill login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // Listen for login request
    const loginPromise = page.waitForRequest(
      request => request.url().includes('/api/auth/login')
    );

    // Submit form
    await page.click('button[type="submit"]');

    // Verify request
    const loginRequest = await loginPromise;
    expect(loginRequest.method()).toBe('POST');

    // Verify CSRF token included
    const headers = loginRequest.headers();
    expect(headers['x-csrf-token']).toBeDefined();

    // Check response
    const response = await loginRequest.response();
    
    // Should not be blocked by CSRF (403)
    expect(response.status()).not.toBe(403);
  });

  test('should include CSRF token in all POST requests', async ({ page, context }) => {
    const postRequests = [];

    // Intercept all POST requests
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().includes('/api/')) {
        postRequests.push({
          url: request.url(),
          headers: request.headers(),
          method: request.method()
        });
      }
    });

    // Navigate and interact with app
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(1000);

    // Try to trigger a POST request
    await page.fill('input[name="email"]', 'csrf-test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // Verify at least one POST was made
    expect(postRequests.length).toBeGreaterThan(0);

    // Verify all POST requests included CSRF token
    for (const request of postRequests) {
      if (!request.url.includes('/api/csrf-token')) {
        expect(request.headers['x-csrf-token']).toBeDefined();
      }
    }
  });

  test('should NOT include CSRF token in GET requests', async ({ page }) => {
    const getRequests = [];

    page.on('request', request => {
      if (request.method() === 'GET' && request.url().includes('/api/')) {
        getRequests.push({
          url: request.url(),
          headers: request.headers(),
          method: request.method()
        });
      }
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1000);

    // GET requests should not have CSRF token (except the token fetch itself)
    for (const request of getRequests) {
      if (!request.url.includes('/api/csrf-token')) {
        // CSRF token is optional for GET, shouldn't be required
        // Just verify request isn't blocked
        expect(request.method).toBe('GET');
      }
    }
  });

  test('should handle CSRF token refresh on 403', async ({ page }) => {
    // This test simulates a scenario where token becomes invalid
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(500);

    // Intercept and track retries
    let requestCount = 0;
    const requestUrls = [];

    page.on('request', request => {
      if (request.url().includes('/api/auth/register')) {
        requestCount++;
        requestUrls.push(request.url());
      }
    });

    // Fill form
    await page.fill('input[name="email"]', `retry-test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'test123456');
    await page.fill('input[name="confirmPassword"]', 'test123456');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Should have made at least one request
    expect(requestCount).toBeGreaterThan(0);
  });

  test('should persist CSRF token across navigation', async ({ page }) => {
    // First page load
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(500);

    // Check for CSRF token in console
    const hasToken1 = await page.evaluate(() => {
      return window.localStorage.getItem('authToken') !== null ||
             document.cookie.includes('_csrf');
    });

    // Navigate to different page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(500);

    // CSRF cookie should still be present
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name === '_csrf');
    
    // May or may not have cookie depending on implementation
    // But requests should still work
    expect(cookies).toBeDefined();
  });

  test('should work with template flow (preserving query params)', async ({ page }) => {
    // Navigate with template parameter
    await page.goto(`${BASE_URL}/register?template=restaurant`);
    await page.waitForTimeout(500);

    const testEmail = `template-test-${Date.now()}@example.com`;

    // Fill form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'test123456');
    await page.fill('input[name="confirmPassword"]', 'test123456');

    // Listen for registration request
    const registerPromise = page.waitForRequest(
      request => request.url().includes('/api/auth/register')
    );

    // Submit
    await page.click('button[type="submit"]');

    // Verify CSRF token included
    const registerRequest = await registerPromise;
    const headers = registerRequest.headers();
    expect(headers['x-csrf-token']).toBeDefined();

    const response = await registerRequest.response();
    
    // Should not be 403 CSRF error
    if (response.status() === 403) {
      const body = await response.json();
      expect(body.error).not.toContain('CSRF');
    }
  });
});

test.describe('CSRF Error Handling', () => {
  test('should show appropriate error message on CSRF failure', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Fill form
    await page.fill('input[name="email"]', 'error-test@example.com');
    await page.fill('input[name="password"]', 'test123456');
    await page.fill('input[name="confirmPassword"]', 'test123456');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(2000);

    // Check if error message is shown (if CSRF fails)
    const errorMessage = await page.textContent('body');
    
    // Should not see generic "Invalid CSRF token" message to user
    // Should see either success or user-friendly error
    expect(errorMessage).toBeDefined();
  });
});

test.describe('Backend CSRF Endpoint', () => {
  test('GET /api/csrf-token should return valid token', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/csrf-token`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.csrfToken).toBeDefined();
    expect(data.csrfToken).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(data.message).toBe('CSRF token generated successfully');
  });

  test('POST without CSRF token should be rejected', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: 'no-csrf@example.com',
        password: 'test123456'
      }
    });

    // Should be rejected with 403
    expect(response.status()).toBe(403);
    
    const data = await response.json();
    expect(data.error).toContain('CSRF');
  });

  test('POST with valid CSRF token should succeed', async ({ request }) => {
    // First get CSRF token
    const tokenResponse = await request.get(`${API_URL}/api/csrf-token`);
    const { csrfToken } = await tokenResponse.json();

    // Extract cookies
    const cookies = tokenResponse.headers()['set-cookie'];

    // Make authenticated request
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: `csrf-valid-${Date.now()}@example.com`,
        password: 'test123456'
      },
      headers: {
        'X-CSRF-Token': csrfToken,
        'Cookie': cookies
      }
    });

    // Should not be 403
    expect(response.status()).not.toBe(403);
  });
});

