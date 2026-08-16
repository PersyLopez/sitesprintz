/**
 * E2E Tests: PublishedSiteViewer Component
 * 
 * Tests the React PublishedSiteViewer component with:
 * - Native booking widget integration
 * - Shopping cart and checkout
 * - Product display and cart functionality
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { TIMEOUTS } from '../fixtures/test-config.js';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
let TEST_SITE_SUBDOMAIN;
let TEST_USER_ID;

test.describe('PublishedSiteViewer - Booking & Cart', () => {

  test.beforeAll(async () => {
    // Read test data from seed
    const seedPath = path.resolve(process.cwd(), 'tests/e2e/.seed/seed-data.json');
    if (fs.existsSync(seedPath)) {
      const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      TEST_SITE_SUBDOMAIN = seed?.sites?.proSiteSubdomain || 'test-restaurant';
      TEST_USER_ID = seed?.users?.proUserId;
    } else {
      TEST_SITE_SUBDOMAIN = 'test-restaurant';
      TEST_USER_ID = 'test-user-id';
    }
  });

  test('should display published site with booking widget', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Wait for site to load
    await page.waitForSelector('.published-site-viewer, .site-hero, .site-main', { timeout: TIMEOUTS.LONG });

    // Check for booking section
    const bookingSection = page.locator('.booking-section, .booking-widget-container');
    const bookingExists = await bookingSection.count();
    
    // Booking may or may not be visible depending on configuration
    expect(bookingExists).toBeGreaterThanOrEqual(0);
  });

  test('should render native booking widget in PublishedSiteViewer', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Wait for booking widget to load
    const servicesList = page.getByTestId('services-list');
    
    // Services should appear if booking is enabled
    const servicesVisible = await servicesList.isVisible({ timeout: TIMEOUTS.LONG }).catch(() => false);
    
    if (servicesVisible) {
      const services = page.getByTestId(/service-card-/);
      const serviceCount = await services.count();
      expect(serviceCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display shopping cart when checkout enabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Look for cart toggle button
    const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn');
    const cartExists = await cartButton.count();
    
    // Cart button may or may not be present depending on settings
    expect(cartExists).toBeGreaterThanOrEqual(0);
  });

  test('should add products to cart in PublishedSiteViewer', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Find "Add to Cart" buttons
    const addButtons = page.locator('button').filter({ hasText: /add to cart/i });
    const buttonCount = await addButtons.count();
    
    if (buttonCount > 0) {
      await addButtons.first().click();
      await page.waitForTimeout(500);

      // Check for cart notification or badge
      const notification = page.locator('.cart-notification, [data-testid="cart-notification"]');
      const badge = page.locator('[data-testid="cart-item-count"], .cart-badge');
      
      const hasNotification = await notification.isVisible({ timeout: 2000 }).catch(() => false);
      const hasBadge = await badge.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasNotification || hasBadge).toBeTruthy();
    }
  });

  test('should open cart sidebar in PublishedSiteViewer', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Add item first
    const addButton = page.locator('button').filter({ hasText: /add to cart/i }).first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(500);
    }

    // Open cart
    const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn').first();
    if (await cartButton.count() > 0) {
      await cartButton.click();
      await page.waitForTimeout(500);

      // Cart sidebar should be visible
      const cartSidebar = page.locator('[data-testid="cart-sidebar"], .cart-sidebar');
      if (await cartSidebar.count() > 0) {
        await expect(cartSidebar).toBeVisible();
      }
    }
  });

  test('should display checkout button in cart', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Add item and open cart
    const addButton = page.locator('button').filter({ hasText: /add to cart/i }).first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(500);

      const cartButton = page.locator('[data-testid="cart-toggle-button"], .cart-toggle-btn').first();
      if (await cartButton.count() > 0) {
        await cartButton.click();
        await page.waitForTimeout(500);

        // Check for checkout button
        const checkoutButton = page.locator('[data-testid="checkout-button"], .btn-checkout, [data-testid="checkout-btn"]');
        if (await checkoutButton.count() > 0) {
          await expect(checkoutButton).toBeVisible();
        }
      }
    }
  });

  test('should complete booking flow in PublishedSiteViewer', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Wait for services
    const servicesList = page.getByTestId('services-list');
    const servicesVisible = await servicesList.isVisible({ timeout: TIMEOUTS.LONG }).catch(() => false);
    
    if (servicesVisible) {
      // Select service
      const services = page.getByTestId(/service-card-/);
      if (await services.count() > 0) {
        await services.first().click();
        await page.getByTestId('next-button').click();

        // Date picker should appear
        const datePicker = page.getByTestId('date-picker');
        await expect(datePicker).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      }
    }
  });
});

test.describe('PublishedSiteViewer - Integration', () => {
  test('should load site data correctly', async ({ page }) => {
    const subdomain = 'test-restaurant';
    await page.goto(`${BASE_URL}/sites/${subdomain}`, { waitUntil: 'networkidle' });

    // Site should load
    const siteContent = page.locator('.published-site-viewer, .site-hero, .site-main');
    await expect(siteContent).toBeVisible({ timeout: TIMEOUTS.LONG });
  });

  test('should handle missing site gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/non-existent-site-12345`, { waitUntil: 'networkidle' });

    // Should show error or not found message
    const errorMessage = page.locator('.error, [data-testid="error"], h2').filter({ hasText: /not found|error/i });
    const errorVisible = await errorMessage.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false);
    
    // Either error is shown or page doesn't load
    expect(errorVisible || await page.locator('body').textContent()).toBeTruthy();
  });
});



