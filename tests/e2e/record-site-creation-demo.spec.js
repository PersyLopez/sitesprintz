/**
 * 🎬 SiteSprintz Site Creation Demo - Automated Video Recording
 * 
 * This test records the complete site creation journey as a video.
 * Run with: npx playwright test record-site-creation-demo.spec.js --headed --video=on
 * 
 * Features:
 * - Records the entire site creation flow
 * - Captures all key steps with proper pacing
 * - Includes delays for natural-looking interactions
 * - Creates high-quality video output
 */

import { test, expect } from '@playwright/test';

// Increase video quality and recording settings
test.use({
  video: 'on', // Record video
  screenshot: 'only-on-failure',
  trace: 'off', // Disable traces to reduce file size
  actionTimeout: 15_000,
  navigationTimeout: 30_000,
});

test.describe('SiteSprintz Site Creation Demo - Video Recording', () => {
  let registeredUserData;

  test.beforeAll(async ({ request }) => {
    /**
     * Pre-register a test user via API
     * This avoids CAPTCHA issues and saves time in the demo
     */
    const timestamp = Date.now();
    const testEmail = `demo${timestamp}@example.com`;
    const testPassword = 'DemoPass!2024';

    // Get CSRF token
    const csrfRes = await request.get('/api/csrf-token');
    const { csrfToken } = await csrfRes.json();

    // Register user
    const registerRes = await request.post('/api/auth/register', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        name: 'Demo User',
        acceptedTerms: true
      }
    });

    if (!registerRes.ok()) {
      throw new Error(`Failed to register demo user: ${registerRes.status()}`);
    }

    const userData = await registerRes.json();
    registeredUserData = {
      email: testEmail,
      password: testPassword,
      accessToken: userData.accessToken
    };
  });

  test('Complete Site Creation Journey - Video Demo', async ({ page, context }) => {
    /**
     * SCENE 1: Landing Page (0:00-0:30)
     */
    console.log('📹 SCENE 1: Showing landing page...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Let the landing page display for 3 seconds
    await page.waitForTimeout(3000);

    /**
     * SCENE 2: Navigate to Setup (Template Selection) (0:30-1:30)
     */
    console.log('📹 SCENE 2: Navigating to template selection...');
    
    // Click "Get Your Page Free"
    const getStartedBtn = page.locator('a:has-text("Get Your Page Free")').first();
    if (await getStartedBtn.isVisible()) {
      await page.click('text=Get Your Page Free');
      await page.waitForURL(/register|login/, { timeout: 10000 }).catch(() => {});
    }

    // If we ended up on login, log in with our pre-registered user
    if (page.url().includes('login')) {
      console.log('📹 Logging in with demo user...');
      await page.fill('input[type="email"]', registeredUserData.email);
      await page.fill('input[type="password"]', registeredUserData.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/, { timeout: 15000 });
    }

    // Navigate to setup (template selection)
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');
    
    // Wait for templates to load
    const templateCards = page.locator('[data-template]').first();
    await templateCards.waitFor({ state: 'visible', timeout: 10000 }).catch(
      async () => {
        // Fallback: wait for any visible button with text "Use Template"
        await page.locator('button:has-text("Use Template")').first().waitFor({ state: 'visible' });
      }
    );

    await page.waitForTimeout(2000); // Let template grid display

    /**
     * SCENE 3: Select a Template (1:30-2:00)
     */
    console.log('📹 SCENE 3: Selecting restaurant template...');
    
    // Find and click the first template's select button
    const selectButtons = page.locator('button:has-text("Use Template")');
    const firstSelectBtn = selectButtons.first();
    
    if (await firstSelectBtn.isVisible()) {
      // Slow down the click for visual effect
      await firstSelectBtn.click({ delay: 500 });
    }

    // Wait for editor/customization panel to appear
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    /**
     * SCENE 4: Customize Business Information (2:00-3:30)
     */
    console.log('📹 SCENE 4: Customizing business information...');
    
    // Fill in business name
    const businessNameField = page.locator('[data-testid="business-name"], input[placeholder*="Business"], input[placeholder*="Name"]').first();
    if (await businessNameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Clear and fill slowly for visual effect
      await businessNameField.click();
      await businessNameField.fill('', { delay: 50 }); // Clear
      await page.waitForTimeout(500);
      
      await businessNameField.fill('Modern Italian Kitchen', { delay: 50 }); // Type slowly
      await page.waitForTimeout(1500); // Show the filled field
    }

    // Try to fill hero title
    const heroTitleField = page.locator('[data-testid="hero-title"], input[placeholder*="Hero"], input[placeholder*="Title"]').first();
    if (await heroTitleField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await heroTitleField.click();
      await heroTitleField.fill('', { delay: 50 });
      await page.waitForTimeout(500);
      
      await heroTitleField.fill('Authentic Italian Cuisine', { delay: 50 });
      await page.waitForTimeout(1500);
    }

    // Let the preview update
    await page.waitForTimeout(2000);

    /**
     * SCENE 5: Show the Preview (3:30-4:00)
     */
    console.log('📹 SCENE 5: Showing live preview...');
    
    // Scroll to show the preview if needed
    const previewFrame = page.locator('iframe[name*="preview"]').first();
    if (await previewFrame.isVisible({ timeout: 5000 }).catch(() => false)) {
      await previewFrame.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    /**
     * SCENE 6: Click Publish (4:00-4:30)
     */
    console.log('📹 SCENE 6: Publishing the site...');
    
    // Find and click publish button
    const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Launch"), button:has-text("Next")').first();
    if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.waitForTimeout(1000); // Pause before publishing
      await publishBtn.click({ delay: 500 });
    }

    // Wait for success page
    await page.waitForURL(/(success|published|dashboard)/, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    /**
     * SCENE 7: Show the Published Site (4:30-5:30)
     */
    console.log('📹 SCENE 7: Viewing the published site...');
    
    // Get the published site URL from the page
    const siteLink = page.locator('a[href*="sites/"], [data-testid*="published-link"]').first();
    if (await siteLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const siteUrl = await siteLink.getAttribute('href');
      
      if (siteUrl) {
        // Open in new tab to show the site
        const newPage = await context.newPage();
        await newPage.goto(`http://localhost:3000${siteUrl}`);
        await newPage.waitForLoadState('networkidle');
        await newPage.waitForTimeout(2000);

        // Scroll through the published site to show its contents
        await newPage.evaluate(() => {
          window.scrollBy({ top: 300, behavior: 'smooth' });
        });
        await newPage.waitForTimeout(1500);

        await newPage.evaluate(() => {
          window.scrollBy({ top: 300, behavior: 'smooth' });
        });
        await newPage.waitForTimeout(1500);

        await newPage.evaluate(() => {
          window.scrollBy({ top: 300, behavior: 'smooth' });
        });
        await newPage.waitForTimeout(2000);

        await newPage.close();
      }
    }

    /**
     * SCENE 8: Back to Dashboard (5:30-6:00)
     */
    console.log('📹 SCENE 8: Showing dashboard management...');
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Show the dashboard for a few seconds
    await page.evaluate(() => {
      window.scrollBy({ top: 200, behavior: 'smooth' });
    });
    await page.waitForTimeout(2000);

    /**
     * End of Demo
     */
    console.log('📹 Demo recording complete!');
    console.log('✅ Video has been recorded with your browser. Check the video output in ./test-results');
  });

  test.afterEach(async ({ page }) => {
    // Close page properly
    await page.close().catch(() => {});
  });
});



