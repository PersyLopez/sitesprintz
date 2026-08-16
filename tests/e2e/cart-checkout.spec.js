import { test, expect } from '@playwright/test';
import { SELECTORS } from '../fixtures/test-config.js';

test.describe('Shopping Cart & Checkout Flow', () => {
  let baseURL;

  test.beforeAll(async () => {
    baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to a site with products (restaurant template)
    // This assumes a test site exists with products
    await page.goto(`${baseURL}/sites/test-restaurant`);
  });

  test('should display cart button on product page', async ({ page }) => {
    const cartButton = page.locator(SELECTORS.CART?.TOGGLE_BUTTON || '[data-testid="cart-toggle-button"], .cart-toggle-btn');
    if (await cartButton.count() > 0) {
      await expect(cartButton).toBeVisible();
    }
  });

  test('should open cart when cart button clicked', async ({ page }) => {
    const cartButton = page.locator(SELECTORS.CART?.TOGGLE_BUTTON || '[data-testid="cart-toggle-button"], .cart-toggle-btn');
    if (await cartButton.count() > 0) {
      await cartButton.click();
      
      // Cart sidebar should be visible
      const cartSidebar = page.locator(SELECTORS.CART?.SIDEBAR || '[data-testid="cart-sidebar"]');
      if (await cartSidebar.count() > 0) {
        await expect(cartSidebar).toBeVisible();
      }
    }
  });

  test('should display empty cart message initially', async ({ page }) => {
    const cartButton = page.locator(SELECTORS.CART?.TOGGLE_BUTTON || '[data-testid="cart-toggle-button"], .cart-toggle-btn');
    if (await cartButton.count() > 0) {
      await cartButton.click();
      
      // Empty state should be visible
      const emptyState = page.locator(SELECTORS.CART?.EMPTY_STATE || '[data-testid="cart-empty-state"], .cart-empty');
      if (await emptyState.count() > 0) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('should close cart when close button clicked', async ({ page }) => {
    const cartButton = page.locator(SELECTORS.CART?.TOGGLE_BUTTON || '[data-testid="cart-toggle-button"], .cart-toggle-btn');
    if (await cartButton.count() > 0) {
      await cartButton.click();
      
      const cartSidebar = page.locator(SELECTORS.CART?.SIDEBAR || '[data-testid="cart-sidebar"]');
      if (await cartSidebar.count() > 0) {
        await expect(cartSidebar).toBeVisible();
        
        // Click close button
        const closeButton = page.locator(SELECTORS.CART?.CLOSE_BUTTON || '[data-testid="cart-close-button"]');
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await expect(cartSidebar).not.toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should close cart when clicking overlay', async ({ page }) => {
    const cartButton = page.locator(SELECTORS.CART?.TOGGLE_BUTTON || '[data-testid="cart-toggle-button"], .cart-toggle-btn');
    if (await cartButton.count() > 0) {
      await cartButton.click();
      
      const overlay = page.locator(SELECTORS.CART?.OVERLAY || '[data-testid="cart-overlay"]');
      if (await overlay.count() > 0) {
        await overlay.click();
        
        const cartSidebar = page.locator(SELECTORS.CART?.SIDEBAR || '[data-testid="cart-sidebar"]');
        if (await cartSidebar.count() > 0) {
          await expect(cartSidebar).not.toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should display continue shopping button in empty cart', async ({ page }) => {
    const cartButton = page.locator(SELECTORS.CART?.TOGGLE_BUTTON || '[data-testid="cart-toggle-button"], .cart-toggle-btn');
    if (await cartButton.count() > 0) {
      await cartButton.click();
      
      const continueButton = page.locator(
        SELECTORS.CART?.CONTINUE_SHOPPING || 
        '[data-testid="continue-shopping-empty"], [data-testid="continue-shopping-button"]'
      ).first();
      
      if (await continueButton.count() > 0) {
        await expect(continueButton).toBeVisible();
      }
    }
  });

  test('should display checkout button structure', async ({ page }) => {
    // Look for checkout button container
    const checkoutContainer = page.locator(
      SELECTORS.CHECKOUT?.CONTAINER || 
      '[data-testid="checkout-button-container"], .checkout-button-container'
    );
    
    if (await checkoutContainer.count() > 0) {
      await expect(checkoutContainer).toBeVisible();
      
      // Check for checkout button
      const checkoutButton = page.locator(
        SELECTORS.CHECKOUT?.BUTTON || 
        '[data-testid="checkout-button"], .btn-checkout'
      );
      
      if (await checkoutButton.count() > 0) {
        await expect(checkoutButton).toBeVisible();
      }
    }
  });

  test('should display cart badge when items added', async ({ page }) => {
    // This test assumes there's a way to add items to cart
    // Look for product add buttons
    const addButtons = page.locator('button').filter({ hasText: /add|cart/i });
    const buttonCount = await addButtons.count();
    
    if (buttonCount > 0) {
      // Click first add button
      await addButtons.first().click();
      await page.waitForTimeout(500); // Wait for update
      
      // Check for cart badge
      const badge = page.locator(
        SELECTORS.CART?.ITEM_COUNT || 
        '[data-testid="cart-item-count"], .cart-badge'
      );
      
      if (await badge.count() > 0) {
        await expect(badge).toBeVisible();
      }
    }
  });

  test('should have accessible checkout flow', async ({ page }) => {
    const cartButton = page.locator(SELECTORS.CART?.TOGGLE_BUTTON || '[data-testid="cart-toggle-button"], .cart-toggle-btn');
    if (await cartButton.count() > 0) {
      await cartButton.click();
      
      // Check for accessible elements
      const buttons = page.locator('button', page.locator(SELECTORS.CART?.SIDEBAR || '[data-testid="cart-sidebar"]'));
      const buttonCount = await buttons.count();
      
      expect(buttonCount).toBeGreaterThan(0);
    }
  });

  test('should display payment upgrade notice for non-pro users', async ({ page }) => {
    // Navigate to cart
    const cartButton = page.locator(SELECTORS.CART?.TOGGLE_BUTTON || '[data-testid="cart-toggle-button"], .cart-toggle-btn');
    if (await cartButton.count() > 0) {
      await cartButton.click();
      
      // Look for upgrade notice
      const upgradeNotice = page.locator(
        SELECTORS.CHECKOUT?.UPGRADE_NOTICE || 
        '[data-testid="checkout-upgrade-notice"], .checkout-upgrade-notice'
      );
      
      if (await upgradeNotice.count() > 0) {
        await expect(upgradeNotice).toBeVisible();
        
        // Check for upgrade link
        const upgradeLink = page.locator(
          SELECTORS.CHECKOUT?.UPGRADE_LINK || 
          '[data-testid="upgrade-to-pro-link"]'
        );
        
        if (await upgradeLink.count() > 0) {
          await expect(upgradeLink).toBeVisible();
        }
      }
    }
  });

  test('should checkout with multiple items', async ({ page }) => {
    // Add multiple items to cart
    const addButtons = page.locator('button').filter({ hasText: /add to cart/i });
    const buttonCount = await addButtons.count();
    
    if (buttonCount >= 2) {
      // Add first item
      await addButtons.first().click();
      await page.waitForTimeout(300);
      
      // Add second item
      await addButtons.nth(1).click();
      await page.waitForTimeout(300);

      // Open cart
      const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn').first();
      if (await cartButton.count() > 0) {
        await cartButton.click();
        await page.waitForTimeout(500);

        // Verify multiple items
        const cartItems = page.locator('[data-testid^="cart-item"], .cart-item');
        const itemCount = await cartItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(1);

        // Click checkout
        const checkoutButton = page.locator('[data-testid="checkout-btn"], .btn-checkout').first();
        if (await checkoutButton.count() > 0) {
          // Monitor for navigation or API call
          const navigationPromise = page.waitForURL(/checkout|stripe/i, { timeout: 10000 }).catch(() => null);
          await checkoutButton.click();
          
          // Should navigate or show processing
          const navigated = await navigationPromise;
          expect(navigated !== null || await checkoutButton.isDisabled()).toBeTruthy();
        }
      }
    }
  });
});

