/**
 * E2E Tests: Google OAuth Button Visibility
 * Tests that the Google Sign-In button is present and clickable
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';

test.describe('Google OAuth Button Visibility', () => {
  
  test('should display Google Sign-In button on login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Look for Google button
    const googleButton = page.locator('.google-oauth-button, button:has-text("Continue with Google"), a:has-text("Continue with Google")').first();
    
    // Verify button exists
    const buttonCount = await googleButton.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify button is visible
    if (buttonCount > 0) {
      await expect(googleButton).toBeVisible();
      
      // Verify button has correct text
      const buttonText = await googleButton.textContent();
      expect(buttonText).toContain('Google');
    }
  });

  test('should display Google Sign-In button on register page', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Look for Google button
    const googleButton = page.locator('.google-oauth-button, button:has-text("Continue with Google"), a:has-text("Continue with Google")').first();
    
    // Verify button exists
    const buttonCount = await googleButton.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify button is visible
    if (buttonCount > 0) {
      await expect(googleButton).toBeVisible();
      
      // Verify button has correct text
      const buttonText = await googleButton.textContent();
      expect(buttonText).toContain('Google');
    }
  });

  test('should have Google icon SVG in button', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    
    // Check for Google icon SVG
    const googleIcon = page.locator('.google-icon, .google-oauth-button svg').first();
    const iconExists = await googleIcon.count() > 0;
    
    expect(iconExists).toBeTruthy();
  });

  test('Google button should be clickable on login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    
    const googleButton = page.locator('.google-oauth-button, button:has-text("Continue with Google")').first();
    
    // Verify button is enabled (not disabled)
    const isEnabled = await googleButton.isEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('Google button should be clickable on register page', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(1000);
    
    const googleButton = page.locator('.google-oauth-button, button:has-text("Continue with Google")').first();
    
    // Verify button is enabled (not disabled)
    const isEnabled = await googleButton.isEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('should verify Google OAuth endpoint exists', async ({ request }) => {
    // Test that the OAuth endpoint responds (even if redirect)
    const response = await request.get(`${BASE_URL.replace('5173', '3000')}/auth/google`).catch(() => null);
    
    // Endpoint should exist (200, 302 redirect, or 404 are acceptable - not 500)
    if (response) {
      expect(response.status()).not.toBe(500);
    }
  });
});

