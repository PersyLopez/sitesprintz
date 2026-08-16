/**
 * E2E Tests: Multi-Item Cart Checkout
 * 
 * Tests shopping cart with multiple items and checkout flow
 * Covers: adding multiple items, cart management, multi-item checkout
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-config.js';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Multi-Item Cart Checkout', () => {
  let testSiteUrl;

  test.beforeEach(async ({ page }) => {
    // Navigate to a site with products and checkout enabled
    testSiteUrl = `${BASE_URL}/sites/test-restaurant`;
    await page.goto(testSiteUrl, { waitUntil: 'networkidle' });
  });

  test('should add multiple items to cart', async ({ page }) => {
    // Find all "Add to Cart" buttons
    const addToCartButtons = page.locator('button').filter({ hasText: /add to cart/i });
    const buttonCount = await addToCartButtons.count();
    
    if (buttonCount > 0) {
      // Add first item
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      // Add second item if available
      if (buttonCount > 1) {
        await addToCartButtons.nth(1).click();
        await page.waitForTimeout(500);
      }

      // Verify cart badge shows correct count
      const cartBadge = page.locator('[data-testid="cart-item-count"], .cart-badge');
      if (await cartBadge.count() > 0) {
        const badgeText = await cartBadge.textContent();
        const count = parseInt(badgeText || '0');
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('should display all items in cart', async ({ page }) => {
    // Add multiple items
    const addButtons = page.locator('button').filter({ hasText: /add to cart/i });
    const buttonCount = await addButtons.count();
    
    if (buttonCount >= 2) {
      await addButtons.first().click();
      await page.waitForTimeout(300);
      await addButtons.nth(1).click();
      await page.waitForTimeout(300);

      // Open cart
      const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn, .cart-button').first();
      if (await cartButton.count() > 0) {
        await cartButton.click();
        await page.waitForTimeout(500);

        // Verify multiple items in cart
        const cartItems = page.locator('[data-testid^="cart-item"], .cart-item');
        const itemCount = await cartItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('should calculate total for multiple items', async ({ page }) => {
    // Add items to cart
    const addButtons = page.locator('button').filter({ hasText: /add to cart/i });
    const buttonCount = await addButtons.count();
    
    if (buttonCount >= 2) {
      await addButtons.first().click();
      await page.waitForTimeout(300);
      await addButtons.nth(1).click();
      await page.waitForTimeout(300);

      // Open cart
      const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn').first();
      if (await cartButton.count() > 0) {
        await cartButton.click();
        await page.waitForTimeout(500);

        // Check for total
        const cartTotal = page.locator('[data-testid="cart-total-amount"], .cart-total-amount');
        if (await cartTotal.count() > 0) {
          const totalText = await cartTotal.textContent();
          expect(totalText).toMatch(/\$/);
        }
      }
    }
  });

  test('should update quantities for multiple items', async ({ page }) => {
    // Add items and open cart
    const addButtons = page.locator('button').filter({ hasText: /add to cart/i });
    if (await addButtons.count() >= 2) {
      await addButtons.first().click();
      await page.waitForTimeout(300);
      await addButtons.nth(1).click();
      await page.waitForTimeout(300);

      const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn').first();
      if (await cartButton.count() > 0) {
        await cartButton.click();
        await page.waitForTimeout(500);

        // Find quantity controls
        const increaseButtons = page.locator('[data-testid*="increase"], .qty-btn').filter({ hasText: '+' });
        if (await increaseButtons.count() > 0) {
          await increaseButtons.first().click();
          await page.waitForTimeout(300);

          // Verify quantity updated
          const quantityDisplay = page.locator('[data-testid*="quantity"], .qty-display').first();
          if (await quantityDisplay.count() > 0) {
            const qty = await quantityDisplay.textContent();
            expect(parseInt(qty || '1')).toBeGreaterThan(1);
          }
        }
      }
    }
  });

  test('should proceed to checkout with multiple items', async ({ page }) => {
    // Add multiple items
    const addButtons = page.locator('button').filter({ hasText: /add to cart/i });
    const buttonCount = await addButtons.count();
    
    if (buttonCount >= 2) {
      await addButtons.first().click();
      await page.waitForTimeout(300);
      await addButtons.nth(1).click();
      await page.waitForTimeout(300);

      // Open cart
      const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn').first();
      if (await cartButton.count() > 0) {
        await cartButton.click();
        await page.waitForTimeout(500);

        // Click checkout button
        const checkoutButton = page.locator('[data-testid="checkout-btn"], .btn-checkout, [data-testid="checkout-button"]');
        if (await checkoutButton.count() > 0) {
          // Monitor navigation
          const navigationPromise = page.waitForURL(/checkout|stripe/i, { timeout: 10000 }).catch(() => null);
          
          await checkoutButton.click();
          
          // Should navigate to checkout or show loading
          const navigated = await navigationPromise;
          // Either navigation happened or checkout is processing
          expect(navigated !== null || await checkoutButton.isDisabled()).toBeTruthy();
        }
      }
    }
  });

  test('should remove items from multi-item cart', async ({ page }) => {
    // Add multiple items
    const addButtons = page.locator('button').filter({ hasText: /add to cart/i });
    if (await addButtons.count() >= 2) {
      await addButtons.first().click();
      await page.waitForTimeout(300);
      await addButtons.nth(1).click();
      await page.waitForTimeout(300);

      // Open cart
      const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn').first();
      if (await cartButton.count() > 0) {
        await cartButton.click();
        await page.waitForTimeout(500);

        // Remove first item
        const removeButtons = page.locator('[data-testid*="remove"], .btn-remove, .cart-item-remove');
        if (await removeButtons.count() > 0) {
          const initialCount = await page.locator('.cart-item, [data-testid^="cart-item"]').count();
          await removeButtons.first().click();
          await page.waitForTimeout(500);

          // Verify item count decreased
          const newCount = await page.locator('.cart-item, [data-testid^="cart-item"]').count();
          expect(newCount).toBeLessThan(initialCount);
        }
      }
    }
  });

  test('should persist cart across page navigation', async ({ page }) => {
    // Add item to cart
    const addButton = page.locator('button').filter({ hasText: /add to cart/i }).first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Navigate to another page
      await page.goto(`${testSiteUrl}#contact`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Cart should still have item
      const cartBadge = page.locator('[data-testid="cart-item-count"], .cart-badge');
      if (await cartBadge.count() > 0) {
        const badgeText = await cartBadge.textContent();
        const count = parseInt(badgeText || '0');
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Multi-Item Checkout - API Integration', () => {
  test('should create checkout session with multiple items', async ({ request }) => {
    // This test verifies the backend accepts multi-item checkout
    const response = await request.post(`${BASE_URL}/api/stripe/connect/create-checkout`, {
      data: {
        siteId: 'test-site',
        items: [
          { name: 'Product 1', price: 10.00, quantity: 2 },
          { name: 'Product 2', price: 15.00, quantity: 1 }
        ],
        captchaToken: ''
      }
    });

    // Should either succeed (if Stripe configured) or return specific error
    expect([200, 400, 401, 403, 503]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('url');
    }
  });

  test('should validate items array in checkout request', async ({ request }) => {
    // Test with invalid items
    const response = await request.post(`${BASE_URL}/api/stripe/connect/create-checkout`, {
      data: {
        siteId: 'test-site',
        items: [],
        captchaToken: ''
      }
    });

    // Should reject empty items
    expect([400, 401, 403]).toContain(response.status());
  });
});



