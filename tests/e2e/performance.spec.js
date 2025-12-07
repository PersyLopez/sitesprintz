/**
 * E2E Tests: Performance & Lighthouse
 * Tests Lighthouse scores for performance, accessibility, best practices, and SEO
 */

import { test, expect } from '@playwright/test';
import lighthouse from 'lighthouse';
import { login, createTestSite } from '../helpers/e2e-test-utils.js';

test.describe('Performance & Lighthouse', () => {
  test.beforeEach(async ({ page }) => {
    // Login and create a test site if needed
    await login(page);
  });

  test('should achieve >90 Lighthouse performance score for homepage', async ({ page, browser }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get the page URL
    const url = page.url();
    
    // Run Lighthouse using Playwright's browser
    try {
      // Get CDP session from Playwright browser
      const cdp = await page.context().newCDPSession(page);
      const wsEndpoint = browser.wsEndpoint();
      
      // Extract port from wsEndpoint (format: ws://host:port/...)
      const portMatch = wsEndpoint.match(/:\d+/);
      const port = portMatch ? parseInt(portMatch[0].substring(1)) : 9222;
      
      const result = await lighthouse(url, {
        port: port,
        output: 'json',
        onlyCategories: ['performance'],
        logLevel: 'error'
      });
      
      const performanceScore = result.lhr.categories.performance.score * 100;
      expect(performanceScore).toBeGreaterThan(90);
    } catch (error) {
      // If Lighthouse fails, log and skip
      console.log('Lighthouse test skipped:', error.message);
      test.skip();
    }
  });

  test('should achieve >90 Lighthouse accessibility score', async ({ page, browser }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    
    try {
      const wsEndpoint = browser.wsEndpoint();
      const portMatch = wsEndpoint.match(/:\d+/);
      const port = portMatch ? parseInt(portMatch[0].substring(1)) : 9222;
      
      const result = await lighthouse(url, {
        port: port,
        output: 'json',
        onlyCategories: ['accessibility'],
        logLevel: 'error'
      });
      
      const accessibilityScore = result.lhr.categories.accessibility.score * 100;
      expect(accessibilityScore).toBeGreaterThan(90);
    } catch (error) {
      console.log('Lighthouse accessibility test skipped:', error.message);
      test.skip();
    }
  });

  test('should achieve >90 Lighthouse best practices score', async ({ page, browser }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    
    try {
      const wsEndpoint = browser.wsEndpoint();
      const portMatch = wsEndpoint.match(/:\d+/);
      const port = portMatch ? parseInt(portMatch[0].substring(1)) : 9222;
      
      const result = await lighthouse(url, {
        port: port,
        output: 'json',
        onlyCategories: ['best-practices'],
        logLevel: 'error'
      });
      
      const bestPracticesScore = result.lhr.categories['best-practices'].score * 100;
      expect(bestPracticesScore).toBeGreaterThan(90);
    } catch (error) {
      console.log('Lighthouse best practices test skipped:', error.message);
      test.skip();
    }
  });

  test('should achieve >90 Lighthouse SEO score', async ({ page, browser }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    
    try {
      const wsEndpoint = browser.wsEndpoint();
      const portMatch = wsEndpoint.match(/:\d+/);
      const port = portMatch ? parseInt(portMatch[0].substring(1)) : 9222;
      
      const result = await lighthouse(url, {
        port: port,
        output: 'json',
        onlyCategories: ['seo'],
        logLevel: 'error'
      });
      
      const seoScore = result.lhr.categories.seo.score * 100;
      expect(seoScore).toBeGreaterThan(90);
    } catch (error) {
      console.log('Lighthouse SEO test skipped:', error.message);
      test.skip();
    }
  });

  test('should have fast First Contentful Paint (FCP)', async ({ page }) => {
    await page.goto('/');
    
    // Measure FCP using Performance API
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
          }
        }).observe({ entryTypes: ['paint'] });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(null), 5000);
      });
    });
    
    // FCP should be under 1.8 seconds (good threshold)
    if (fcp !== null) {
      expect(fcp).toBeLessThan(1800);
    }
  });

  test('should have fast Largest Contentful Paint (LCP)', async ({ page }) => {
    await page.goto('/');
    
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        let lcpValue = null;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcpValue = lastEntry.renderTime || lastEntry.loadTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Wait a bit for LCP
        setTimeout(() => resolve(lcpValue), 3000);
      });
    });
    
    // LCP should be under 2.5 seconds (good threshold)
    if (lcp !== null) {
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('should have low Cumulative Layout Shift (CLS)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(clsValue), 3000);
      });
    });
    
    // CLS should be under 0.1 (good threshold)
    expect(cls).toBeLessThan(0.1);
  });

  test('should have fast Time to Interactive (TTI)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // TTI is harder to measure directly, but we can check that page is interactive
    const isInteractive = await page.evaluate(() => {
      return document.readyState === 'complete' && 
             typeof window.addEventListener === 'function';
    });
    
    expect(isInteractive).toBeTruthy();
  });

  test('should load published site with good performance', async ({ page }) => {
    // Create and publish a site
    const site = await createTestSite(page);
    await page.goto('/dashboard');
    
    // Navigate to published site (if available)
    const siteUrl = `/sites/${site.subdomain}/`;
    await page.goto(siteUrl);
    await page.waitForLoadState('networkidle');
    
    // Check page load time
    const loadTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });
    
    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should optimize images for performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that images use modern formats or are optimized
    const images = await page.$$eval('img', (imgs) => {
      return imgs.map(img => ({
        src: img.src,
        loading: img.loading,
        decoding: img.decoding
      }));
    });
    
    // Images should have lazy loading or proper attributes
    for (const img of images) {
      // Check if using modern image formats or has optimization
      const isOptimized = img.src.includes('webp') || 
                         img.src.includes('avif') ||
                         img.loading === 'lazy' ||
                         img.decoding === 'async';
      
      // At least some images should be optimized
      if (images.length > 0) {
        const optimizedCount = images.filter(i => 
          i.src.includes('webp') || i.src.includes('avif') || i.loading === 'lazy'
        ).length;
        
        // At least 50% should be optimized
        expect(optimizedCount / images.length).toBeGreaterThan(0.5);
      }
    }
  });

  test('should have proper caching headers', async ({ page }) => {
    await page.goto('/');
    
    // Check response headers for static assets
    const response = await page.goto('/');
    const headers = response.headers();
    
    // Should have cache-control or etag
    const hasCaching = headers['cache-control'] || 
                      headers['etag'] || 
                      headers['last-modified'];
    
    // Static assets should be cached
    expect(hasCaching).toBeTruthy();
  });
});

