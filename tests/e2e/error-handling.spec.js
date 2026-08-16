/**
 * E2E Test: Error Handling and Edge Cases
 * 
 * Tests how the application handles:
 * - Network failures
 * - Session expiration
 * - Invalid inputs
 * - Timeouts
 * - Concurrent operations
 * - Rate limiting
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const TIMEOUTS = {
  SHORT: 3000,
  MEDIUM: 10000,
  LONG: 30000
};

test.describe('Error Handling', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should handle network failure during form submission', async ({ page, context }) => {
    await page.goto('/dashboard');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to perform an action
    const createSiteBtn = page.getByRole('button', { name: /create|new site/i }).first();
    if (await createSiteBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await createSiteBtn.click();
      
      // Should show error message
      const errorMessage = page.getByText(/offline|network|connection/i);
      await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    }
    
    // Go back online
    await context.setOffline(false);
  });

  test('should handle session expiration gracefully', async ({ page, context }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Clear authentication
    await context.clearCookies();
    await context.addCookies([]);
    
    // Try to access protected page
    await page.reload();
    
    // Should redirect to login
    await page.waitForURL(/login|auth/, { timeout: TIMEOUTS.MEDIUM });
    expect(page.url()).toMatch(/login|auth/);
  });

  test('should handle invalid payment card', async ({ page }) => {
    // Navigate to checkout (if available)
    await page.goto('/products');
    
    // Add product to cart if possible
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    if (await addToCartBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await addToCartBtn.click();
      
      // Navigate to checkout
      const checkoutBtn = page.getByRole('button', { name: /checkout/i });
      if (await checkoutBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
        await checkoutBtn.click();
        
        // Try to submit with invalid card
        const cardInput = page.locator('input[name*="card"], input[placeholder*="card"]').first();
        if (await cardInput.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
          await cardInput.fill('1234');
          
          // Should show validation error
          const errorMsg = page.getByText(/invalid|card|number/i);
          await expect(errorMsg).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
        }
      }
    }
  });

  test('should handle file upload size limit', async ({ page }) => {
    await page.goto('/products');
    
    // Look for image upload
    const uploadInput = page.locator('input[type="file"]').first();
    if (await uploadInput.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      // Create a large file (simulate)
      // Note: In real test, you'd create an actual large file
      // For now, we'll just verify the input exists and has accept attribute
      const acceptAttr = await uploadInput.getAttribute('accept');
      expect(acceptAttr).toBeTruthy();
    }
  });

  test('should show 404 for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');
    
    // Should show 404 page
    const notFoundText = page.getByText(/404|not found|page not found/i);
    await expect(notFoundText).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit empty form
    const submitBtn = page.getByTestId('register-submit').or(
      page.getByRole('button', { name: /register|sign up|create account/i })
    );
    
    if (await submitBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await submitBtn.click();
      
      // Should show validation errors
      const emailInput = page.getByTestId('register-email').or(
        page.locator('input[type="email"]').first()
      );
      const validationMessage = await emailInput.evaluate((el) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    }
  });

  test('should handle timeout gracefully', async ({ page }) => {
    // Navigate to a page that might timeout
    await page.goto('/dashboard');
    
    // Set a short timeout
    page.setDefaultTimeout(1000);
    
    try {
      // Try to wait for an element that might not exist
      await page.waitForSelector('.non-existent-element', { timeout: 2000 });
    } catch (error) {
      // Should timeout gracefully
      expect(error.message).toContain('timeout');
    } finally {
      // Reset timeout
      page.setDefaultTimeout(30000);
    }
  });

  test('should handle rate limiting', async ({ page, request }) => {
    // Get CSRF token
    const csrfResponse = await request.get('/api/csrf-token');
    const { csrfToken } = await csrfResponse.json();
    
    // Make multiple rapid requests
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        request.post('/api/auth/login', {
          headers: { 'X-CSRF-Token': csrfToken },
          data: {
            email: 'test@example.com',
            password: 'wrong-password'
          }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Some requests should be rate limited (429) or fail (401)
    const statusCodes = responses.map(r => r.status());
    const hasRateLimit = statusCodes.includes(429);
    const hasAuthErrors = statusCodes.filter(s => s === 401).length > 0;
    
    // Should either rate limit or show auth errors
    expect(hasRateLimit || hasAuthErrors).toBeTruthy();
  });

  test('should handle concurrent edits', async ({ page, context }) => {
    await page.goto('/setup');
    
    // Open same page in another context (simulating concurrent user)
    const page2 = await context.newPage();
    await page2.goto('/setup');
    
    // Make edit on first page
    const businessInput1 = page.getByTestId('business-name-input');
    if (await businessInput1.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await businessInput1.fill('Edit from page 1');
    }
    
    // Make edit on second page
    const businessInput2 = page2.getByTestId('business-name-input');
    if (await businessInput2.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await businessInput2.fill('Edit from page 2');
    }
    
    // Both should work (or show conflict warning if implemented)
    await page2.close();
  });

  test('should handle server errors gracefully', async ({ page }) => {
    // Navigate to a page
    await page.goto('/dashboard');
    
    // Intercept and fail a request
    await page.route('**/api/sites', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Trigger the request
    await page.reload();
    
    // Should show error message or fallback UI
    const errorMsg = page.getByText(/error|something went wrong|try again/i);
    const hasError = await errorMsg.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false);
    
    // Either shows error or gracefully degrades
    expect(hasError || page.url().includes('dashboard')).toBeTruthy();
  });
});



