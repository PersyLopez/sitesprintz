import { test, expect } from '@playwright/test';
import { login, createTestSite } from '../helpers/e2e-test-utils.js';

test.describe('Site Products Management', () => {
    let siteId;

    test.beforeEach(async ({ page }) => {
        await login(page);
        const site = await createTestSite(page);

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        const siteCard = page.locator(`[data-subdomain="${site.subdomain}"], .site-card`).first();
        siteId = await siteCard.getAttribute('data-site-id');

        await page.goto(`/products?siteId=${siteId}`);
    });

    test('should display products page', async ({ page }) => {
        await expect(page.locator('h1').filter({ hasText: /products/i })).toBeVisible();
        await expect(page.locator('.products-container')).toBeVisible();
    });

    test('should add a new product', async ({ page }) => {
        await page.click('button:has-text("Add Product")');

        // Modal should appear
        await expect(page.locator('.modal-content')).toBeVisible();

        // Fill form
        await page.fill('input[name="name"]', 'Test Product');
        await page.fill('textarea[name="description"]', 'This is a test product');
        await page.fill('input[name="price"]', '19.99');

        // Save
        await page.click('button:has-text("Save")');

        // Verify product appears
        await expect(page.locator('.product-card').filter({ hasText: 'Test Product' })).toBeVisible();
    });

    test('should edit a product', async ({ page }) => {
        // First add a product
        await page.click('button:has-text("Add Product")');
        await page.fill('input[name="name"]', 'Edit Me');
        await page.fill('input[name="price"]', '10.00');
        await page.click('button:has-text("Save")');

        // Find and edit
        const productCard = page.locator('.product-card').filter({ hasText: 'Edit Me' });
        await productCard.locator('button[title="Edit"]').click();

        // Update name
        await page.fill('input[name="name"]', 'Edited Product');
        await page.click('button:has-text("Save")');

        // Verify update
        await expect(page.locator('.product-card').filter({ hasText: 'Edited Product' })).toBeVisible();
        await expect(page.locator('.product-card').filter({ hasText: 'Edit Me' })).not.toBeVisible();
    });

    test('should delete a product', async ({ page }) => {
        // First add a product
        await page.click('button:has-text("Add Product")');
        await page.fill('input[name="name"]', 'Delete Me');
        await page.fill('input[name="price"]', '10.00');
        await page.click('button:has-text("Save")');

        // Handle confirm dialog
        page.on('dialog', dialog => dialog.accept());

        // Delete
        const productCard = page.locator('.product-card').filter({ hasText: 'Delete Me' });
        await productCard.locator('button[title="Delete"]').click();

        // Verify deletion
        await expect(page.locator('.product-card').filter({ hasText: 'Delete Me' })).not.toBeVisible();
    });
});
