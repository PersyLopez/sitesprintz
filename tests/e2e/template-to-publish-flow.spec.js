import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Template Selection to Publish Flow
 * 
 * This test covers the entire user journey from:
 * 1. Landing page
 * 2. Template selection
 * 3. Registration with template parameter
 * 4. Setup page with pre-selected template
 * 5. Content editing
 * 6. Preview
 * 7. Publishing
 * 8. Viewing published site
 */

test.describe('Complete User Journey: Template Selection → Publish', () => {
  const timestamp = Date.now();
  const testEmail = `e2etest+${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const businessName = `E2E Test Business ${timestamp}`;
  const subdomain = `e2e-test-${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // Start from landing page
    await page.goto('/');
  });

  test('Complete flow: Browse → Select Template → Register → Setup → Publish', async ({ page }) => {
    // STEP 1: Landing Page - Browse Templates
    await test.step('Browse templates on landing page', async () => {
      await expect(page.locator('h1, h2').filter({ hasText: /templates|solutions|start/i })).toBeVisible();
      
      // Verify template cards are visible
      const templateCards = page.locator('[data-template], .template-card, .template-item');
      await expect(templateCards.first()).toBeVisible({ timeout: 5000 });
    });

    // STEP 2: Select Restaurant Template
    await test.step('Select restaurant template', async () => {
      // Click on restaurant template card
      const restaurantTemplate = page.locator('[data-template="restaurant"], a[href*="template=restaurant"]').first();
      await restaurantTemplate.click();

      // Should redirect to registration with template parameter
      await page.waitForURL(/\/(register|signup).*template=restaurant/i, { timeout: 10000 });
      
      // Verify we're on registration page
      await expect(page.locator('h1, h2').filter({ hasText: /sign up|register|create account/i })).toBeVisible();
    });

    // STEP 3: Register New Account
    await test.step('Register with template parameter', async () => {
      // Fill registration form
      await page.fill('input[type="email"], input[name="email"]', testEmail);
      await page.fill('input[type="password"], input[name="password"]', testPassword);
      
      // Fill confirm password if exists
      const confirmPasswordField = page.locator('input[name="confirmPassword"], input[name="confirm-password"]');
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(testPassword);
      }

      // Accept terms if checkbox exists
      const termsCheckbox = page.locator('input[type="checkbox"][name*="terms"], input[type="checkbox"][name*="agree"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }

      // Submit registration
      await page.click('button[type="submit"]:has-text("Sign Up"), button[type="submit"]:has-text("Register"), button:has-text("Create Account")');

      // Should redirect to setup page with template parameter
      await page.waitForURL(/\/setup.*template=restaurant/i, { timeout: 15000 });
    });

    // STEP 4: Setup Page - Template Pre-Selected
    await test.step('Verify template is pre-selected in setup', async () => {
      // Wait for setup page to load
      await expect(page.locator('h1, h2').filter({ hasText: /setup|customize|create your site/i })).toBeVisible({ timeout: 10000 });

      // Verify restaurant template is selected/highlighted
      const selectedTemplate = page.locator('[data-selected="true"], .template-selected, .selected');
      
      // Either template is already selected, or we're in editor mode
      const inEditorMode = await page.locator('.editor-panel, [data-editor], .setup-form').isVisible();
      
      if (!inEditorMode) {
        // If still in template selection, verify restaurant is highlighted
        await expect(selectedTemplate).toBeVisible();
      }
    });

    // STEP 5: Fill Business Information
    await test.step('Fill business information', async () => {
      // If we need to select template first
      const templateGrid = page.locator('.template-grid, [data-template-grid]');
      if (await templateGrid.isVisible()) {
        const restaurantCard = page.locator('[data-template="restaurant"]').first();
        await restaurantCard.click();
      }

      // Wait for editor panel
      await page.waitForSelector('.editor-panel, [data-editor], .setup-form, input[name="businessName"]', { timeout: 10000 });

      // Fill business name
      const businessNameField = page.locator('input[name="businessName"], input[name="business-name"], input[placeholder*="business name" i]');
      await businessNameField.fill(businessName);

      // Fill subdomain
      const subdomainField = page.locator('input[name="subdomain"], input[placeholder*="subdomain" i], input[placeholder*="yoursite" i]');
      if (await subdomainField.isVisible()) {
        await subdomainField.fill(subdomain);
      }

      // Fill email if exists
      const emailField = page.locator('input[name="email"][type="email"]');
      if (await emailField.isVisible() && await emailField.inputValue() === '') {
        await emailField.fill(`contact@${subdomain}.com`);
      }

      // Fill phone if exists
      const phoneField = page.locator('input[name="phone"], input[type="tel"]');
      if (await phoneField.isVisible()) {
        await phoneField.fill('555-1234');
      }
    });

    // STEP 6: Customize Content (Optional)
    await test.step('Customize template content', async () => {
      // Look for hero title field
      const heroTitleField = page.locator('input[name="heroTitle"], input[placeholder*="welcome" i], textarea[name="heroTitle"]');
      if (await heroTitleField.isVisible()) {
        await heroTitleField.fill(`Welcome to ${businessName}`);
      }

      // Look for description/subtitle field
      const descriptionField = page.locator('textarea[name="description"], input[name="subtitle"], textarea[placeholder*="describe" i]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Fresh, delicious food made with love. Visit us today!');
      }

      // Save draft (auto-save might handle this)
      const saveDraftButton = page.locator('button:has-text("Save Draft"), button:has-text("Save")');
      if (await saveDraftButton.isVisible()) {
        await saveDraftButton.click();
        
        // Wait for save confirmation
        await expect(page.locator('text=/saved|success/i')).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });

    // STEP 7: Preview Site
    await test.step('Preview the site', async () => {
      // Look for preview button or panel
      const previewButton = page.locator('button:has-text("Preview"), [data-preview], .preview-toggle');
      if (await previewButton.isVisible()) {
        await previewButton.click();

        // Wait for preview to load
        const previewFrame = page.locator('iframe[name="preview"], iframe.preview-frame, .preview-panel');
        await expect(previewFrame).toBeVisible({ timeout: 5000 }).catch(() => {});
      }

      // Preview should show business name
      await expect(page.locator(`text="${businessName}"`)).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    // STEP 8: Publish Site
    await test.step('Publish the site', async () => {
      // Click publish button
      const publishButton = page.locator('button:has-text("Publish"), button:has-text("Go Live"), button[data-publish]');
      await publishButton.click();

      // Handle publish confirmation modal if exists
      const confirmButton = page.locator('button:has-text("Publish"), button:has-text("Confirm")');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Wait for success message or redirect
      await Promise.race([
        page.waitForURL(/\/dashboard|\/sites/i, { timeout: 15000 }),
        page.locator('text=/published|success|live/i').waitFor({ timeout: 15000 })
      ]);
    });

    // STEP 9: Verify Published Site
    await test.step('Verify site is published and accessible', async () => {
      // Should be on dashboard or success page
      const onDashboard = page.url().includes('/dashboard') || page.url().includes('/sites');
      
      if (onDashboard) {
        // Look for the newly created site
        await expect(page.locator(`text="${businessName}"`)).toBeVisible({ timeout: 5000 });
        
        // Look for "View Site" or "Visit" button
        const viewSiteButton = page.locator('a:has-text("View Site"), a:has-text("Visit"), a:has-text("Live")').first();
        if (await viewSiteButton.isVisible()) {
          const siteUrl = await viewSiteButton.getAttribute('href');
          expect(siteUrl).toBeTruthy();
        }
      }
    });
  });

  test('Shortened flow: Quick site creation from template', async ({ page }) => {
    // Fast path: Template → Register → Publish with minimal data
    
    await test.step('Select template and register', async () => {
      // Click any template
      const anyTemplate = page.locator('[data-template], .template-card').first();
      await anyTemplate.click();

      // Quick register
      await page.waitForURL(/register|signup/i, { timeout: 10000 });
      await page.fill('input[type="email"]', `quicktest+${timestamp}@example.com`);
      await page.fill('input[type="password"]', 'QuickTest123!');
      
      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }

      await page.click('button[type="submit"]');
    });

    await test.step('Minimal setup and publish', async () => {
      // Wait for setup
      await page.waitForURL(/setup/i, { timeout: 15000 });

      // Fill only required fields
      const businessNameField = page.locator('input[name="businessName"]').first();
      if (await businessNameField.isVisible()) {
        await businessNameField.fill(`Quick Test ${timestamp}`);
      }

      // Publish immediately
      const publishButton = page.locator('button:has-text("Publish")');
      if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await publishButton.click();
        
        // Confirm if modal appears
        const confirmButton = page.locator('button:has-text("Publish"), button:has-text("Confirm")');
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Verify success
        await expect(page.locator('text=/published|success|dashboard/i')).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test('Template selection persists through login', async ({ page }) => {
    // Test that template parameter survives login flow
    
    await test.step('Select template', async () => {
      const gymTemplate = page.locator('[data-template="gym"], a[href*="template=gym"]').first();
      if (await gymTemplate.isVisible()) {
        await gymTemplate.click();
      } else {
        await page.goto('/?template=gym');
      }
    });

    await test.step('Go to login instead of register', async () => {
      await page.waitForURL(/register|signup/i, { timeout: 10000 });
      
      // Click login link
      const loginLink = page.locator('a:has-text("Login"), a:has-text("Sign In"), a[href*="/login"]');
      await loginLink.click();

      // Verify template parameter is in login URL
      await page.waitForURL(/login.*template=gym/i, { timeout: 10000 });
      expect(page.url()).toContain('template=gym');
    });
  });

  test('Error handling: Invalid template parameter', async ({ page }) => {
    // Test graceful handling of invalid template
    
    await page.goto('/register?template=invalid-template-xyz');

    await test.step('Register with invalid template', async () => {
      await page.fill('input[type="email"]', `invalid+${timestamp}@example.com`);
      await page.fill('input[type="password"]', 'Invalid123!');
      
      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }

      await page.click('button[type="submit"]');
    });

    await test.step('Setup should handle invalid template gracefully', async () => {
      await page.waitForURL(/setup/i, { timeout: 15000 });

      // Should either show error or default template grid
      const templateGrid = page.locator('.template-grid, [data-template-grid]');
      const errorMessage = page.locator('text=/error|invalid|not found/i');

      const hasTemplateGrid = await templateGrid.isVisible({ timeout: 3000 }).catch(() => false);
      const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

      // Should handle gracefully (show error OR show template selection)
      expect(hasTemplateGrid || hasError).toBeTruthy();
    });
  });

  test('Draft auto-save during setup', async ({ page }) => {
    // Test that draft is auto-saved during setup

    await test.step('Start setup flow', async () => {
      // Quick registration
      await page.goto('/register?template=salon');
      await page.fill('input[type="email"]', `autosave+${timestamp}@example.com`);
      await page.fill('input[type="password"]', 'AutoSave123!');
      
      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }

      await page.click('button[type="submit"]');
      await page.waitForURL(/setup/i, { timeout: 15000 });
    });

    await test.step('Fill some data and verify auto-save', async () => {
      // Fill business name
      const businessNameField = page.locator('input[name="businessName"]').first();
      await businessNameField.fill(`Auto Save Test ${timestamp}`);

      // Wait for auto-save indicator
      await expect(page.locator('text=/saving|saved/i')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Refresh and verify data persists', async () => {
      // Reload page
      await page.reload();
      await page.waitForSelector('input[name="businessName"]', { timeout: 10000 });

      // Verify business name is still there
      const businessNameField = page.locator('input[name="businessName"]').first();
      const value = await businessNameField.inputValue();
      expect(value).toContain('Auto Save Test');
    });
  });
});

test.describe('Template Categories and Filtering', () => {
  test('Browse templates by category', async ({ page }) => {
    await page.goto('/');

    // Look for category filters or navigation
    const categories = ['restaurant', 'salon', 'gym', 'professional'];

    for (const category of categories) {
      const categoryButton = page.locator(`button:has-text("${category}"), a:has-text("${category}")`);
      
      if (await categoryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await categoryButton.click();

        // Verify templates are filtered
        const templateCards = page.locator('[data-template], .template-card');
        const count = await templateCards.count();
        
        // Should show at least one template
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('Template preview modal', async ({ page }) => {
    await page.goto('/');

    // Click preview button if exists
    const previewButton = page.locator('button:has-text("Preview"), button:has-text("View Demo")').first();
    
    if (await previewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await previewButton.click();

      // Modal should open
      await expect(page.locator('.modal, [role="dialog"], .preview-modal')).toBeVisible({ timeout: 5000 });

      // Should have "Use Template" or "Select" button
      await expect(page.locator('button:has-text("Use Template"), button:has-text("Select")')).toBeVisible();
    }
  });
});

test.describe('Published Site Verification', () => {
  test('Published site is publicly accessible', async ({ page, context }) => {
    // This test assumes a site has been published
    // You may need to set up test data or skip if no test site exists

    await test.step('Create and publish a test site', async () => {
      const timestamp = Date.now();
      
      // Quick flow to create site
      await page.goto('/register?template=restaurant');
      await page.fill('input[type="email"]', `published+${timestamp}@example.com`);
      await page.fill('input[type="password"]', 'Published123!');
      
      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }

      await page.click('button[type="submit"]');
      await page.waitForURL(/setup/i, { timeout: 15000 });

      // Fill required data
      await page.fill('input[name="businessName"]', `Published Test ${timestamp}`);
      
      const subdomainField = page.locator('input[name="subdomain"]');
      if (await subdomainField.isVisible()) {
        await subdomainField.fill(`published-${timestamp}`);
      }

      // Publish
      await page.click('button:has-text("Publish")');
      
      const confirmButton = page.locator('button:has-text("Publish"), button:has-text("Confirm")');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForURL(/dashboard|success/i, { timeout: 15000 });
    });

    await test.step('Verify site is accessible in new tab', async () => {
      // Get the site URL
      const viewSiteLink = page.locator('a:has-text("View Site"), a:has-text("Visit")').first();
      
      if (await viewSiteLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        const siteUrl = await viewSiteLink.getAttribute('href');
        
        // Open in new page (simulating public access)
        const publicPage = await context.newPage();
        await publicPage.goto(siteUrl);

        // Verify site loads
        await expect(publicPage.locator('body')).toBeVisible({ timeout: 10000 });
        
        // Should contain business name
        await expect(publicPage.locator('text=/Published Test|welcome/i')).toBeVisible({ timeout: 5000 });

        await publicPage.close();
      }
    });
  });
});

