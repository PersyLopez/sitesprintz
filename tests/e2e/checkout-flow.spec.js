import { test, expect } from '@playwright/test';

test.describe('E-commerce Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a published site with products
    await page.goto('/sites/demo-store/');
  });

  test('should display products', async ({ page }) => {
    const products = page.locator('.product-card, [data-product]');
    await expect(products.first()).toBeVisible({ timeout: 5000 });
  });

  test('should add product to cart', async ({ page }) => {
    // Click first "Add to Cart" button
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    await addToCartBtn.click();
    
    // Cart icon should update
    const cartCount = page.locator('.cart-count, [data-cart-count]');
    await expect(cartCount).toHaveText('1');
  });

  test('should view cart', async ({ page }) => {
    // Add product first
    await page.click('button:has-text("Add to Cart")');
    
    // Open cart
    await page.click('[data-cart-icon], .cart-icon, button:has-text("Cart")');
    
    // Should show cart items
    await expect(page.locator('.cart-item, [data-cart-item]')).toBeVisible();
  });

  test('should proceed to checkout', async ({ page }) => {
    // Add product
    await page.click('button:has-text("Add to Cart")');
    
    // Open cart
    await page.click('[data-cart-icon], button:has-text("Cart")');
    
    // Click checkout
    await page.click('button:has-text("Checkout")');
    
    // Should redirect to Stripe or show checkout form
    await page.waitForURL(/checkout|stripe/, { timeout: 10000 });
  });

  test('should update cart quantity', async ({ page }) => {
    // Add product
    await page.click('button:has-text("Add to Cart")');
    
    // Open cart
    await page.click('button:has-text("Cart")');
    
    // Increase quantity
    const increaseBtn = page.locator('button[aria-label="Increase quantity"], button:has-text("+")').first();
    await increaseBtn.click();
    
    // Quantity should update
    const quantity = page.locator('.cart-item-quantity, [data-quantity]').first();
    await expect(quantity).toHaveText('2');
  });

  test('should remove item from cart', async ({ page }) => {
    // Add product
    await page.click('button:has-text("Add to Cart")');
    
    // Open cart
    await page.click('button:has-text("Cart")');
    
    // Remove item
    await page.click('button:has-text("Remove"), button[aria-label="Remove"]');
    
    // Cart should be empty
    await expect(page.locator('text=/empty|no items/i')).toBeVisible();
  });
});

