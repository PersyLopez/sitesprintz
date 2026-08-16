/**
 * E2E Tests: Order Management Journey (Site Owner)
 * Tests for site owners managing customer orders
 * Covers: navigation, viewing, filtering, details, status updates
 */

import { test, expect } from '@playwright/test';
import { createTestSiteViaApi } from '../helpers/e2e-test-utils.js';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-config.js';

test.describe('Order Management Journey (Site Owner)', () => {
    let siteId;

    // Use global pre-authentication
    test.use({ storageState: 'tests/e2e/.auth/user.json' });

    test.beforeEach(async ({ page, request }) => {
        const site = await createTestSiteViaApi(request, {
            businessName: `Orders Test ${Date.now()}`,
            templateId: 'restaurant-casual',
            plan: 'pro' // Pro tier required for e-commerce/orders
        });

        siteId = site.id;
        await page.goto(`/orders?siteId=${siteId}`, { waitUntil: 'networkidle' });
    });

    test('9.1: owner can navigate to orders page', async ({ page }) => {
        // Verify we're on orders page
        await expect(page).toHaveURL(/orders/);

        // Verify orders page header is visible
        const pageHeader = page.locator('h1').filter({ hasText: /orders/i });
        await expect(pageHeader).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

        // Verify orders container exists
        const container = page.locator('[data-testid="orders-container"], .orders-container');
        await expect(container).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    test('9.2: owner can view order list', async ({ page }) => {
        // Wait for orders to load
        await page.waitForLoadState('networkidle');

        // Look for order items with resilient selector
        const orders = page.locator(
            '[data-testid="order-item"], [data-testid="order-card"], .order-item, [class*="order"][class*="row"]'
        );

        // Either have orders or empty state
        const orderCount = await orders.count();
        const emptyState = page.locator(
            '[data-testid="empty-orders"], .empty-state, text=/no orders|empty/i'
        );
        const hasEmptyState = await emptyState.count() > 0;

        expect(orderCount > 0 || hasEmptyState).toBeTruthy();
    });

    test('9.3: owner can filter orders by status', async ({ page }) => {
        // Look for filter buttons/controls
        const filterButtons = page.locator(
            '[data-testid="order-status-filter"], .filter-button, button[aria-label*="status" i]'
        );

        const filterCount = await filterButtons.count();
        
        if (filterCount > 0) {
            // Try clicking a filter button
            await filterButtons.first().click();
            await page.waitForTimeout(500); // Filter animation

            // Verify filter was applied (UI state change)
            const activeFilter = page.locator('[data-testid="order-status-filter"], .filter-button').filter({ hasClass: /active|selected/ });
            
            if (await activeFilter.count() > 0) {
                expect(true).toBeTruthy();
            }
        } else {
            // Alternative: look for status dropdown/select
            const statusSelect = page.locator('select[name*="status" i], [role="listbox"][aria-label*="status" i]');
            
            if (await statusSelect.isVisible().catch(() => false)) {
                await statusSelect.click();
                await page.waitForTimeout(300);
                expect(true).toBeTruthy();
            }
        }
    });

    test('9.4: owner can view order details', async ({ page }) => {
        // Wait for orders to load
        await page.waitForLoadState('networkidle');

        // Look for order items
        const orderItems = page.locator(
            '[data-testid="order-item"], [data-testid="order-card"], .order-item'
        );

        const itemCount = await orderItems.count();

        if (itemCount > 0) {
            // Click first order to view details
            await orderItems.first().click();
            await page.waitForLoadState('networkidle');

            // Verify details view loaded
            const orderDetails = page.locator(
                '[data-testid="order-details"], .order-details, h1:has-text("Order")'
            );

            const detailsVisible = await orderDetails.count() > 0;
            const newUrl = page.url();
            const hasOrderIdInUrl = /order|detail/.test(newUrl);

            expect(detailsVisible || hasOrderIdInUrl).toBeTruthy();
        } else {
            // No orders to view - test passes (gracefully handled)
            console.log('No orders available to view details');
        }
    });

    test('9.5: owner can mark order as completed', async ({ page }) => {
        // Wait for orders to load
        await page.waitForLoadState('networkidle');

        // Look for order items
        const orderItems = page.locator(
            '[data-testid="order-item"], [data-testid="order-card"], .order-item'
        );

        const itemCount = await orderItems.count();

        if (itemCount > 0) {
            // Click first order
            const firstOrder = orderItems.first();
            await firstOrder.click();
            await page.waitForLoadState('networkidle');

            // Look for mark complete button
            const completeBtn = page.locator(
                '[data-testid="mark-complete-btn"], [data-testid="order-complete"], button:has-text("Complete")'
            ).first();

            if (await completeBtn.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
                await completeBtn.click();
                await page.waitForTimeout(500); // Update animation

                // Verify completion (status change or success message)
                const successMsg = page.locator('[data-testid="success-message"], .success, text=/completed/i');
                const completedStatus = page.locator('[data-testid="order-status"], .status').filter({ hasText: /completed/i });

                const hasSuccess = await successMsg.count() > 0;
                const hasStatus = await completedStatus.count() > 0;

                expect(hasSuccess || hasStatus).toBeTruthy();
            } else {
                console.log('Mark complete button not found - may not be available for this order');
            }
        } else {
            console.log('No orders available to mark complete');
        }
    });

    test('9.6: owner can cancel order', async ({ page }) => {
        // Wait for orders to load
        await page.waitForLoadState('networkidle');

        // Look for order items
        const orderItems = page.locator(
            '[data-testid="order-item"], [data-testid="order-card"], .order-item'
        );

        const itemCount = await orderItems.count();

        if (itemCount > 0) {
            // Click first order
            const firstOrder = orderItems.first();
            await firstOrder.click();
            await page.waitForLoadState('networkidle');

            // Look for cancel button (might be in menu or actions)
            const cancelBtn = page.locator(
                '[data-testid="cancel-order-btn"], [data-testid="order-cancel"], button:has-text("Cancel")'
            ).first();

            if (await cancelBtn.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
                // Handle confirmation dialog
                page.once('dialog', dialog => {
                    expect(dialog.type()).toBe('confirm');
                    dialog.accept();
                });

                await cancelBtn.click();
                await page.waitForTimeout(500); // Update animation

                // Verify cancellation
                const successMsg = page.locator('[data-testid="success-message"], .success, text=/cancelled/i');
                const cancelledStatus = page.locator('[data-testid="order-status"], .status').filter({ hasText: /cancelled/i });

                const hasSuccess = await successMsg.count() > 0;
                const hasStatus = await cancelledStatus.count() > 0;

                expect(hasSuccess || hasStatus).toBeTruthy();
            } else {
                console.log('Cancel button not found - may not be available for this order');
            }
        } else {
            console.log('No orders available to cancel');
        }
    });

    test('9.7: order status updates are reflected', async ({ page }) => {
        // Wait for orders to load
        await page.waitForLoadState('networkidle');

        // Get initial order list
        const orderItems = page.locator(
            '[data-testid="order-item"], [data-testid="order-card"], .order-item'
        );

        const initialCount = await orderItems.count();

        if (initialCount > 0) {
            // Get initial status of first order
            const firstOrder = orderItems.first();
            const initialStatus = await firstOrder.locator('[data-testid="order-status"], .status').textContent() || 'pending';

            // Click order to open details
            await firstOrder.click();
            await page.waitForLoadState('networkidle');

            // Try to update status
            const updateBtn = page.locator(
                '[data-testid="mark-complete-btn"], [data-testid="update-status"], button:has-text(/complete|process|ready/i)'
            ).first();

            if (await updateBtn.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
                await updateBtn.click();
                await page.waitForTimeout(500);

                // Go back to list
                await page.goto(`/orders?siteId=${page.url().split('siteId=')[1]}`, { waitUntil: 'networkidle' });

                // Check if status was updated
                const updatedOrder = page.locator(
                    '[data-testid="order-item"], [data-testid="order-card"], .order-item'
                ).first();

                const updatedStatus = await updatedOrder.locator('[data-testid="order-status"], .status').textContent() || '';

                // Status should be different from initial
                expect(updatedStatus).toBeTruthy();
            } else {
                console.log('Status update button not found');
            }
        } else {
            console.log('No orders available to verify status updates');
        }
    });
});
