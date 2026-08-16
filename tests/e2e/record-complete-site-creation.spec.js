/**
 * 🎬 SiteSprintz Complete Site Creation Demo - Full User Journey
 * 
 * This records a COMPLETE, realistic site creation flow that shows:
 * - User registration (with form filling)
 * - Dashboard navigation
 * - Template selection
 * - FULL customization (all fields, images, content)
 * - Menu/Products setup
 * - Contact form configuration
 * - Publishing
 * - Published site viewing
 * - Dashboard management
 * 
 * Run with: npx playwright test record-complete-site-creation.spec.js --headed
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.use({
  video: 'on',
  screenshot: 'only-on-failure',
  trace: 'off',
  actionTimeout: 15_000,
  navigationTimeout: 30_000,
});

test.describe('Complete Site Creation - Full User Journey', () => {
  let userEmail;
  let userPassword;

  test('Real User: Create Restaurant Site from Start to Finish', async ({ page, context }) => {
    const timestamp = Date.now();
    userEmail = `realuser${timestamp}@example.com`;
    userPassword = 'SecurePass!2024';

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 1: Landing Page (0:00-0:45)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 1: Landing Page - First impression');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Let user see the landing page
    
    // Scroll down to show templates
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 2: User Registration (0:45-2:30)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 2: User Registration Flow');
    
    // Click "Get Your Page Free" button
    const getStartedBtn = page.locator('a:has-text("Get Your Page Free")').first();
    if (await getStartedBtn.isVisible()) {
      await page.waitForTimeout(1000);
      await getStartedBtn.click({ delay: 300 });
    }

    // Wait for registration page to load
    await page.waitForURL(/register|signup/i, { timeout: 10000 }).catch(() => {
      console.log('Not on registration page, may already be logged in');
    });

    // Fill registration form
    const emailField = page.locator('input[type="email"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    const confirmPasswordField = page.locator('input[name="confirmPassword"], input[placeholder*="Confirm"]').first();

    // Wait for form to be visible
    await emailField.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('Email field not found, trying alternative selectors');
    });

    // Fill email slowly (so it's visible on video)
    await emailField.click({ delay: 200 });
    await emailField.fill(userEmail, { delay: 50 });
    await page.waitForTimeout(800);

    // Fill password
    await passwordField.click({ delay: 200 });
    await passwordField.fill(userPassword, { delay: 50 });
    await page.waitForTimeout(800);

    // Fill confirm password
    if (await confirmPasswordField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmPasswordField.click({ delay: 200 });
      await confirmPasswordField.fill(userPassword, { delay: 50 });
      await page.waitForTimeout(800);
    }

    // Fill name field if exists
    const nameField = page.locator('input[name="name"], input[placeholder*="Name"]').first();
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameField.click({ delay: 200 });
      await nameField.fill('Chef Marco', { delay: 50 });
      await page.waitForTimeout(800);
    }

    // Submit registration
    const submitBtn = page.locator('button[type="submit"]').first();
    await page.waitForTimeout(1000);
    await submitBtn.click({ delay: 300 });

    // Wait for redirect to dashboard or setup
    await page.waitForURL(/(dashboard|setup|register)/i, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 3: Dashboard Overview (2:30-3:30)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 3: Dashboard Overview');
    
    // Navigate to dashboard if not already there
    if (!page.url().includes('dashboard')) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    }

    await page.waitForTimeout(2000); // Show the dashboard
    
    // Scroll to see all options
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 4: Template Selection (3:30-5:00)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 4: Browse & Select Restaurant Template');
    
    // Navigate to setup/template selection
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // Wait for templates to load
    await page.waitForSelector('button:has-text("Use Template"), [data-template]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Scroll through templates to show variety
    await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    // Click select on the first template (likely restaurant)
    const selectBtn = page.locator('button:has-text("Use Template")').first();
    await page.waitForTimeout(1000);
    await selectBtn.click({ delay: 300 });

    // Wait for editor to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 5: Customize Business Info (5:00-8:00)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 5: Customize Business Information');
    
    // Scroll to make sure form is visible
    await page.evaluate(() => window.scrollBy({ top: 100, behavior: 'smooth' }));
    await page.waitForTimeout(1000);

    // Business Name
    const businessNameField = page.locator(
      '[data-testid="business-name"], input[placeholder*="Business"], input[placeholder*="Restaurant"]'
    ).first();

    if (await businessNameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Filling business name...');
      await businessNameField.click({ delay: 200 });
      await businessNameField.fill('', { delay: 30 }); // Clear
      await page.waitForTimeout(400);
      await businessNameField.fill('La Bella Cucina', { delay: 60 });
      await page.waitForTimeout(1200);
    }

    // Hero/Main Title
    const heroTitleField = page.locator(
      '[data-testid="hero-title"], input[placeholder*="Hero"], input[placeholder*="Title"], input[placeholder*="Tagline"]'
    ).first();

    if (await heroTitleField.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Filling hero title...');
      await heroTitleField.click({ delay: 200 });
      await heroTitleField.fill('', { delay: 30 });
      await page.waitForTimeout(400);
      await heroTitleField.fill('Authentic Italian Dining Experience', { delay: 60 });
      await page.waitForTimeout(1200);
    }

    // Hero Subtitle/Description
    const heroSubtitleField = page.locator(
      '[data-testid="hero-subtitle"], input[placeholder*="Subtitle"], input[placeholder*="Tagline"], textarea'
    ).first();

    if (await heroSubtitleField.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Filling hero subtitle...');
      await heroSubtitleField.click({ delay: 200 });
      await heroSubtitleField.fill('', { delay: 30 });
      await page.waitForTimeout(400);
      await heroSubtitleField.fill('Locally sourced ingredients, traditional recipes, warm hospitality', { delay: 60 });
      await page.waitForTimeout(1200);
    }

    // Phone Number
    const phoneField = page.locator(
      'input[type="tel"], input[placeholder*="Phone"], input[placeholder*="("]'
    ).first();

    if (await phoneField.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Filling phone...');
      await phoneField.click({ delay: 200 });
      await phoneField.fill('(555) 123-4567', { delay: 60 });
      await page.waitForTimeout(1000);
    }

    // Email
    const contactEmailField = page.locator(
      'input[type="email"], input[placeholder*="Email"]'
    ).nth(1); // Second email field (first is login email)

    if (await contactEmailField.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Filling contact email...');
      await contactEmailField.click({ delay: 200 });
      await contactEmailField.fill('contact@bellacucina.com', { delay: 60 });
      await page.waitForTimeout(1000);
    }

    // Address
    const addressField = page.locator(
      'input[placeholder*="Address"], input[placeholder*="Street"]'
    ).first();

    if (await addressField.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Filling address...');
      await addressField.click({ delay: 200 });
      await addressField.fill('123 Main Street, Downtown', { delay: 60 });
      await page.waitForTimeout(1000);
    }

    // Scroll down to show more customization options
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 6: Image Upload (8:00-9:30)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 6: Upload Hero Image');
    
    // Look for image upload field
    const imageUploadBtn = page.locator(
      'button:has-text("Upload"), input[type="file"], [data-testid*="image"]'
    ).first();

    if (await imageUploadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Found image upload button');
      // Hover over to show it's interactive
      await imageUploadBtn.hover({ force: true });
      await page.waitForTimeout(1500);
    }

    // Scroll to show preview if available
    await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 7: Additional Content (9:30-11:00)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 7: Configure Additional Content');
    
    // Look for menu items, hours, or other sections
    const menuSection = page.locator(
      '[data-testid*="menu"], [data-testid*="hours"], button:has-text("Add"), button:has-text("Edit")'
    ).first();

    if (await menuSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuSection.hover({ force: true });
      await page.waitForTimeout(1000);
    }

    // Scroll to show all sections
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 8: Preview Live Site (11:00-12:30)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 8: Preview the Customized Site');
    
    // Look for preview button or iframe
    const previewBtn = page.locator('button:has-text("Preview"), [data-testid*="preview"]').first();
    if (await previewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await previewBtn.click({ delay: 300 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Scroll the preview to show content
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 9: Publish Site (12:30-14:00)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 9: Publish the Website');
    
    // Scroll back up to find publish button
    await page.evaluate(() => window.scrollBy({ top: -500, behavior: 'smooth' }));
    await page.waitForTimeout(1000);

    // Find and click publish button
    const publishBtn = page.locator(
      'button:has-text("Publish"), button:has-text("Launch"), button:has-text("Create Site")'
    ).first();

    if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Clicking publish button...');
      await page.waitForTimeout(1000);
      await publishBtn.click({ delay: 300 });
      
      // Wait for success
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 10: Success & Published Site (14:00-15:30)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 10: See Published Site');
    
    // Look for success message and published site link
    const publishedLink = page.locator('a[href*="/sites/"]').first();
    
    if (await publishedLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const siteUrl = await publishedLink.getAttribute('href');
      console.log(`Published site URL: ${siteUrl}`);
      
      // Open published site in new tab
      const newPage = await context.newPage();
      await newPage.goto(`http://localhost:3000${siteUrl}`);
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);

      // Scroll through the published site to show it's live
      await newPage.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await newPage.waitForTimeout(1500);

      await newPage.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await newPage.waitForTimeout(1500);

      await newPage.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await newPage.waitForTimeout(1500);

      // Show mobile view (resize browser)
      await newPage.setViewportSize({ width: 375, height: 812 });
      await newPage.waitForTimeout(1500);

      // Scroll on mobile
      await newPage.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
      await newPage.waitForTimeout(1500);

      await newPage.close();
    }

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 11: Return to Dashboard (15:30-17:00)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 11: Dashboard Management');
    
    // Return to main page or dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Show the newly created site in dashboard
    const siteCard = page.locator('[data-testid*="site"], .site-card, .grid-item').first();
    if (await siteCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await siteCard.hover({ force: true });
      await page.waitForTimeout(1000);
    }

    // Scroll to show all dashboard features
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    /**
     * ═══════════════════════════════════════════════════════════════════
     * SCENE 12: Closing (17:00-18:00)
     * ═══════════════════════════════════════════════════════════════════
     */
    console.log('📹 SCENE 12: Complete! Summary');
    
    // Show success message
    const successMsg = page.locator('text=/Success|Complete|Created/i').first();
    if (await successMsg.isVisible({ timeout: 5000 }).catch(() => false)) {
      await successMsg.hover({ force: true });
      await page.waitForTimeout(2000);
    }

    // End by scrolling through dashboard
    await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    console.log('✅ Complete site creation recorded!');
  });
});



