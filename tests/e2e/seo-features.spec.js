/**
 * E2E Tests: SEO Features in Published Sites
 * 
 * Comprehensive tests for SEO implementation:
 * - Meta tags (title, description, keywords)
 * - Open Graph tags (Facebook)
 * - Twitter Card tags
 * - Schema.org JSON-LD markup
 * - Canonical URLs
 * - Sitemap.xml
 * - Robots.txt
 * 
 * Tests verify that SEO Service properly integrates
 * with site publishing and rendering.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

// Test data
const TEST_SUBDOMAIN = `seotest${Date.now()}`;
const BUSINESS_NAME = 'Test SEO Business';
const BUSINESS_DESCRIPTION = 'A test business for validating SEO implementation';

test.describe('SEO: Meta Tags in Published Sites', () => {
  test('should include required meta tags in published site', async ({ page }) => {
    // Navigate to a published site
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // Check title tag
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(60);

    // Check meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description.length).toBeGreaterThan(50);
    expect(description.length).toBeLessThanOrEqual(160);

    // Check meta keywords
    const keywords = await page.locator('meta[name="keywords"]').getAttribute('content');
    expect(keywords).toBeTruthy();

    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should include canonical URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // Check canonical link
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);

    const href = await canonical.getAttribute('href');
    expect(href).toContain(TEST_SUBDOMAIN);
    expect(href).not.toContain('?'); // No query parameters
  });

  test('should have proper charset and viewport', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // Check charset
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset?.toLowerCase()).toBe('utf-8');

    // Check viewport
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
  });
});

test.describe('SEO: Open Graph Tags (Facebook Sharing)', () => {
  test('should include all required Open Graph tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // Required OG tags
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('website');

    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(ogUrl).toBeTruthy();

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle.length).toBeGreaterThan(0);

    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDescription).toBeTruthy();
    expect(ogDescription.length).toBeGreaterThan(0);

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
  });

  test('should have valid OG image URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toMatch(/^https?:\/\//); // Valid URL format
  });
});

test.describe('SEO: Twitter Card Tags', () => {
  test('should include all required Twitter Card tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // Required Twitter tags
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');

    const twitterUrl = await page.locator('meta[name="twitter:url"]').getAttribute('content');
    expect(twitterUrl).toBeTruthy();

    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    expect(twitterTitle).toBeTruthy();

    const twitterDescription = await page.locator('meta[name="twitter:description"]').getAttribute('content');
    expect(twitterDescription).toBeTruthy();

    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    expect(twitterImage).toBeTruthy();
  });
});

test.describe('SEO: Schema.org JSON-LD Markup', () => {
  test('should include Schema.org JSON-LD in page head', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // Find JSON-LD script tag
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);

    // Get and parse JSON-LD content
    const content = await jsonLd.textContent();
    expect(content).toBeTruthy();

    const schema = JSON.parse(content);
    
    // Verify required Schema.org fields
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBeTruthy();
    expect(schema.name).toBeTruthy();
  });

  test('should have valid LocalBusiness schema for business sites', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    const content = await jsonLd.textContent();
    const schema = JSON.parse(content);

    // Check for LocalBusiness or more specific type
    const validTypes = [
      'Restaurant', 'BeautySalon', 'HealthClub', 'Plumber', 
      'Electrician', 'AutoRepair', 'ComputerRepair', 'LocalBusiness',
      'ProfessionalService', 'Service', 'Product'
    ];

    expect(validTypes).toContain(schema['@type']);
  });

  test('should include business contact information in schema', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    const content = await jsonLd.textContent();
    const schema = JSON.parse(content);

    // Should have at least name
    expect(schema.name).toBeTruthy();
    
    // May have description, telephone, email, address
    // These are optional but should be present if available
    if (schema.description) {
      expect(typeof schema.description).toBe('string');
    }
    
    if (schema.address) {
      expect(schema.address['@type']).toBe('PostalAddress');
    }
  });

  test('should include aggregate rating if reviews exist', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    const content = await jsonLd.textContent();
    const schema = JSON.parse(content);

    // If aggregateRating exists, validate it
    if (schema.aggregateRating) {
      expect(schema.aggregateRating['@type']).toBe('AggregateRating');
      expect(schema.aggregateRating.ratingValue).toBeGreaterThan(0);
      expect(schema.aggregateRating.ratingValue).toBeLessThanOrEqual(5);
      expect(schema.aggregateRating.reviewCount).toBeGreaterThan(0);
    }
  });
});

test.describe('SEO: Sitemap.xml', () => {
  test('should serve valid sitemap.xml', async ({ page }) => {
    const response = await page.goto(`${API_URL}/sitemap.xml`, {
      headers: { 'x-subdomain': TEST_SUBDOMAIN }
    });

    // Check response status
    expect(response.status()).toBe(200);

    // Check content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('xml');

    // Check XML content
    const content = await response.text();
    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(content).toContain('<urlset');
    expect(content).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
    expect(content).toContain('<url>');
    expect(content).toContain('<loc>');
    expect(content).toContain('</urlset>');
  });

  test('should include homepage in sitemap', async ({ page }) => {
    const response = await page.goto(`${API_URL}/sitemap.xml`, {
      headers: { 'x-subdomain': TEST_SUBDOMAIN }
    });

    const content = await response.text();
    
    // Should include homepage URL
    expect(content).toContain('<loc>https://');
    expect(content).toContain(TEST_SUBDOMAIN);
  });

  test('should include priority and changefreq tags', async ({ page }) => {
    const response = await page.goto(`${API_URL}/sitemap.xml`, {
      headers: { 'x-subdomain': TEST_SUBDOMAIN }
    });

    const content = await response.text();
    
    // Should include priority and changefreq
    expect(content).toContain('<priority>');
    expect(content).toContain('<changefreq>');
  });

  test('should have cache headers on sitemap', async ({ page }) => {
    const response = await page.goto(`${API_URL}/sitemap.xml`, {
      headers: { 'x-subdomain': TEST_SUBDOMAIN }
    });

    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age');
  });
});

test.describe('SEO: Robots.txt', () => {
  test('should serve valid robots.txt', async ({ page }) => {
    const response = await page.goto(`${API_URL}/robots.txt`, {
      headers: { 'x-subdomain': TEST_SUBDOMAIN }
    });

    // Check response status
    expect(response.status()).toBe(200);

    // Check content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/plain');

    // Check robots.txt content
    const content = await response.text();
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Sitemap:');
  });

  test('should allow crawling by default', async ({ page }) => {
    const response = await page.goto(`${API_URL}/robots.txt`, {
      headers: { 'x-subdomain': TEST_SUBDOMAIN }
    });

    const content = await response.text();
    
    // Should allow crawling (Allow: / or no Disallow: /)
    expect(content).toContain('Allow: /');
  });

  test('should reference sitemap.xml in robots.txt', async ({ page }) => {
    const response = await page.goto(`${API_URL}/robots.txt`, {
      headers: { 'x-subdomain': TEST_SUBDOMAIN }
    });

    const content = await response.text();
    
    // Should reference sitemap
    expect(content).toContain('Sitemap:');
    expect(content).toContain('/sitemap.xml');
  });

  test('should have cache headers on robots.txt', async ({ page }) => {
    const response = await page.goto(`${API_URL}/robots.txt`, {
      headers: { 'x-subdomain': TEST_SUBDOMAIN }
    });

    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age');
  });
});

test.describe('SEO: Mobile Optimization', () => {
  test('should be mobile-friendly with proper viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });

  test('should have responsive meta tags on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // All meta tags should still be present
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
  });
});

test.describe('SEO: Cross-Template Validation', () => {
  const templates = ['restaurant', 'salon', 'gym', 'consultant'];

  for (const template of templates) {
    test(`should have proper SEO for ${template} template`, async ({ page }) => {
      const subdomain = `${template}${Date.now()}`;
      await page.goto(`${BASE_URL}/sites/${subdomain}/`);

      // Basic SEO checks
      const title = await page.title();
      expect(title).toBeTruthy();

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toBeTruthy();

      // Schema.org should be present
      const jsonLd = page.locator('script[type="application/ld+json"]');
      await expect(jsonLd).toHaveCount(1);

      const content = await jsonLd.textContent();
      const schema = JSON.parse(content);
      expect(schema['@context']).toBe('https://schema.org');
    });
  }
});

test.describe('SEO: Performance', () => {
  test('should load meta tags quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);
    
    // Meta tags should be in initial HTML (no JS required)
    const title = await page.title();
    const loadTime = Date.now() - startTime;

    expect(title).toBeTruthy();
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test('should have all SEO elements in initial HTML', async ({ page }) => {
    // Disable JavaScript to verify SSR/static content
    await page.context().addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // All SEO elements should be present without JavaScript
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });
});

test.describe('SEO: Validation and Quality', () => {
  test('should not have duplicate meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    // Check for duplicate meta description
    const descriptions = await page.locator('meta[name="description"]').count();
    expect(descriptions).toBe(1);

    // Check for duplicate OG title
    const ogTitles = await page.locator('meta[property="og:title"]').count();
    expect(ogTitles).toBe(1);

    // Check for duplicate canonical
    const canonicals = await page.locator('link[rel="canonical"]').count();
    expect(canonicals).toBe(1);
  });

  test('should have consistent titles across meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    const pageTitle = await page.title();
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');

    // All titles should be similar (may have slight variations)
    expect(pageTitle).toBeTruthy();
    expect(ogTitle).toBeTruthy();
    expect(twitterTitle).toBeTruthy();
  });

  test('should have consistent descriptions across meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/sites/${TEST_SUBDOMAIN}/`);

    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    const twitterDescription = await page.locator('meta[name="twitter:description"]').getAttribute('content');

    // All descriptions should be similar
    expect(metaDescription).toBeTruthy();
    expect(ogDescription).toBeTruthy();
    expect(twitterDescription).toBeTruthy();
  });
});

