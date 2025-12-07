import { test, expect } from '@playwright/test';
import { login, createTestSite } from '../helpers/e2e-test-utils.js';

test.describe('Site Orders Management', () => {
    let siteId;

    test.beforeEach(async ({ page }) => {
        await login(page);
        const site = await createTestSite(page);
        siteId = site.id; // Assuming createTestSite returns object with id

        // If createTestSite doesn't return ID directly, we might need to fetch it or rely on subdomain
        // For now, let's assume we can navigate to orders via dashboard or direct link if we knew the ID
        // But Orders.jsx needs ?siteId=...

        // Let's go to dashboard and find the "Orders" link for this site
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Find the site card
        const siteCard = page.locator(`[data-subdomain="${site.subdomain}"], .site-card`).first();

        // Click "Manage" or "Orders" if available directly, or go to Setup -> Orders?
        // Based on App.jsx, /orders is a top level route but needs siteId param.
        // We need to get the siteId from the DOM if createTestSite didn't give it.
        if (!siteId) {
            siteId = await siteCard.getAttribute('data-site-id');
        }

        // Navigate to orders page
        await page.goto(`/orders?siteId=${siteId}`);
    });

    test('should display orders page', async ({ page }) => {
        await expect(page.locator('h1').filter({ hasText: /orders/i })).toBeVisible();
        await expect(page.locator('.orders-container')).toBeVisible();
    });

    test('should filter orders', async ({ page }) => {
        // Check filter buttons
        await expect(page.locator('button').filter({ hasText: /all orders/i })).toBeVisible();
        await expect(page.locator('button').filter({ hasText: /new orders/i })).toBeVisible();

        // Click 'New Orders'
        await page.click('button:has-text("New Orders")');
        await expect(page.locator('button:has-text("New Orders")')).toHaveClass(/active/);
    });

    test('should search orders', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="search" i]');
        await expect(searchInput).toBeVisible();

        await searchInput.fill('nonexistent-order-id');
        await expect(page.locator('text=No orders match')).toBeVisible();
    });

    test('should export orders', async ({ page }) => {
        const exportBtn = page.locator('button').filter({ hasText: /export csv/i });
        await expect(exportBtn).toBeVisible();

        // Trigger download
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toContain('orders-');
    });
});
