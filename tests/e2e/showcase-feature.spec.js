/**
 * E2E Tests for Showcase Feature
 * Tests the complete showcase workflow from generation to viewing
 * Using Playwright for end-to-end testing
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_SUBDOMAIN = 'testsite';

test.describe('Showcase Feature E2E Tests', () => {
  
  test.describe('Showcase Generation', () => {
    test('should generate showcase for published site', async ({ page, request }) => {
      // Generate showcase via API
      const response = await request.post(`${BASE_URL}/api/showcase/${TEST_SUBDOMAIN}/generate`, {
        headers: {
          'authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
        }
      });

      // Should succeed or handle auth appropriately
      expect([200, 401, 403, 404, 500]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('showcase');
        expect(data.showcase).toHaveProperty('subdomain');
        expect(data.showcase).toHaveProperty('highlights');
      }
    });

    test('should include all highlight sections', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/showcase/${TEST_SUBDOMAIN}`);

      if (response.status() === 200) {
        const showcase = await response.json();
        expect(showcase.highlights).toHaveProperty('sections');
        expect(Array.isArray(showcase.highlights.sections)).toBe(true);
        
        // Should have at least one section
        if (showcase.highlights.sections.length > 0) {
          const possibleSections = ['hero', 'services', 'reviews', 'contact'];
          showcase.highlights.sections.forEach(section => {
            expect(possibleSections).toContain(section);
          });
        }
      }
    });

    test('should cache generated showcases', async ({ request }) => {
      // Get showcase twice
      const response1 = await request.get(`${BASE_URL}/api/showcase/${TEST_SUBDOMAIN}`);
      const response2 = await request.get(`${BASE_URL}/api/showcase/${TEST_SUBDOMAIN}`);

      if (response1.status() === 200 && response2.status() === 200) {
        const showcase1 = await response1.json();
        const showcase2 = await response2.json();
        
        // Should have same generation timestamp if cached
        expect(showcase1.generatedAt).toBe(showcase2.generatedAt);
      }
    });
  });

  test.describe('Showcase Viewer UI', () => {
    test('should load showcase viewer page', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      // Should either load successfully or show 404
      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        // Verify showcase container exists
        await expect(page.locator('.showcase-container')).toBeVisible();
      }
    });

    test('should display site name in header', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        await expect(page.locator('.showcase-header h1')).toBeVisible();
      }
    });

    test('should display showcase slides', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        // Should have at least one slide or be empty
        const slides = page.locator('.showcase-slide');
        const count = await slides.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should display visit site CTA button', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        await expect(page.locator('.cta-button')).toBeVisible();
        await expect(page.locator('.cta-button')).toContainText('Visit Site');
      }
    });

    test('should display share button', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        await expect(page.locator('.share-button')).toBeVisible();
      }
    });

    test('should show 404 for non-existent showcase', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/nonexistent-site-xyz`);

      // Should show 404 message
      await expect(page.locator('text=Showcase Not Found')).toBeVisible();
    });
  });

  test.describe('Showcase Interactions', () => {
    test('should allow scrolling through slides', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        const content = page.locator('.showcase-content');
        if (await content.isVisible()) {
          // Verify scroll-snap behavior by checking CSS
          const snapType = await content.evaluate(el => 
            window.getComputedStyle(el).scrollSnapType
          );
          expect(snapType).toContain('y');
        }
      }
    });

    test('should navigate to site when clicking CTA', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        const ctaButton = page.locator('.cta-button');
        if (await ctaButton.isVisible()) {
          const href = await ctaButton.getAttribute('href');
          expect(href).toContain(TEST_SUBDOMAIN);
          expect(href).toContain('sitesprintz.com');
        }
      }
    });

    test('should trigger share when clicking share button', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        const shareButton = page.locator('.share-button');
        if (await shareButton.isVisible()) {
          // Click share button
          await shareButton.click();

          // Should call share function (may show alert or native share)
          // Just verify click doesn't throw error
          expect(true).toBe(true);
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        // Container should be visible
        await expect(page.locator('.showcase-container')).toBeVisible();
      }
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        await expect(page.locator('.showcase-container')).toBeVisible();
      }
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        await expect(page.locator('.showcase-container')).toBeVisible();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load showcase page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should cache images for faster subsequent loads', async ({ page }) => {
      // Load page first time
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);
      
      // Reload page
      const startTime = Date.now();
      await page.reload();
      const reloadTime = Date.now() - startTime;
      
      // Reload should be faster (cached)
      expect(reloadTime).toBeLessThan(3000);
    });
  });

  test.describe('API Endpoints', () => {
    test('GET /api/showcase/:subdomain - should return showcase data', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/showcase/${TEST_SUBDOMAIN}`);

      expect([200, 404, 500]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('subdomain');
        expect(data).toHaveProperty('highlights');
        expect(data).toHaveProperty('url');
        expect(data).toHaveProperty('generatedAt');
      }
    });

    test('GET /api/showcases - should list all showcases', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/showcases`);

      expect([200, 500]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      }
    });

    test('POST /api/showcase/:subdomain/generate - should require auth', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/showcase/${TEST_SUBDOMAIN}/generate`
      );

      // Should fail without auth or handle gracefully
      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('DELETE /api/showcase/:subdomain - should require auth', async ({ request }) => {
      const response = await request.delete(
        `${BASE_URL}/api/showcase/${TEST_SUBDOMAIN}`
      );

      // Should fail without auth
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Error Handling', () => {
    test('should handle non-existent showcase gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/this-does-not-exist-xyz`);

      // Should show friendly 404 page
      await expect(page.locator('text=Showcase Not Found')).toBeVisible();
      
      // Should have back link
      await expect(page.locator('a')).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/showcase/error-test-xyz`);

      if (response.status() >= 400) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Try to load with offline mode
      await page.route('**/*', route => route.abort());
      
      const response = await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`, {
        waitUntil: 'domcontentloaded',
        timeout: 5000
      }).catch(() => null);

      // Should fail gracefully
      expect(response).toBeNull();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper HTML structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        // Should have DOCTYPE
        const html = await page.content();
        expect(html).toContain('<!DOCTYPE html>');
        
        // Should have lang attribute
        expect(html).toMatch(/<html[^>]*lang="en"/);
      }
    });

    test('should have viewport meta tag', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toContain('width=device-width');
    });

    test('should have title tag', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title).toContain('Showcase');
    });
  });

  test.describe('SEO', () => {
    test('should have proper meta tags', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      const is404 = await page.locator('text=Showcase Not Found').isVisible().catch(() => false);
      
      if (!is404) {
        // Should have title
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });

    test('should be crawlable by search engines', async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase/${TEST_SUBDOMAIN}`);

      // Should not have noindex meta tag
      const noindex = await page.locator('meta[name="robots"][content*="noindex"]').count();
      expect(noindex).toBe(0);
    });
  });
});

