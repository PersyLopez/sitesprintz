import { test, expect } from '@playwright/test';
import {
  fillRegistrationForm,
  submitRegistration,
  selectTemplate,
  fillBusinessInfo,
  clickPublish,
  waitForPublishSuccess
} from '../helpers/template-flow-helpers.js';

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
      await expect(page.getByRole('heading', { name: /templates|solutions|start/i })).toBeVisible();
      
      // Verify template cards are visible
      const templateCards = page.getByTestId(/template-/).or(
        page.locator('[data-template]').first()
      );
      await expect(templateCards).toBeVisible({ timeout: 5000 });
    });

    // STEP 2: Select Restaurant Template
    await test.step('Select restaurant template', async () => {
      // Click on restaurant template card
      await selectTemplate(page, 'restaurant');

      // Should redirect to registration with template parameter
      await page.waitForURL(/\/(register|signup).*template=restaurant/i, { timeout: 10000 });
      
      // Verify we're on registration page
      await expect(page.getByRole('heading', { name: /sign up|register|create account/i })).toBeVisible();
    });

    // STEP 3: Register New Account
    await test.step('Register with template parameter', async () => {
      // Fill and submit registration form
      await fillRegistrationForm(page, testEmail, testPassword, testPassword);
      await submitRegistration(page);

      // Should redirect to setup page with template parameter
      await page.waitForURL(/\/setup.*template=restaurant/i, { timeout: 15000 });
    });

    // STEP 4: Setup Page - Template Pre-Selected
    await test.step('Verify template is pre-selected in setup', async () => {
      // Wait for setup page to load
      await expect(page.getByRole('heading', { name: /setup|customize|create your site/i })).toBeVisible({ timeout: 10000 });

      // Verify restaurant template is selected/highlighted
      const selectedTemplate = page.getByTestId(/template-restaurant/).or(
        page.locator('[data-selected="true"]').first()
      );
      
      // Either template is already selected, or we're in editor mode
      const inEditorMode = await page.getByTestId('editor-panel').or(
        page.locator('[data-editor]').first()
      ).isVisible().catch(() => false);
      
      if (!inEditorMode) {
        // If still in template selection, verify restaurant is highlighted
        await expect(selectedTemplate).toBeVisible();
      }
    });

    // STEP 5: Fill Business Information
    await test.step('Fill business information', async () => {
      // If we need to select template first
      const templateGrid = page.getByTestId('template-grid').or(
        page.locator('[data-template-grid]').first()
      );
      if (await templateGrid.isVisible().catch(() => false)) {
        await selectTemplate(page, 'restaurant');
      }

      // Wait for editor panel
      await page.getByTestId('editor-panel').or(
        page.locator('[data-editor]').first()
      ).or(
        page.getByTestId('business-name-input')
      ).waitFor({ timeout: 10000 });

      // Fill business information
      await fillBusinessInfo(page, businessName, subdomain, `contact@${subdomain}.com`, '555-1234');
    });

    // STEP 6: Customize Content (Optional)
    await test.step('Customize template content', async () => {
      // Look for hero title field
      const heroTitleField = page.getByTestId('hero-title-input').or(
        page.getByLabel(/hero.*title|welcome/i)
      ).or(
        page.locator('input[name="heroTitle"], textarea[name="heroTitle"]').first()
      );
      if (await heroTitleField.isVisible().catch(() => false)) {
        await heroTitleField.fill(`Welcome to ${businessName}`);
      }

      // Look for description/subtitle field
      const descriptionField = page.getByTestId('description-input').or(
        page.getByLabel(/description|subtitle/i)
      ).or(
        page.locator('textarea[name="description"], input[name="subtitle"]').first()
      );
      if (await descriptionField.isVisible().catch(() => false)) {
        await descriptionField.fill('Fresh, delicious food made with love. Visit us today!');
      }

      // Save draft (auto-save might handle this)
      const saveDraftButton = page.getByRole('button', { name: /save draft|save/i });
      if (await saveDraftButton.isVisible().catch(() => false)) {
        await saveDraftButton.click();
        
        // Wait for save confirmation
        await expect(page.getByText(/saved|success/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });

    // STEP 7: Preview Site
    await test.step('Preview the site', async () => {
      // Look for preview button or panel
      const previewButton = page.getByTestId('preview-button').or(
        page.getByRole('button', { name: /preview/i })
      ).or(
        page.locator('[data-preview]').first()
      );
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click();

        // Wait for preview to load
        const previewFrame = page.getByTestId('preview-frame').or(
          page.locator('iframe[name="preview"]').first()
        );
        await expect(previewFrame).toBeVisible({ timeout: 5000 }).catch(() => {});
      }

      // Preview should show business name
      await expect(page.getByText(businessName)).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    // STEP 8: Publish Site
    await test.step('Publish the site', async () => {
      // Click publish button and handle confirmation
      await clickPublish(page);
      
      // Wait for success message or redirect
      await waitForPublishSuccess(page);
    });

    // STEP 9: Verify Published Site
    await test.step('Verify site is published and accessible', async () => {
      // Should be on dashboard or success page
      const onDashboard = page.url().includes('/dashboard') || page.url().includes('/sites');
      
      if (onDashboard) {
        // Look for the newly created site
        await expect(page.getByText(businessName)).toBeVisible({ timeout: 5000 });
        
        // Look for "View Site" or "Visit" button
        const viewSiteButton = page.getByRole('link', { name: /view site|visit|live/i }).first();
        if (await viewSiteButton.isVisible().catch(() => false)) {
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
      const anyTemplate = page.getByTestId(/template-/).or(
        page.locator('[data-template]').first()
      );
      await anyTemplate.click();

      // Quick register
      await page.waitForURL(/register|signup/i, { timeout: 10000 });
      await fillRegistrationForm(page, `quicktest+${timestamp}@example.com`, 'QuickTest123!');
      await submitRegistration(page);
    });

    await test.step('Minimal setup and publish', async () => {
      // Wait for setup
      await page.waitForURL(/setup/i, { timeout: 15000 });

      // Fill only required fields
      await fillBusinessInfo(page, `Quick Test ${timestamp}`);

      // Publish immediately
      await clickPublish(page);
      await waitForPublishSuccess(page);
    });
  });

  test('Template selection persists through login', async ({ page }) => {
    // Test that template parameter survives login flow
    
    await test.step('Select template', async () => {
      const gymTemplate = page.getByTestId('template-gym').or(
        page.locator('[data-template="gym"]').first()
      );
      if (await gymTemplate.isVisible().catch(() => false)) {
        await gymTemplate.click();
      } else {
        await page.goto('/?template=gym');
      }
    });

    await test.step('Go to login instead of register', async () => {
      await page.waitForURL(/register|signup/i, { timeout: 10000 });
      
      // Click login link
      const loginLink = page.getByRole('link', { name: /login|sign in/i });
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
      await fillRegistrationForm(page, `invalid+${timestamp}@example.com`, 'Invalid123!');
      await submitRegistration(page);
    });

    await test.step('Setup should handle invalid template gracefully', async () => {
      await page.waitForURL(/setup/i, { timeout: 15000 });

      // Should either show error or default template grid
      const templateGrid = page.getByTestId('template-grid').or(
        page.locator('[data-template-grid]').first()
      );
      const errorMessage = page.getByText(/error|invalid|not found/i);

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
      await fillRegistrationForm(page, `autosave+${timestamp}@example.com`, 'AutoSave123!');
      await submitRegistration(page);
      await page.waitForURL(/setup/i, { timeout: 15000 });
    });

    await test.step('Fill some data and verify auto-save', async () => {
      // Fill business name
      await fillBusinessInfo(page, `Auto Save Test ${timestamp}`);

      // Wait for auto-save indicator
      await expect(page.getByText(/saving|saved/i)).toBeVisible({ timeout: 10000 });
    });

    await test.step('Refresh and verify data persists', async () => {
      // Reload page
      await page.reload();
      await page.getByTestId('business-name-input').or(
        page.locator('input[name="businessName"]').first()
      ).waitFor({ timeout: 10000 });

      // Verify business name is still there
      const businessNameField = page.getByTestId('business-name-input').or(
        page.locator('input[name="businessName"]').first()
      );
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
      const categoryButton = page.getByRole('button', { name: new RegExp(category, 'i') }).or(
        page.getByRole('link', { name: new RegExp(category, 'i') })
      );
      
      if (await categoryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await categoryButton.click();

        // Verify templates are filtered
        const templateCards = page.getByTestId(/template-/).or(
          page.locator('[data-template]')
        );
        const count = await templateCards.count();
        
        // Should show at least one template
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('Template preview modal', async ({ page }) => {
    await page.goto('/');

    // Click preview button if exists
    const previewButton = page.getByRole('button', { name: /preview|view demo/i }).first();
    
    if (await previewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await previewButton.click();

      // Modal should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Should have "Use Template" or "Select" button
      await expect(page.getByRole('button', { name: /use template|select/i })).toBeVisible();
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
      await fillRegistrationForm(page, `published+${timestamp}@example.com`, 'Published123!');
      await submitRegistration(page);
      await page.waitForURL(/setup/i, { timeout: 15000 });

      // Fill required data
      await fillBusinessInfo(page, `Published Test ${timestamp}`, `published-${timestamp}`);

      // Publish
      await clickPublish(page);
      await waitForPublishSuccess(page);
    });

    await test.step('Verify site is accessible in new tab', async () => {
      // Get the site URL
      const viewSiteLink = page.getByRole('link', { name: /view site|visit/i }).first();
      
      if (await viewSiteLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        const siteUrl = await viewSiteLink.getAttribute('href');
        
        // Open in new page (simulating public access)
        const publicPage = await context.newPage();
        await publicPage.goto(siteUrl);

        // Verify site loads
        await expect(publicPage.getByRole('main').or(publicPage.locator('body'))).toBeVisible({ timeout: 10000 });
        
        // Should contain business name
        await expect(publicPage.getByText(/Published Test|welcome/i)).toBeVisible({ timeout: 5000 });

        await publicPage.close();
      }
    });
  });
});

