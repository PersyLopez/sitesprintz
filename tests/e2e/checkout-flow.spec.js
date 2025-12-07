import { test, expect } from '@playwright/test';

test.describe('E-commerce Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console logs
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

    // Intercept checkout API for testing
    // Redirect to a local hash instead of external URL to avoid 403s
    await page.route('**/api/payments/checkout-sessions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'http://localhost:3000/sites/demo-store/#checkout-success-mock' })
      });
    });

    // Navigate to a published site with products
    await page.goto('/sites/demo-store/');
  });

  // Helper to open cart, handling mobile menu if needed
  async function openCart(page) {
    const cartButton = page.locator('.cart-button');
    if (await cartButton.isVisible()) {
      await cartButton.click();
      return;
    }

    // Check for mobile toggle
    const navToggle = page.locator('#nav-toggle');
    if (await navToggle.isVisible()) {
      await navToggle.click();
      // Wait for menu transition/visibility
      await expect(cartButton).toBeVisible();
      await cartButton.click();
    } else {
      // If neither is visible, we have a problem 
      // (Test will fail on next expect)
      await cartButton.click();
    }
  }

  test('should display products', async ({ page }) => {
    const products = page.locator('.product-card, [data-product]');
    // Wait for products to load
    await expect(products.first()).toBeVisible({ timeout: 10000 });
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should view cart', async ({ page }) => {
    // Add product specifically using "Add to Cart" button
    const addToCartBtn = page.locator('.btn-add-to-cart').first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // Open cart
    await openCart(page);

    // Wait for cart modal to open (display: flex)
    const cartModal = page.locator('.cart-modal');
    await expect(cartModal).toBeVisible();
    await expect(cartModal).toHaveCSS('display', 'flex');

    // Should show cart items
    await expect(page.locator('.cart-item')).toBeVisible();
  });

  test('should proceed to checkout', async ({ page }) => {
    // Add product
    const addToCartBtn = page.locator('.btn-add-to-cart').first();
    await addToCartBtn.click();

    // Open cart
    await openCart(page);

    // Wait for modal
    const cartModal = page.locator('.cart-modal');
    await expect(cartModal).toBeVisible();

    // Click checkout
    const checkoutBtn = page.locator('.btn-checkout');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // Verify redirect occurred to our mock URL
    await page.waitForURL(/checkout-success-mock/, { timeout: 10000 });
  });

  test('should update cart quantity', async ({ page }) => {
    // Add product
    const addToCartBtn = page.locator('.btn-add-to-cart').first();
    await addToCartBtn.click();

    // Open cart
    await openCart(page);

    // Increase quantity
    const increaseBtn = page.locator('.btn-quantity[data-action="increase"]').first();
    await increaseBtn.click();

    // Quantity should update
    const quantity = page.locator('.quantity-value').first();
    await expect(quantity).toHaveText('2');
  });

  test('should remove item from cart', async ({ page }) => {
    // Add product
    const addToCartBtn = page.locator('.btn-add-to-cart').first();
    await addToCartBtn.click();

    // Open cart
    await openCart(page);

    // Remove item
    const removeBtn = page.locator('.btn-remove').first();
    await removeBtn.click();

    // Cart should be empty
    await expect(page.locator('.cart-empty')).toBeVisible();
    await expect(page.locator('.cart-empty')).toHaveText(/empty/i);
  });
});

