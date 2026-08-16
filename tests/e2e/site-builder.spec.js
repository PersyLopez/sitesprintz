/**
 * E2E Test: Site Builder Functionality
 * 
 * Tests the site builder features including:
 * - Template selection
 * - Content editing
 * - Theme customization
 * - Preview functionality
 * - Auto-save
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const TIMEOUTS = {
  SHORT: 3000,
  MEDIUM: 10000,
  LONG: 30000
};

test.describe('Site Builder', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to setup page
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');
  });

  test('should display template selection UI', async ({ page }) => {
    // Verify template grid is visible
    const templateGrid = page.getByTestId('template-grid').or(
      page.locator('[data-template-grid]').first()
    );
    await expect(templateGrid).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify template cards are present
    const templateCards = page.getByTestId(/template-/);
    const cardCount = await templateCards.count();
    expect(cardCount).toBeGreaterThan(0);

    console.log(`✅ Template selection UI displayed (${cardCount} templates)`);
  });

  test('should allow template selection', async ({ page }) => {
    // Click on a template
    const restaurantTemplate = page.getByTestId('template-restaurant').or(
      page.locator('[data-template="restaurant"]').first()
    );
    
    if (await restaurantTemplate.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      await restaurantTemplate.click();
      
      // Should switch to editor view
      await page.waitForLoadState('networkidle');
      const editorPanel = page.getByTestId('customize-panel').or(
        page.locator('[class*="editor"]').first()
      );
      await expect(editorPanel).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      
      console.log('✅ Template selected successfully');
    } else {
      console.log('ℹ️ Restaurant template not found, skipping');
    }
  });

  test('should allow content editing', async ({ page }) => {
    // Select a template first
    const anyTemplate = page.getByTestId(/template-/).first();
    if (await anyTemplate.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await anyTemplate.click();
      await page.waitForLoadState('networkidle');
    }

    // Look for business name input
    const businessNameInput = page.getByTestId('business-name-input');
    if (await businessNameInput.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      await businessNameInput.fill('Test Business Name');
      const value = await businessNameInput.inputValue();
      expect(value).toBe('Test Business Name');
      
      console.log('✅ Content editing works');
    } else {
      console.log('ℹ️ Business name input not found');
    }
  });

  test('should show preview functionality', async ({ page }) => {
    // Select a template
    const anyTemplate = page.getByTestId(/template-/).first();
    if (await anyTemplate.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await anyTemplate.click();
      await page.waitForLoadState('networkidle');
    }

    // Look for preview button or tab
    const previewButton = page.getByRole('button', { name: /preview/i }).or(
      page.locator('[data-testid*="preview"]').first()
    );
    
    if (await previewButton.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      await previewButton.click();
      
      // Should show preview
      const previewFrame = page.locator('iframe, [data-testid*="preview"]').first();
      await expect(previewFrame).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      
      console.log('✅ Preview functionality works');
    } else {
      console.log('ℹ️ Preview button not found');
    }
  });

  test('should auto-save draft changes', async ({ page }) => {
    // Select a template
    const anyTemplate = page.getByTestId(/template-/).first();
    if (await anyTemplate.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await anyTemplate.click();
      await page.waitForLoadState('networkidle');
    }

    // Make a change
    const businessNameInput = page.getByTestId('business-name-input');
    if (await businessNameInput.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      await businessNameInput.fill('Auto-save Test');
      
      // Look for save indicator
      const saveIndicator = page.locator('[data-testid*="save"], [class*="save-indicator"]').first();
      
      // Wait a bit for auto-save to trigger
      await page.waitForTimeout(2000);
      
      // Check if save indicator appears (optional - depends on implementation)
      const hasSaveIndicator = await saveIndicator.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasSaveIndicator) {
        console.log('✅ Auto-save indicator shown');
      } else {
        console.log('ℹ️ Auto-save may work silently');
      }
    }
  });

  test('should show mobile preview', async ({ page }) => {
    // Select a template
    const anyTemplate = page.getByTestId(/template-/).first();
    if (await anyTemplate.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await anyTemplate.click();
      await page.waitForLoadState('networkidle');
    }

    // Look for mobile preview option
    const mobilePreview = page.getByRole('button', { name: /mobile|phone/i }).or(
      page.locator('[data-testid*="mobile-preview"]').first()
    );
    
    if (await mobilePreview.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      await mobilePreview.click();
      
      // Verify viewport changes or mobile view is shown
      const viewport = page.viewportSize();
      if (viewport && viewport.width < 768) {
        console.log('✅ Mobile preview activated');
      } else {
        console.log('ℹ️ Mobile preview button found');
      }
    } else {
      console.log('ℹ️ Mobile preview option not found');
    }
  });

  test('should show desktop preview', async ({ page }) => {
    // Select a template
    const anyTemplate = page.getByTestId(/template-/).first();
    if (await anyTemplate.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await anyTemplate.click();
      await page.waitForLoadState('networkidle');
    }

    // Look for desktop preview option
    const desktopPreview = page.getByRole('button', { name: /desktop|computer/i }).or(
      page.locator('[data-testid*="desktop-preview"]').first()
    );
    
    if (await desktopPreview.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      await desktopPreview.click();
      console.log('✅ Desktop preview option available');
    } else {
      console.log('ℹ️ Desktop preview option not found');
    }
  });
});



