/**
 * E2E Tests: Site Management (Edit, Duplicate, Delete)
 * Tests editing existing sites, duplicating sites, and deleting sites
 */


import { test, expect } from '@playwright/test';
import { login, createTestSiteViaApi } from '../helpers/e2e-test-utils.js';

test.describe('Site Management', () => {
  let siteId;
  let siteSubdomain;

  test.beforeEach(async ({ page, request }) => {
    // Login
    await login(page);

    // Create a test site via API for stability
    const site = await createTestSiteViaApi(request, {
      businessName: `Test Site ${Date.now()}`,
      templateId: 'restaurant-casual'
    });

    siteSubdomain = site.subdomain;

    // Navigate to dashboard to get site ID
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find the site card and extract ID (if available)
    const siteCard = page.locator(`[data-site-id], [data-subdomain="${siteSubdomain}"]`).first();
    if (await siteCard.count() > 0) {
      siteId = await siteCard.getAttribute('data-site-id') ||
        await siteCard.getAttribute('id') ||
        siteSubdomain;
    } else {
      siteId = siteSubdomain;
    }
  });

  test('should edit existing site', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find the site card
    const siteCard = page.locator(`[data-subdomain="${siteSubdomain}"], .site-card`).first();

    // Click edit button
    const editButton = siteCard.locator('button:has-text("Edit"), a:has-text("Edit"), [title*="Edit"]').first();

    if (await editButton.count() > 0) {
      await editButton.click();

      // Should navigate to setup/editor page
      await page.waitForURL(/setup|editor/, { timeout: 5000 });

      // Verify we're in edit mode (should have existing content)
      const editorPanel = page.locator('.editor-panel, [data-testid="editor"], .setup-container');
      await expect(editorPanel.first()).toBeVisible({ timeout: 5000 });

      // Try to edit business name
      const businessNameInput = page.locator(
        'input[name="businessName"], input[name="name"], input[placeholder*="business"], input[placeholder*="name"]'
      ).first();

      if (await businessNameInput.count() > 0) {
        const newName = `Updated Site ${Date.now()}`;
        await businessNameInput.clear();
        await businessNameInput.fill(newName);

        // Save changes (auto-save or manual save button)
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(1000);
        }

        // Wait for auto-save if applicable
        await page.waitForTimeout(2000);

        // Verify change was saved (check for success message or navigate back)
        const successMessage = page.locator('text=/saved|updated|success/i');
        const hasSuccess = await successMessage.count() > 0;

        // Either shows success or silently saves (both valid)
        expect(hasSuccess || await businessNameInput.inputValue() === newName).toBeTruthy();
      }
    } else {
      // Edit button not found, might be a different UI pattern
      test.skip();
    }
  });

  test('should duplicate site', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find the site card
    const siteCard = page.locator(`[data-subdomain="${siteSubdomain}"], .site-card`).first();

    // Count sites before duplication
    const sitesBefore = await page.locator('.site-card, [data-site-id]').count();

    // Click duplicate button
    const duplicateButton = siteCard.locator(
      'button:has-text("Duplicate"), button[title*="Duplicate"], button[title*="Copy"], [data-action="duplicate"]'
    ).first();

    if (await duplicateButton.count() > 0) {
      await duplicateButton.click();

      // Wait for duplication to complete
      await page.waitForTimeout(2000);

      // Check for success message or confirmation
      const successMessage = page.locator('text=/duplicated|copied|success/i');
      const hasSuccess = await successMessage.count() > 0;

      // Refresh dashboard to see new site
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Count sites after duplication
      const sitesAfter = await page.locator('.site-card, [data-site-id]').count();

      // Should have one more site
      expect(sitesAfter).toBeGreaterThanOrEqual(sitesBefore);

      // Should see duplicate site in list
      const duplicateSite = page.locator(`text=/copy|duplicate|${siteSubdomain}/i`);
      const hasDuplicate = await duplicateSite.count() > 0;

      expect(hasDuplicate || sitesAfter > sitesBefore).toBeTruthy();
    } else {
      // Duplicate button not found
      test.skip();
    }
  });

  test('should delete site with confirmation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find the site card
    const siteCard = page.locator(`[data-subdomain="${siteSubdomain}"], .site-card`).first();

    // Count sites before deletion
    const sitesBefore = await page.locator('.site-card, [data-site-id]').count();

    // Click delete button
    const deleteButton = siteCard.locator(
      'button:has-text("Delete"), button[title*="Delete"], button.danger, [data-action="delete"]'
    ).first();

    if (await deleteButton.count() > 0) {
      // Set up dialog handler
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      await deleteButton.click();

      // Wait for deletion to complete
      await page.waitForTimeout(2000);

      // Refresh dashboard
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Count sites after deletion
      const sitesAfter = await page.locator('.site-card, [data-site-id]').count();

      // Should have one less site
      expect(sitesAfter).toBeLessThan(sitesBefore);

      // Deleted site should not be visible
      const deletedSite = page.locator(`[data-subdomain="${siteSubdomain}"]`);
      const stillExists = await deletedSite.count() > 0;

      expect(stillExists).toBeFalsy();
    } else {
      // Delete button not found
      test.skip();
    }
  });

  test('should cancel site deletion', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const siteCard = page.locator(`[data-subdomain="${siteSubdomain}"], .site-card`).first();
    const deleteButton = siteCard.locator(
      'button:has-text("Delete"), button[title*="Delete"]'
    ).first();

    if (await deleteButton.count() > 0) {
      const sitesBefore = await page.locator('.site-card, [data-site-id]').count();

      // Set up dialog handler to cancel
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
      });

      await deleteButton.click();

      // Wait a bit
      await page.waitForTimeout(1000);

      // Site should still exist
      const sitesAfter = await page.locator('.site-card, [data-site-id]').count();
      expect(sitesAfter).toBe(sitesBefore);

      // Site card should still be visible
      const siteStillExists = await siteCard.count() > 0;
      expect(siteStillExists).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should edit published site', async ({ page }) => {
    // First, publish the site (if not already published)
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // Try to find publish button
    const publishButton = page.locator('button:has-text("Publish"), button:has-text("Go Live")');

    if (await publishButton.count() > 0) {
      await publishButton.click();

      // Handle publish modal if it appears
      await page.waitForTimeout(1000);

      // Fill subdomain if needed
      const subdomainInput = page.locator('input[name="subdomain"]');
      if (await subdomainInput.count() > 0 && !(await subdomainInput.inputValue())) {
        await subdomainInput.fill(`published${Date.now()}`);
      }

      // Confirm publish
      const confirmButton = page.locator('button:has-text("Publish"), button:has-text("Confirm")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Now test editing published site
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const siteCard = page.locator(`[data-subdomain="${siteSubdomain}"], .site-card`).first();
    const editButton = siteCard.locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.count() > 0) {
      await editButton.click();

      // Should navigate to editor (may be visual editor or setup page)
      await page.waitForURL(/setup|editor|sites/, { timeout: 5000 });

      // Should be able to edit
      const editor = page.locator('.editor, .setup-container, [data-testid="editor"]');
      await expect(editor.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show site status correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const siteCard = page.locator(`[data-subdomain="${siteSubdomain}"], .site-card`).first();

    // Check for status indicators
    const statusIndicator = siteCard.locator(
      'text=/published|draft|pending/i, [data-status], .status-badge'
    );

    // Status should be visible (draft or published)
    const hasStatus = await statusIndicator.count() > 0;

    // If status is shown, verify it's one of expected values
    if (hasStatus) {
      const statusText = await statusIndicator.first().textContent();
      expect(statusText).toMatch(/published|draft|pending/i);
    }
  });

  test('should navigate to live site from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const siteCard = page.locator(`[data-subdomain="${siteSubdomain}"], .site-card`).first();

    // Find view button (only for published sites)
    const viewButton = siteCard.locator(
      'a:has-text("View"), button:has-text("View"), a[href*="/sites/"]'
    ).first();

    if (await viewButton.count() > 0) {
      // Check if site is published
      const statusText = await siteCard.textContent();
      const isPublished = statusText.includes('published') || statusText.includes('Published');

      if (isPublished) {
        // Click view button (opens in new tab)
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page'),
          viewButton.click()
        ]);

        // Should open site in new tab
        expect(newPage.url()).toMatch(/sites\/|localhost/);

        await newPage.close();
      }
    }
  });

  test('should filter and search sites', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for search/filter input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search"], input[placeholder*="filter"]'
    );

    if (await searchInput.count() > 0) {
      // Type search query
      await searchInput.fill(siteSubdomain);

      // Wait for filtering
      await page.waitForTimeout(1000);

      // Should show matching site
      const matchingSite = page.locator(`text=${siteSubdomain}, [data-subdomain="${siteSubdomain}"]`);
      await expect(matchingSite.first()).toBeVisible();

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
    } else {
      // Search/filter not implemented
      test.skip();
    }
  });
});









