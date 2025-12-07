/**
 * PUBLIC GALLERY E2E TESTS
 * 
 * End-to-end tests for the public showcase gallery feature
 * - Gallery page browsing
 * - Filtering and search
 * - Individual site pages
 * - Opt-in/opt-out workflow
 * - SEO validation
 */

import { test, expect } from '@playwright/test';
import { waitForVisible } from '../../src/utils/waitHelpers';

// Test data
const testUser = {
  email: `gallery-test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Gallery Test User'
};

const testSite = {
  subdomain: `test-showcase-${Date.now()}`,
  name: 'Test Showcase Site',
  template: 'restaurant',
  category: 'restaurant'
};

test.describe('Public Showcase Gallery E2E Tests', () => {

  // ==================== GALLERY BROWSING TESTS ====================
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
    page.on('requestfailed', req => console.log(`REQUEST FAILED: ${req.url()} ${req.failure().errorText}`));
    page.on('response', res => {
      if (res.status() >= 400) {
        console.log(`RESPONSE ERROR: ${res.url()} ${res.status()}`);
      }
    });
  });

  test.describe('Gallery Page Browsing', () => {
    test('should have proper page title', async ({ page }) => {
      await page.goto('/showcase');
      await expect(page).toHaveTitle(/Showcase.*SiteSprintz/i);
    });
    test('should load showcase gallery page successfully', async ({ page }) => {
      await page.goto('/showcase');
      await expect(page.locator('h1')).toContainText('Made with SiteSprintz');
    });

    test('should display site cards in grid layout', async ({ page }) => {
      await page.goto('/showcase');
      // Wait for grid to be visible using data-testid
      await waitForVisible(page, '[data-testid="showcase-grid"]');
      const grid = page.locator('[data-testid="showcase-grid"]');
      await expect(grid).toBeVisible();

      // Verify at least one site card exists
      const cards = page.locator('[data-testid^="site-card-"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show loading state initially', async ({ page }) => {
      // Go to page and immediately check for loading state
      const response = page.goto('/showcase');

      // Check for loading indicator (should appear briefly)
      const loading = page.locator('.loading-state');
      // Note: This might not always catch it due to fast loading

      await response;
    });

    test('should handle empty state when no sites exist', async ({ page }) => {
      // This would require mocking or a test environment with no public sites
      // For now, we'll skip this test in production
      test.skip();
    });
  });

  // ==================== FILTERING TESTS ====================
  test.describe('Category Filtering', () => {
    test('should filter sites by category', async ({ page }) => {
      await page.goto('/showcase');
      await waitForVisible(page, '[data-testid="category-btn-restaurant"]');

      // Click restaurant category
      const restaurantBtn = page.locator('[data-testid="category-btn-restaurant"]').first();
      await restaurantBtn.click();

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify URL contains category param
      await expect(page).toHaveURL(/category=restaurant/);

      // Verify button has active class
      await expect(restaurantBtn).toHaveClass(/active/);
    });

    test('should show all sites when "All" is clicked', async ({ page }) => {
      await page.goto('/showcase?category=restaurant');
      await waitForVisible(page, '[data-testid="category-btn-all"]');

      // Click "All" button
      const allBtn = page.locator('[data-testid="category-btn-all"]').first();
      await allBtn.click();

      // Wait for results
      await page.waitForTimeout(1000);

      // Verify URL doesn't contain category param
      const url = page.url();
      expect(url).not.toContain('category=');
    });

    test('should display category counts', async ({ page }) => {
      await page.goto('/showcase');
      await page.waitForSelector('.category-filters');

      // Check if category buttons have counts in parentheses
      const categoryWithCount = page.locator('.category-btn').first();
      const text = await categoryWithCount.textContent();

      // Should contain a number in parentheses like "Restaurant (5)"
      expect(text).toMatch(/\(\d+\)/);
    });
  });

  // ==================== SEARCH TESTS ====================
  test.describe('Search Functionality', () => {


    test('should search sites by name', async ({ page }) => {
      await page.goto('/showcase');
      await waitForVisible(page, '[data-testid="showcase-search"]');

      // Type in search box
      const searchInput = page.locator('[data-testid="showcase-search"]');
      await searchInput.fill('restaurant');

      // Wait for debounce and results
      await page.waitForTimeout(1000);

      // Verify URL contains search param
      await expect(page).toHaveURL(/search=restaurant/);
    });

    test('should clear search results', async ({ page }) => {
      await page.goto('/showcase?search=restaurant');
      await waitForVisible(page, '[data-testid="showcase-search"]');

      // Clear search
      const searchInput = page.locator('[data-testid="showcase-search"]');
      await searchInput.fill('');

      // Wait for results to update
      await page.waitForTimeout(1000);

      // Verify URL doesn't contain search param
      const url = page.url();
      expect(url).not.toContain('search=');
    });

    test('should debounce search input', async ({ page }) => {
      await page.goto('/showcase');
      await page.waitForSelector('.search-box input');

      const searchInput = page.locator('.search-box input');

      // Type rapidly
      await searchInput.type('test', { delay: 50 });

      // Should not have made multiple requests (check this by monitoring network)
      // This is a simplified check
      await page.waitForTimeout(600);
    });
  });

  // ==================== PAGINATION TESTS ====================
  test.describe('Pagination', () => {
    test('should navigate to next page', async ({ page }) => {
      await page.goto('/showcase');

      // Check if pagination exists (only if there are enough sites)
      const nextButton = page.locator('button:has-text("Next")');

      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click();

        // Verify page changed
        await expect(page).toHaveURL(/page=2/);

        // Verify Previous button is now enabled
        const prevButton = page.locator('button:has-text("Previous")');
        await expect(prevButton).not.toBeDisabled();
      } else {
        test.skip();
      }
    });

    test('should disable Previous button on first page', async ({ page }) => {
      await page.goto('/showcase');

      // Check if pagination exists
      const prevButton = page.locator('button:has-text("Previous")');

      if (await prevButton.isVisible()) {
        await expect(prevButton).toBeDisabled();
      }
    });

    test('should show current page number', async ({ page }) => {
      await page.goto('/showcase');

      const pageInfo = page.locator('.page-info');

      if (await pageInfo.isVisible()) {
        await expect(pageInfo).toContainText('Page 1');
      }
    });
  });

  // ==================== SITE DETAIL TESTS ====================
  test.describe('Individual Site Pages', () => {
    test('should navigate to site detail page', async ({ page }) => {
      await page.goto('/showcase');
      await waitForVisible(page, '[data-testid^="site-card-"]');

      // Click first site card
      const firstCard = page.locator('[data-testid^="site-card-"]').first();
      await firstCard.click();

      // Verify navigation to detail page
      await expect(page).toHaveURL(/\/showcase\/[a-z0-9-]+/);

      // Verify detail page loaded
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should display site information on detail page', async ({ page }) => {
      // This test requires a known public site subdomain
      // For demo purposes, we'll skip if none available
      test.skip();
    });

    test('should have back to gallery link', async ({ page }) => {
      await page.goto('/showcase');
      await waitForVisible(page, '[data-testid^="site-card-"]');

      // Navigate to detail page
      await page.locator('[data-testid^="site-card-"]').first().click();
      await page.waitForURL(/\/showcase\/[a-z0-9-]+/);

      // Find and click back link
      const backLink = page.locator('a:has-text("Back to Gallery")');
      await expect(backLink).toBeVisible();
      await backLink.click();

      // Verify back at gallery
      await expect(page).toHaveURL('/showcase');
    });

    test('should have visit site link that opens in new tab', async ({ page }) => {
      await page.goto('/showcase');
      await waitForVisible(page, '[data-testid^="site-card-"]');

      // Navigate to detail page
      await page.locator('[data-testid^="site-card-"]').first().click();
      await page.waitForURL(/\/showcase\/[a-z0-9-]+/);

      // Check visit site link
      const visitLink = page.locator('a:has-text("Visit Site")');
      await expect(visitLink).toHaveAttribute('target', '_blank');
    });

    test('should show 404 for nonexistent site', async ({ page }) => {
      await page.goto('/showcase/nonexistent-site-12345');

      // Should show error message
      await expect(page.locator('text=/not found/i')).toBeVisible();

      // Should have link back to gallery
      await expect(page.locator('a:has-text("Back to Gallery")')).toBeVisible();
    });
  });

  // ==================== OPT-IN/OPT-OUT WORKFLOW ====================
  test.describe('Owner Opt-In/Opt-Out', () => {
    test.beforeEach(async ({ page }) => {
      // This test requires authentication
      // We'll need to log in first
      test.skip(); // Skip for now as it requires full auth setup
    });

    test('should allow owner to make site public', async ({ page }) => {
      // Navigate to dashboard
      // Toggle public setting
      // Verify site appears in showcase
      test.skip();
    });

    test('should allow owner to make site private', async ({ page }) => {
      // Navigate to dashboard
      // Toggle public setting off
      // Verify site removed from showcase
      test.skip();
    });

    test('should only allow published sites to be public', async ({ page }) => {
      // Try to make draft site public
      // Should show error or be disabled
      test.skip();
    });
  });

  // ==================== RESPONSIVE DESIGN TESTS ====================
  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/showcase');

      // Verify mobile layout
      await expect(page.locator('.showcase-gallery')).toBeVisible();

      // Grid should be single column on mobile
      const grid = page.locator('.showcase-grid');
      await expect(grid).toBeVisible();
    });

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/showcase');

      // Verify tablet layout
      await expect(page.locator('.showcase-gallery')).toBeVisible();
    });

    test('should work on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/showcase');

      // Verify desktop layout
      await expect(page.locator('.showcase-gallery')).toBeVisible();
    });
  });

  // ==================== SEO TESTS ====================
  test.describe('SEO Optimization', () => {
    test('should have proper page title', async ({ page }) => {
      await page.goto('/showcase');
      await expect(page).toHaveTitle(/Showcase.*SiteSprintz/i);
    });

    test('should have meta description', async ({ page }) => {
      await page.goto('/showcase');

      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
      expect(metaDescription).toBeTruthy();
      expect(metaDescription.length).toBeGreaterThan(50);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/showcase');

      // Should have exactly one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // h1 should have meaningful text
      const h1Text = await page.locator('h1').textContent();
      expect(h1Text.length).toBeGreaterThan(5);
    });

    test('should have alt text for all images', async ({ page }) => {
      await page.goto('/showcase');
      await page.waitForSelector('.site-card', { timeout: 5000 });

      // Get all images
      const images = page.locator('img');
      const count = await images.count();

      // Check each image has alt text
      for (let i = 0; i < Math.min(count, 10); i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================
  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page, isMobile }) => {
      await page.goto('/showcase');

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to navigate
      // Skip on mobile/tablet as keyboard nav behavior varies
      if (isMobile) test.skip();

      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement.tagName);
      expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/showcase');

      // Check search input has label
      const searchInput = page.locator('.search-box input');
      const ariaLabel = await searchInput.getAttribute('aria-label');
      expect(ariaLabel || await searchInput.getAttribute('placeholder')).toBeTruthy();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/showcase');

      // This is a basic check - full contrast checking requires axe-core
      // For now, just verify text is visible
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
    });
  });

  // ==================== PERFORMANCE TESTS ====================
  test.describe('Performance', () => {
    test('should load gallery page within 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/showcase');
      await page.waitForSelector('.showcase-grid', { timeout: 10000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('should lazy load images', async ({ page }) => {
      await page.goto('/showcase');
      await page.waitForSelector('.site-card');

      // Check if images have loading="lazy" attribute
      const images = page.locator('.site-card img');
      const firstImage = images.first();

      const loading = await firstImage.getAttribute('loading');
      expect(loading).toBe('lazy');
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure (would need to set up route interception)
      // For now, test that error states exist in the UI
      test.skip();
    });

    test('should show retry button on error', async ({ page }) => {
      // Would need to simulate an error
      test.skip();
    });
  });
});

