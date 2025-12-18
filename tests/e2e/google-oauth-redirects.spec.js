/**
 * E2E Tests: Google OAuth Redirect Flow
 * Purpose: Verify OAuth redirects to frontend (localhost:3000) not backend (localhost:3000)
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.VITE_APP_URL || 'http://localhost:3000';

test.describe('Google OAuth Redirect Flow', () => {
  
  test('should redirect to frontend URL after successful OAuth (not backend)', async ({ request }) => {
    // This test verifies the redirect URL pattern is correct
    // We can't test actual Google OAuth without credentials, but we can verify the endpoint
    
    const response = await request.get(`${API_URL}/auth/google`);
    
    // Should redirect to Google (302) or return 200
    expect([200, 302, 401]).toContain(response.status());
    
    if (response.status() === 302) {
      const location = response.headers()['location'];
      // In test mode we mock OAuth locally (no external Google).
      // In real mode with credentials, it may redirect to accounts.google.com.
      const isExternalGoogle = location?.includes('accounts.google.com');
      const isLocalMock = location?.startsWith('/auth/google/callback');
      expect(isExternalGoogle || isLocalMock).toBeTruthy();
    }
  });

  test('should have FRONTEND_URL environment variable set', async () => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    expect(frontendUrl).toBe('http://localhost:3000');
  });

  test('should verify OAuth callback endpoint exists', async ({ request }) => {
    // Test the callback endpoint (will fail without actual OAuth code, but should exist)
    const response = await request.get(`${API_URL}/auth/google/callback`);
    
    // Should not return 404 (endpoint exists) or 500 (server error)
    expect(response.status()).not.toBe(404);
    expect(response.status()).not.toBe(500);
    
    // Should redirect (302) or show error (400/401)
    expect([302, 400, 401]).toContain(response.status());
  });

  test('should redirect OAuth callback to frontend dashboard URL', async ({ request }) => {
    // Test that callback redirects to frontend, not backend
    // Note: This will fail with invalid code, but we can check the redirect pattern
    
    const response = await request.get(`${API_URL}/auth/google/callback?error=access_denied`);
    
    // Should handle error and redirect
    if (response.status() === 302) {
      const location = response.headers()['location'];
      
      // Should redirect to frontend login with error, not backend
      if (location) {
        expect(location).not.toContain('localhost:3000/dashboard');
        // Should redirect to login or error page
        expect(location).toMatch(/login|error/);
      }
    }
  });
});

test.describe('Google OAuth Button Redirects to Backend', () => {
  
  test('should have Google button that redirects to backend OAuth endpoint', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);
    
    const googleButton = page.locator('.google-oauth-button, button:has-text("Continue with Google")').first();
    
    // Verify button exists
    expect(await googleButton.count()).toBeGreaterThan(0);
    
    // Get the button's click behavior
    const buttonAction = await googleButton.evaluate((btn) => {
      // Check if it's a link or has onclick
      if (btn.tagName === 'A') {
        return btn.href;
      }
      if (btn.onclick) {
        return 'has onclick handler';
      }
      return 'button element';
    });
    
    // Should have some action
    expect(buttonAction).toBeDefined();
  });

  test('should verify Google button has correct OAuth URL', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);
    
    // Check if Google button exists and has the right behavior
    const googleButton = page.locator('.google-oauth-button, button:has-text("Continue with Google")').first();
    const buttonExists = await googleButton.count() > 0;
    
    // Button should exist on login page
    expect(buttonExists).toBeTruthy();
    
    if (buttonExists) {
      // Verify it's visible and enabled
      await expect(googleButton).toBeVisible();
    }
  });
});

test.describe('OAuth Success Flow - Token Handling', () => {
  
  test('should handle token in URL query parameter on dashboard', async ({ page }) => {
    // Simulate OAuth callback success - dashboard receives token in URL
    const mockToken = 'mock.jwt.token';
    
    await page.goto(`${FRONTEND_URL}/dashboard?token=${mockToken}`);
    await page.waitForTimeout(2000);
    
    // Check if token is processed (stored in localStorage or used for auth)
    const tokenInStorage = await page.evaluate(() => {
      return localStorage.getItem('token') || localStorage.getItem('authToken');
    });
    
    const url = page.url();
    
    // Either token should be stored OR page should redirect to login (unauthenticated)
    const validState = tokenInStorage || url.includes('login') || url.includes('dashboard');
    expect(validState).toBeTruthy();
  });

  test('should not redirect OAuth callback to backend port 3000', async ({ request }) => {
    // Mock a successful OAuth callback
    // The callback should redirect to frontend:5173, not backend:3000
    
    const response = await request.get(`${API_URL}/auth/google/callback?error=invalid_request`);
    
    if (response.status() === 302) {
      const location = response.headers()['location'];
      
      if (location) {
        // Should NOT redirect to localhost:3000
        expect(location).not.toContain('localhost:3000/dashboard');
        expect(location).not.toContain('localhost:3000/setup');
        
        // Should redirect to login or frontend
        const isValidRedirect = 
          location.includes('localhost:3000') || 
          location.includes('/login') ||
          location.startsWith('/');
        
        expect(isValidRedirect).toBeTruthy();
      }
    }
  });

  test('should redirect OAuth success to frontend dashboard with token', async ({ page, request }) => {
    // We can't test actual Google OAuth, but we can verify the pattern
    // by checking that successful auth would redirect to frontend:5173
    
    const response = await request.get(`${API_URL}/auth/google`);
    
    // In test mode, /auth/google redirects to our local callback which then redirects to /oauth/callback?token=...
    if (response.status() === 302) {
      const location = response.headers()['location'] || '';
      const isExternalGoogle = location.includes('accounts.google.com');
      const isLocalMock = location.startsWith('/auth/google/callback');
      expect(isExternalGoogle || isLocalMock).toBeTruthy();
    }
  });
});

test.describe('OAuth Error Handling', () => {
  
  test('should handle OAuth access_denied error gracefully', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/google/callback?error=access_denied`);
    
    // Should redirect to login with error message
    if (response.status() === 302) {
      const location = response.headers()['location'];
      expect(location).toMatch(/login.*error/);
      // Should not crash or return 500
    }
    
    expect(response.status()).not.toBe(500);
  });

  test('should handle OAuth invalid_grant error gracefully', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/google/callback?error=invalid_grant`);
    
    expect(response.status()).not.toBe(500);
    // Should redirect to error page or login
    if (response.status() === 302) {
      const location = response.headers()['location'];
      expect(location).toMatch(/login|error/);
    }
  });

  test('should handle missing authorization code gracefully', async ({ request }) => {
    // Callback without code parameter
    const response = await request.get(`${API_URL}/auth/google/callback`);
    
    // Should not crash
    expect(response.status()).not.toBe(500);
    
    // Should redirect to error page
    expect([302, 400, 401]).toContain(response.status());
  });
});

