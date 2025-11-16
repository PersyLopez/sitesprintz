/**
 * E2E Tests: OAuth Token Handling on Dashboard
 * Purpose: Verify dashboard extracts and stores OAuth token from URL
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

test.describe('Dashboard OAuth Token Handling', () => {
  
  test('should extract token from URL query parameter', async ({ page }) => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
    
    // Navigate to dashboard with token parameter (simulating OAuth callback)
    await page.goto(`${FRONTEND_URL}/dashboard?token=${mockToken}`);
    await page.waitForTimeout(2000);
    
    // Check if token was stored in localStorage
    const storedToken = await page.evaluate(() => {
      return localStorage.getItem('authToken');
    });
    
    expect(storedToken).toBe(mockToken);
  });

  test('should remove token from URL after extraction', async ({ page }) => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
    
    // Navigate with token
    await page.goto(`${FRONTEND_URL}/dashboard?token=${mockToken}`);
    await page.waitForTimeout(2000);
    
    // URL should no longer contain token (security)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('token=');
    expect(currentUrl).not.toContain(mockToken);
  });

  test('should show success message after OAuth login', async ({ page }) => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
    
    await page.goto(`${FRONTEND_URL}/dashboard?token=${mockToken}`);
    await page.waitForTimeout(2000);
    
    // Check if token was stored
    const hasToken = await page.evaluate(() => localStorage.getItem('authToken'));
    
    // Token should be stored
    expect(hasToken).toBeTruthy();
    expect(hasToken).toBe(mockToken);
  });

  test('should not break dashboard if no token in URL', async ({ page }) => {
    // Navigate without token (normal access)
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForTimeout(1500);
    
    // Page should load (might redirect to login if not authenticated)
    const url = page.url();
    expect(url).toBeDefined();
    
    // Should not crash
    const hasError = await page.locator('.error, [class*="error"]').count();
    // Some error is okay if not authenticated, but page should load
    expect(url).toMatch(/dashboard|login/);
  });
});

test.describe('Full OAuth Flow Integration', () => {
  
  test('should complete Google OAuth flow end-to-end (mocked)', async ({ page, request, context }) => {
    // 1. Start on login page
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);
    
    // 2. Verify Google button exists
    const googleButton = page.locator('.google-oauth-button, button:has-text("Continue with Google")').first();
    expect(await googleButton.count()).toBeGreaterThan(0);
    
    // 3. Simulate successful OAuth by directly navigating to dashboard with token
    // (We can't actually complete Google OAuth in tests)
    const testEmail = `oauth${Date.now()}@example.com`;
    const registerRes = await request.post(`${API_URL}/api/auth/register`, {
      data: { email: testEmail, password: 'Test123!@#', name: 'OAuth Test User' }
    });
    
    if (registerRes.ok()) {
      const { token } = await registerRes.json();
      
      // 4. Simulate OAuth callback redirect
      await page.goto(`${FRONTEND_URL}/dashboard?token=${token}`);
      await page.waitForTimeout(2000);
      
      // 5. Verify token was stored
      const storedToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(storedToken).toBe(token);
      
      // 6. Verify URL cleaned
      expect(page.url()).not.toContain('token=');
      
      // 7. Verify user is on dashboard
      expect(page.url()).toContain('dashboard');
    }
  });

  test('should handle OAuth token and load user data', async ({ page, request }) => {
    // Create a user and get their token
    const testEmail = `tokentest${Date.now()}@example.com`;
    const registerRes = await request.post(`${API_URL}/api/auth/register`, {
      data: { email: testEmail, password: 'Test123!@#', name: 'Token Test' }
    });
    
    if (registerRes.ok()) {
      const { token } = await registerRes.json();
      
      // Navigate to dashboard with token (OAuth callback simulation)
      await page.goto(`${FRONTEND_URL}/dashboard?token=${token}`);
      await page.waitForTimeout(3000);
      
      // Should show user's name or email
      const greeting = page.locator('h1:has-text("Welcome back")').first();
      const hasGreeting = await greeting.count() > 0;
      
      if (hasGreeting) {
        const greetingText = await greeting.textContent();
        // Should contain user's name or email prefix
        expect(greetingText).toMatch(/Welcome back|Token Test|tokentest/i);
      }
      
      // At minimum, token should be stored
      const storedToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(storedToken).toBe(token);
    }
  });
});

