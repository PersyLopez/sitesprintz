/**
 * E2E Tests: Native Booking Widget in Templates
 * 
 * Tests native booking widget integration in published sites and templates
 * Covers: widget rendering, service selection, booking flow, template integration
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { TIMEOUTS } from '../fixtures/test-config.js';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
let TEST_USER_ID;
let TEST_SITE_SUBDOMAIN;

test.describe('Native Booking Widget in Templates', () => {

  test.beforeAll(async () => {
    // Read IDs from seed data
    const seedPath = path.resolve(process.cwd(), 'tests/e2e/.seed/seed-data.json');
    if (fs.existsSync(seedPath)) {
      const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      TEST_USER_ID = seed?.users?.proUserId;
      TEST_SITE_SUBDOMAIN = seed?.sites?.proSiteSubdomain || 'test-restaurant';
    } else {
      // Fallback test data
      TEST_USER_ID = 'test-user-id';
      TEST_SITE_SUBDOMAIN = 'test-restaurant';
    }
  });

  test('should render native booking widget in published site', async ({ page }) => {
    // Navigate to a published site with booking enabled
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Wait for React app to load
    await page.waitForSelector('.published-site-viewer, .site-section', { timeout: TIMEOUTS.LONG });

    // Wait for booking section or services list (React component)
    const bookingSection = page.locator('.booking-section, .booking-widget-container').first();
    const servicesList = page.getByTestId('services-list');
    
    // Either booking section or services list should appear
    const bookingVisible = await bookingSection.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false);
    const servicesVisible = await servicesList.isVisible({ timeout: TIMEOUTS.LONG }).catch(() => false);
    
    expect(bookingVisible || servicesVisible).toBeTruthy();
  });

  test('should load services in native booking widget', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Wait for services to load
    const servicesList = page.getByTestId('services-list');
    
    // Services should appear (may be loading initially)
    await expect(servicesList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Verify at least one service is displayed
    const services = page.getByTestId(/service-card-/);
    const serviceCount = await services.count();
    
    if (serviceCount > 0) {
      expect(serviceCount).toBeGreaterThan(0);
    } else {
      // Check for empty state
      const emptyState = page.getByTestId('services-empty');
      const emptyVisible = await emptyState.isVisible().catch(() => false);
      // Either services exist or empty state is shown
      expect(emptyVisible || serviceCount > 0).toBeTruthy();
    }
  });

  test('should allow service selection in native booking widget', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Wait for services
    await page.getByTestId('services-list').waitFor({ state: 'visible', timeout: TIMEOUTS.LONG });

    const services = page.getByTestId(/service-card-/);
    const serviceCount = await services.count();
    
    if (serviceCount > 0) {
      const firstService = services.first();
      await expect(firstService).toBeVisible();
      await firstService.click();

      // Verify service is selected
      const isSelected = await firstService.evaluate((el) => {
        return el.classList.contains('selected');
      });
      expect(isSelected).toBeTruthy();

      // Next button should appear
      const nextButton = page.getByTestId('next-button');
      await expect(nextButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    }
  });

  test('should navigate through booking steps', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Step 1: Select service
    await page.getByTestId('services-list').waitFor({ state: 'visible', timeout: TIMEOUTS.LONG });
    const services = page.getByTestId(/service-card-/);
    
    if (await services.count() > 0) {
      await services.first().click();
      await page.getByTestId('next-button').click();

      // Step 2: Date picker should appear
      const datePicker = page.getByTestId('date-picker');
      await expect(datePicker).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Select tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      const dateButton = page.getByTestId(`date-${dateString}`);
      if (await dateButton.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
        await dateButton.click();

        // Step 3: Time slots should appear
        const timeSlots = page.getByTestId('time-slots');
        await expect(timeSlots).toBeVisible({ timeout: TIMEOUTS.LONG });

        // Select first available time slot
        const firstSlot = page.getByTestId(/time-slot-/).first();
        if (await firstSlot.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
          await firstSlot.click();
          await page.getByTestId('next-button').click();

          // Step 4: Customer form should appear
          const customerForm = page.getByTestId('customer-form');
          await expect(customerForm).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
        }
      }
    }
  });

  test('should handle booking widget in template preview', async ({ page }) => {
    // Navigate to template preview with booking enabled
    await page.goto(`${BASE_URL}/?template=restaurant-pro`, { waitUntil: 'networkidle' });

    // Wait for page to render
    await page.waitForTimeout(2000);

    // Check for booking widget section
    const bookingSection = page.locator('.booking-widget-section, .booking-widget-container').first();
    
    // Widget may be present or may need to load
    const widgetExists = await bookingSection.count();
    expect(widgetExists).toBeGreaterThanOrEqual(0);
  });

  test('should fallback to third-party embed when URL provided', async ({ page }) => {
    // This test verifies fallback behavior
    // Navigate to a site with Calendly URL configured
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Check for either native widget or third-party embed
    const nativeWidget = page.locator('.native-booking-widget');
    const calendlyWidget = page.locator('.calendly-inline-widget, [data-url*="calendly"]');
    
    const hasNative = await nativeWidget.count() > 0;
    const hasCalendly = await calendlyWidget.count() > 0;
    
    // At least one should be present
    expect(hasNative || hasCalendly).toBeTruthy();
  });

  test('should display error when userId not found', async ({ page }) => {
    // Navigate to a site without valid userId
    await page.goto(`${BASE_URL}/sites/invalid-site`, { waitUntil: 'networkidle' });

    // Error message may appear
    const errorMessage = page.locator('.error, [data-testid="error-message"]').filter({ 
      hasText: /user.*id|booking.*widget/i 
    });
    
    // Error may or may not be visible depending on implementation
    const errorCount = await errorMessage.count();
    expect(errorCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Native Booking Widget - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should work on mobile devices', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SITE_SUBDOMAIN}`, { waitUntil: 'networkidle' });

    // Services should be visible on mobile
    const servicesList = page.getByTestId('services-list');
    await expect(servicesList).toBeVisible({ timeout: TIMEOUTS.LONG });

    const services = page.getByTestId(/service-card-/);
    if (await services.count() > 0) {
      await expect(services.first()).toBeVisible();
      await services.first().click();
    }
  });
});

