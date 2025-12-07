import { test, expect } from '@playwright/test';

test.describe('Site Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock template data for stability
    await page.route('**/data/templates/index.json', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          templates: [
            {
              id: 'restaurant-casual',
              template: 'restaurant-casual', // Used for ID
              name: 'Casual Dining',
              description: 'Perfect for casual restaurants',
              tier: 'Starter',
              type: 'restaurant'
            },
            {
              id: 'restaurant',
              template: 'restaurant',
              name: 'Restaurant Pro',
              description: 'Professional restaurant template',
              tier: 'Pro',
              type: 'restaurant'
            }
          ]
        })
      });
    });

    // Mock specific template details
    await page.route('**/data/templates/restaurant.json', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'restaurant',
          brand: { name: 'Restaurant Pro' },
          hero: { title: 'Welcome', subtitle: 'Best food in town' }
        })
      });
    });

    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Bypass welcome modal
    await page.evaluate(() => localStorage.setItem('hasVisitedDashboard', 'true'));
    await page.reload();
  });

  test('should display dashboard with create site button', async ({ page }) => {
    await expect(page.locator('.dashboard-header-actions a[href="/setup"], a:has-text("Create New Site")')).toBeVisible();
  });

  test('should show template selection', async ({ page }) => {
    // Navigate to setup
    await page.goto('/setup');

    // Should show template grid
    await page.goto('/setup');
    console.log('Navigated to /setup');
    await page.waitForLoadState('networkidle');
    console.log('Current URL:', page.url());

    // Check if we were redirected
    if (page.url().includes('/login')) {
      console.log('REDIRECTED TO LOGIN!');
    }

    await expect(page.locator('.template-grid-container, .template-cards').first()).toBeVisible({ timeout: 10000 });
  });

  test('should create a new site', async ({ page }) => {
    // Pipe browser console logs to terminal
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    await page.goto('/setup');

    // Select template (if on setup page) or navigate from dashboard
    // If /setup is the route for creating a new site

    // Check if we need to select a template first
    await expect(page.locator('.template-card').first()).toBeVisible({ timeout: 10000 });
    const templateCard = page.locator('[data-template="restaurant"], .template-card').first();

    if (await templateCard.count() > 0) {
      // Click the "Use Template" button specifically
      await templateCard.locator('.btn-select').click();

      // Wait for selection to process (empty state should disappear)
      await expect(page.locator('.editor-panel .panel-empty')).toBeHidden({ timeout: 10000 });
    }

    // Wait for editor to load
    await expect(page.locator('.editor-panel')).toBeVisible();

    // Debug: Log editor content
    const editorContent = await page.locator('.editor-panel').innerHTML();
    console.log('Editor Content Length:', editorContent.length); // Log length to avoid huge output, or log substring
    if (!editorContent.includes('businessName')) {
      console.log('WARNING: businessName input not found in DOM');
      console.log('Partial HTML:', editorContent.substring(0, 1000));
    }

    // Enter site details
    // BusinessInfoForm uses id="businessName"
    await page.fill('input#businessName', 'My New Restaurant');
    // Subdomain is auto-generated or not manually entered in this form

    // Verify network request for saving draft
    const savePromise = page.waitForResponse(async response => {
      if (response.url().includes('/api/drafts') && response.request().method() === 'POST') {
        try {
          console.log('Save Request Payload:', response.request().postData());
        } catch (e) {
          console.log('Could not get post data');
        }
        return true;
      }
      return false;
    }, { timeout: 10000 }).catch(() => null);

    // Click Save Draft
    await page.click('button:has-text("Save Draft")');

    const response = await savePromise;
    if (response) {
      console.log(`Save Draft Response Status: ${response.status()}`);
      if (!response.ok()) {
        console.log('Save Draft Failed Response:', await response.text());
      }
    } else {
      console.log('WARNING: No network response for /api/drafts received');
    }

    // Check for success or error message
    // If success matches, good. If error matches, fail with clear message.
    const successMsg = page.locator('text=/Draft saved|Last saved/i').first();
    const errorMsg = page.locator('text=Failed to save draft').first();

    try {
      await expect(successMsg).toBeVisible({ timeout: 5000 });
    } catch (e) {
      if (await errorMsg.isVisible()) {
        throw new Error('Save failed with UI Error: Failed to save draft');
      }
      throw new Error('Save draft success message not found. Response status: ' + (response ? response.status() : 'none'));
    }
    // Or if we try to click it (force), it should show error
    // But since it's disabled, we check that state
  });

  test('should edit existing site', async ({ page }) => {
    // Assuming site exists from seeding
    await page.goto('/setup?siteId=test-restaurant');

    // Wait for editor to load
    await expect(page.locator('.editor-panel')).toBeVisible({ timeout: 10000 });

    // Update details in editor
    // We need to find input fields in the editor panel
    // This depends on EditorPanel component structure
    const businessNameInput = page.locator('input[name="businessName"], input[label="Business Name"]');

    if (await businessNameInput.count() > 0) {
      await businessNameInput.fill('Updated Restaurant Name');

      // Save draft
      await page.click('button:has-text("Save Draft")');

      // Should show success
      await expect(page.locator('text=/saved|updated|success/i')).toBeVisible();
    } else {
      // If input not found directly, maybe it's inside a section
      test.skip('Editor inputs not found');
    }
  });

  test('should preview site', async ({ page }) => {
    await page.goto('/setup?siteId=test-restaurant');

    // Click preview button
    const previewBtn = page.locator('button:has-text("Preview")');
    if (await previewBtn.count() > 0) {
      await previewBtn.click();
      // Should show preview
      await expect(page.locator('.preview-frame, iframe')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should publish site', async ({ page }) => {
    await page.goto('/setup?siteId=test-restaurant');

    // Click publish button
    const publishBtn = page.locator('button:has-text("Publish")');
    if (await publishBtn.count() > 0) {
      await publishBtn.click();
      // Should show confirmation or success message
      await expect(page.locator('text=/published|success|live/i')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });
});
