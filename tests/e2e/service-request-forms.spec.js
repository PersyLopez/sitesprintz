/**
 * Service Request Forms E2E Tests
 * 
 * Tests the complete user flow for submitting service request forms
 * on published sites with different templates.
 */

import { test, expect } from '@playwright/test';

test.describe('Service Request Forms', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a test site (adjust subdomain as needed)
    await page.goto('/sites/test-site');
  });

  test('should display service request form for restaurant template', async ({ page }) => {
    // Wait for form to load
    await page.waitForSelector('.service-request-form', { timeout: 5000 });

    // Check base fields are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();

    // Check niche-specific fields for restaurant
    await expect(page.locator('input[name="partySize"]')).toBeVisible();
    await expect(page.locator('select[name="occasion"]')).toBeVisible();
  });

  test('should submit restaurant service request successfully', async ({ page }) => {
    await page.waitForSelector('.service-request-form');

    // Fill in base fields
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '555-1234');

    // Fill in restaurant-specific fields
    await page.fill('input[name="partySize"]', '4');
    await page.selectOption('select[name="occasion"]', 'birthday');
    await page.fill('input[name="preferred_date"]', '2024-12-25');
    await page.fill('input[name="preferred_time"]', '19:00');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('.form-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.form-success')).toContainText('successfully');
  });

  test('should validate required fields', async ({ page }) => {
    await page.waitForSelector('.service-request-form');

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('.form-error, input:invalid')).toBeVisible();
  });

  test('should display auto repair form fields', async ({ page }) => {
    // Navigate to auto repair site
    await page.goto('/sites/auto-repair-site');
    await page.waitForSelector('.service-request-form');

    // Check auto repair-specific fields
    await expect(page.locator('select[name="vehicleYear"]')).toBeVisible();
    await expect(page.locator('input[name="vehicleMake"]')).toBeVisible();
    await expect(page.locator('select[name="issueType"]')).toBeVisible();
  });

  test('should submit auto repair quote request', async ({ page }) => {
    await page.goto('/sites/auto-repair-site');
    await page.waitForSelector('.service-request-form');

    // Fill in form
    await page.fill('input[name="name"]', 'Jane Smith');
    await page.fill('input[name="email"]', 'jane@example.com');
    await page.fill('input[name="phone"]', '555-5678');

    const currentYear = new Date().getFullYear();
    await page.selectOption('select[name="vehicleYear"]', currentYear.toString());
    await page.fill('input[name="vehicleMake"]', 'Toyota Camry');
    await page.selectOption('select[name="issueType"]', 'brakes');

    // Submit
    await page.click('button[type="submit"]');

    // Check success
    await expect(page.locator('.form-success')).toBeVisible({ timeout: 5000 });
  });

  test('should handle form errors gracefully', async ({ page }) => {
    await page.waitForSelector('.service-request-form');

    // Fill with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="partySize"]', '4');

    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.form-error')).toBeVisible();
  });

  test('should show loading state during submission', async ({ page }) => {
    await page.waitForSelector('.service-request-form');

    // Fill form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="partySize"]', '2');

    // Submit and check button is disabled
    await page.click('button[type="submit"]');
    await expect(page.locator('button[type="submit"]:disabled')).toBeVisible();
  });
});

test.describe('Growth Tier Access', () => {
  test('should show service request form for Growth tier sites', async ({ page }) => {
    // Navigate to a Growth tier site
    await page.goto('/sites/growth-tier-site');
    
    // Form should be visible
    await expect(page.locator('.service-request-form')).toBeVisible();
  });

  test('should not show service request form for Starter tier sites', async ({ page }) => {
    // Navigate to a Starter tier site
    await page.goto('/sites/starter-tier-site');
    
    // Form should not be visible (or show upgrade message)
    const formVisible = await page.locator('.service-request-form').isVisible().catch(() => false);
    expect(formVisible).toBe(false);
  });
});




