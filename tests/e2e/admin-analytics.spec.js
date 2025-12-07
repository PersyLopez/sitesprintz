import { test, expect } from '@playwright/test';

test.describe('Admin Analytics', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@example.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/admin|\/dashboard/);

        // Go to analytics
        await page.goto('/admin/analytics');
    });

    test('should display analytics dashboard', async ({ page }) => {
        // Check for main headers
        await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 15000 });

        // Check for stats cards
        await expect(page.locator('.stats-grid')).toBeVisible();
        await expect(page.locator('.stats-card').first()).toBeVisible();
    });

    test('should display growth metrics', async ({ page }) => {
        await expect(page.locator('text=Growth Metrics')).toBeVisible();
        await expect(page.locator('.growth-grid')).toBeVisible();
    });

    test('should display subscription breakdown', async ({ page }) => {
        await expect(page.locator('text=Subscription Breakdown')).toBeVisible();
        await expect(page.locator('.subscription-grid')).toBeVisible();
    });

    test('should switch tabs', async ({ page }) => {
        // Click Activity tab
        await page.click('button:has-text("Activity")');
        await expect(page.locator('.activity-feed')).toBeVisible();

        // Click System tab
        await page.click('button:has-text("System")');
        await expect(page.locator('.system-health-grid')).toBeVisible();
    });
});
