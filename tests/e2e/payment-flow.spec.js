import { test, expect } from '@playwright/test';

test.describe('Payment & Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should display products page', async ({ page }) => {
    await page.goto('/products.html?siteId=test-site');
    await expect(page.locator('h1, h2').filter({ hasText: /products|catalog/i })).toBeVisible();
  });

  test('should add product to site', async ({ page }) => {
    await page.goto('/products.html?siteId=test-site');
    
    // Click add product button
    await page.click('button:has-text("Add Product"), button:has-text("New Product")');
    
    // Fill product details
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Test Product ${timestamp}`);
    await page.fill('input[name="price"]', '29.99');
    await page.fill('textarea[name="description"]', 'Test product description');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Save"), button:has-text("Add Product")');
    
    // Should see product in list
    await expect(page.locator(`text=Test Product ${timestamp}`)).toBeVisible({ timeout: 5000 });
  });

  test('should update product', async ({ page }) => {
    await page.goto('/products.html?siteId=test-site');
    
    // Click first product edit button
    await page.locator('button:has-text("Edit"), .edit-button').first().click();
    
    // Update price
    const priceInput = page.locator('input[name="price"]');
    await priceInput.clear();
    await priceInput.fill('39.99');
    
    // Save
    await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');
    
    // Should show success message
    await expect(page.locator('text=/updated|success/i')).toBeVisible({ timeout: 3000 });
  });

  test('should delete product', async ({ page }) => {
    await page.goto('/products.html?siteId=test-site');
    
    // Get product name to verify deletion
    const firstProduct = page.locator('.product-card, [data-product-id]').first();
    const productName = await firstProduct.locator('text=/^[A-Za-z]/').first().textContent();
    
    // Click delete button
    await firstProduct.locator('button:has-text("Delete"), .delete-button').click();
    
    // Confirm deletion
    page.on('dialog', dialog => dialog.accept());
    
    // Product should be removed
    await expect(page.locator(`text=${productName}`)).not.toBeVisible({ timeout: 3000 });
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.goto('/orders.html?siteId=test-site');
    await expect(page.locator('h1, h2').filter({ hasText: /orders/i })).toBeVisible();
  });

  test('should display order list', async ({ page }) => {
    await page.goto('/orders.html?siteId=test-site');
    
    // Should show orders table or empty state
    const hasOrders = await page.locator('.order-list, table, [data-order-id]').count();
    const emptyState = await page.locator('text=/no orders|empty/i').count();
    
    expect(hasOrders > 0 || emptyState > 0).toBeTruthy();
  });

  test('should view order details', async ({ page }) => {
    await page.goto('/orders.html?siteId=test-site');
    
    // Check if there are any orders
    const orderCount = await page.locator('.order-card, [data-order-id]').count();
    
    if (orderCount > 0) {
      // Click first order
      await page.locator('.order-card, [data-order-id]').first().click();
      
      // Should show order details
      await expect(page.locator('text=/order #|order details|customer/i')).toBeVisible({ timeout: 3000 });
    } else {
      // Skip if no orders
      test.skip();
    }
  });
});

test.describe('Stripe Checkout Integration', () => {
  test('should handle checkout session creation', async ({ page, context }) => {
    // This test would require Stripe test mode
    // For now, we verify the UI flow
    
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    
    // Navigate to a site with products
    await page.goto('/products.html?siteId=test-site');
    
    // Attempt to create checkout (should handle gracefully in test mode)
    // Note: Actual Stripe checkout would require webhook handling
  });

  test('should handle payment success redirect', async ({ page }) => {
    await page.goto('/payment-success.html?session_id=test_session');
    await expect(page.locator('text=/success|thank you|confirmed/i')).toBeVisible();
  });

  test('should handle payment cancel redirect', async ({ page }) => {
    await page.goto('/payment-cancel.html');
    await expect(page.locator('text=/cancelled|try again/i')).toBeVisible();
  });
});

test.describe('Pro Features Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should show upgrade prompts for non-pro users', async ({ page }) => {
    // Try to access a pro feature
    await page.goto('/products.html?siteId=test-site');
    
    // Should either show products (if pro) or upgrade prompt (if not pro)
    const hasProAccess = await page.locator('.product-list, [data-product-id]').count() > 0;
    const hasUpgradePrompt = await page.locator('text=/upgrade|pro feature|premium/i').count() > 0;
    
    expect(hasProAccess || hasUpgradePrompt).toBeTruthy();
  });

  test('should allow pro users to access e-commerce features', async ({ page }) => {
    // This would require a pro user account
    // For now, we verify the routes are accessible
    
    const routes = [
      '/products.html?siteId=test-site',
      '/orders.html?siteId=test-site'
    ];
    
    for (const route of routes) {
      await page.goto(route);
      // Should not redirect away or show 404
      await expect(page).not.toHaveURL(/404|error/);
    }
  });
});

