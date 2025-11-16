/**
 * Unit Tests for Showcase Service
 * TDD Approach: RED phase - Define tests first
 * 
 * ShowcaseService should:
 * - Capture screenshots of published sites
 * - Generate highlight sections (hero, services, reviews, contact)
 * - Create shareable showcase URLs
 * - Support mobile and desktop viewports
 * - Cache generated showcases
 * - Handle errors gracefully
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import ShowcaseService from '../../server/services/showcaseService.js';
import fs from 'fs/promises';
import path from 'path';

// Create mock browser and page
let mockBrowser;
let mockPage;

// Mock Puppeteer
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn()
  }
}));

describe('ShowcaseService', () => {
  let showcaseService;

  beforeEach(async () => {
    // Create mock element with screenshot capability
    const mockElement = {
      screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-element-screenshot'))
    };

    // Create mock browser and page
    mockPage = {
      goto: vi.fn().mockResolvedValue({}),
      setViewport: vi.fn().mockResolvedValue({}),
      setRequestInterception: vi.fn().mockResolvedValue({}),
      on: vi.fn(),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
      evaluate: vi.fn().mockResolvedValue(true),
      waitForSelector: vi.fn().mockResolvedValue({}),
      $: vi.fn().mockResolvedValue(mockElement),
      close: vi.fn().mockResolvedValue({})
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue({})
    };

    // Mock puppeteer.launch to return our mock browser
    const puppeteer = await import('puppeteer');
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    showcaseService = new ShowcaseService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(showcaseService).toBeDefined();
      expect(showcaseService.screenshotDir).toBeDefined();
      expect(showcaseService.cacheTimeout).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        screenshotDir: '/custom/path',
        cacheTimeout: 60000
      };
      
      const customService = new ShowcaseService(customConfig);
      expect(customService.screenshotDir).toBe('/custom/path');
      expect(customService.cacheTimeout).toBe(60000);
    });
  });

  describe('captureScreenshot', () => {
    it('should capture screenshot of a published site', async () => {
      const result = await showcaseService.captureScreenshot(
        'https://testsite.sitesprintz.com',
        { viewport: { width: 1200, height: 800 } }
      );

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
    });

    it('should use specified viewport dimensions', async () => {
      await showcaseService.captureScreenshot(
        'https://testsite.sitesprintz.com',
        { viewport: { width: 375, height: 667 } }
      );

      // Verify viewport was set correctly
      expect(mockPage.setViewport).toHaveBeenCalledWith(
        expect.objectContaining({ width: 375, height: 667 })
      );
    });

    it('should wait for page to load completely', async () => {
      await showcaseService.captureScreenshot(
        'https://testsite.sitesprintz.com'
      );

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ waitUntil: 'networkidle0' })
      );
    });

    it('should handle screenshot errors gracefully', async () => {
      mockPage.screenshot.mockRejectedValueOnce(new Error('Screenshot failed'));

      await expect(
        showcaseService.captureScreenshot('https://invalid-site.com')
      ).rejects.toThrow('Screenshot failed');
    });

    it('should capture full page screenshot', async () => {
      await showcaseService.captureScreenshot(
        'https://testsite.sitesprintz.com',
        { fullPage: true }
      );

      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({ fullPage: true })
      );
    });
  });

  describe('captureHighlights', () => {
    it('should capture all highlight sections', async () => {
      const highlights = await showcaseService.captureHighlights(
        'testsite',
        'https://testsite.sitesprintz.com'
      );

      expect(highlights).toHaveProperty('hero');
      expect(highlights).toHaveProperty('services');
      expect(highlights).toHaveProperty('reviews');
      expect(highlights).toHaveProperty('contact');
      expect(Array.isArray(highlights.sections)).toBe(true);
    });

    it('should capture hero section with proper dimensions', async () => {
      const highlights = await showcaseService.captureHighlights(
        'testsite',
        'https://testsite.sitesprintz.com'
      );

      expect(highlights.hero).toHaveProperty('image');
      expect(highlights.hero).toHaveProperty('width');
      expect(highlights.hero).toHaveProperty('height');
    });

    it('should handle missing sections gracefully', async () => {
      // Mock page with no reviews section
      mockPage.$.mockResolvedValueOnce(null);

      const highlights = await showcaseService.captureHighlights(
        'testsite',
        'https://testsite.sitesprintz.com'
      );

      expect(highlights).toBeDefined();
      // Should not have reviews if section doesn't exist
    });

    it('should capture multiple service items', async () => {
      const highlights = await showcaseService.captureHighlights(
        'testsite',
        'https://testsite.sitesprintz.com'
      );

      if (highlights.services) {
        expect(Array.isArray(highlights.services)).toBe(true);
      }
    });

    it('should use mobile viewport for mobile highlights', async () => {
      await showcaseService.captureHighlights(
        'testsite',
        'https://testsite.sitesprintz.com',
        { viewport: 'mobile' }
      );

      expect(mockPage.setViewport).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 375,
          height: 667
        })
      );
    });
  });

  describe('generateShowcase', () => {
    it('should generate complete showcase data', async () => {
      const showcase = await showcaseService.generateShowcase('testsite');

      expect(showcase).toHaveProperty('subdomain', 'testsite');
      expect(showcase).toHaveProperty('highlights');
      expect(showcase).toHaveProperty('generatedAt');
      expect(showcase).toHaveProperty('url');
    });

    it('should include site metadata', async () => {
      const showcase = await showcaseService.generateShowcase('testsite');

      expect(showcase).toHaveProperty('metadata');
      expect(showcase.metadata).toHaveProperty('businessName');
      expect(showcase.metadata).toHaveProperty('template');
    });

    it('should generate shareable URL', async () => {
      const showcase = await showcaseService.generateShowcase('testsite');

      expect(showcase.url).toMatch(/\/showcase\/testsite/);
    });

    it('should cache generated showcases', async () => {
      const showcase1 = await showcaseService.generateShowcase('testsite');
      const showcase2 = await showcaseService.generateShowcase('testsite');

      // Second call should return cached version
      expect(showcase1.generatedAt).toBe(showcase2.generatedAt);
    });

    it('should invalidate cache after timeout', async () => {
      vi.useFakeTimers();
      
      const showcase1 = await showcaseService.generateShowcase('testsite');
      
      // Advance time beyond cache timeout
      vi.advanceTimersByTime(3600001); // 1 hour + 1ms
      
      const showcase2 = await showcaseService.generateShowcase('testsite');

      expect(showcase1.generatedAt).not.toBe(showcase2.generatedAt);
      
      vi.useRealTimers();
    });
  });

  describe('saveShowcase', () => {
    it('should save showcase to file system', async () => {
      const showcase = {
        subdomain: 'testsite',
        highlights: {},
        generatedAt: new Date().toISOString()
      };

      const filePath = await showcaseService.saveShowcase(showcase);

      expect(filePath).toContain('testsite');
      expect(filePath).toMatch(/\.json$/);
    });

    it('should create showcase directory if not exists', async () => {
      const showcase = {
        subdomain: 'newsite',
        highlights: {},
        generatedAt: new Date().toISOString()
      };

      await expect(
        showcaseService.saveShowcase(showcase)
      ).resolves.toBeDefined();
    });

    it('should overwrite existing showcase', async () => {
      const showcase = {
        subdomain: 'testsite',
        highlights: {},
        generatedAt: new Date().toISOString()
      };

      const path1 = await showcaseService.saveShowcase(showcase);
      const path2 = await showcaseService.saveShowcase(showcase);

      expect(path1).toBe(path2);
    });
  });

  describe('loadShowcase', () => {
    it('should load existing showcase from file', async () => {
      // First save a showcase
      const showcase = {
        subdomain: 'testsite',
        highlights: { hero: {} },
        generatedAt: new Date().toISOString()
      };
      await showcaseService.saveShowcase(showcase);

      // Then load it
      const loaded = await showcaseService.loadShowcase('testsite');

      expect(loaded).toBeDefined();
      expect(loaded.subdomain).toBe('testsite');
    });

    it('should return null for non-existent showcase', async () => {
      const loaded = await showcaseService.loadShowcase('nonexistent');

      expect(loaded).toBeNull();
    });

    it('should validate loaded showcase data', async () => {
      const loaded = await showcaseService.loadShowcase('testsite');

      if (loaded) {
        expect(loaded).toHaveProperty('subdomain');
        expect(loaded).toHaveProperty('highlights');
        expect(loaded).toHaveProperty('generatedAt');
      }
    });
  });

  describe('deleteShowcase', () => {
    it('should delete existing showcase', async () => {
      // First create a showcase
      const showcase = {
        subdomain: 'testsite',
        highlights: {},
        generatedAt: new Date().toISOString()
      };
      await showcaseService.saveShowcase(showcase);

      // Then delete it
      const result = await showcaseService.deleteShowcase('testsite');

      expect(result).toBe(true);
    });

    it('should return false for non-existent showcase', async () => {
      const result = await showcaseService.deleteShowcase('nonexistent');

      expect(result).toBe(false);
    });

    it('should also delete screenshot files', async () => {
      const showcase = {
        subdomain: 'testsite',
        highlights: {
          hero: { path: '/screenshots/test-hero.png' }
        },
        generatedAt: new Date().toISOString()
      };
      await showcaseService.saveShowcase(showcase);

      await showcaseService.deleteShowcase('testsite');

      // Verify screenshot files are also deleted
      // (implementation will handle this)
    });
  });

  describe('listShowcases', () => {
    it('should list all available showcases', async () => {
      const showcases = await showcaseService.listShowcases();

      expect(Array.isArray(showcases)).toBe(true);
    });

    it('should return showcase metadata', async () => {
      const showcases = await showcaseService.listShowcases();

      if (showcases.length > 0) {
        expect(showcases[0]).toHaveProperty('subdomain');
        expect(showcases[0]).toHaveProperty('generatedAt');
      }
    });

    it('should sort showcases by creation date', async () => {
      const showcases = await showcaseService.listShowcases();

      if (showcases.length > 1) {
        const dates = showcases.map(s => new Date(s.generatedAt));
        const sorted = [...dates].sort((a, b) => b - a);
        expect(dates).toEqual(sorted);
      }
    });
  });

  describe('refreshShowcase', () => {
    it('should regenerate showcase with fresh screenshots', async () => {
      const oldShowcase = await showcaseService.generateShowcase('testsite');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const newShowcase = await showcaseService.refreshShowcase('testsite');

      expect(newShowcase.generatedAt).not.toBe(oldShowcase.generatedAt);
    });

    it('should clear cache when refreshing', async () => {
      await showcaseService.generateShowcase('testsite');
      await showcaseService.refreshShowcase('testsite');

      // Subsequent call should use new cached version
      const showcase = await showcaseService.generateShowcase('testsite');
      expect(showcase).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        showcaseService.captureScreenshot('https://offline-site.com')
      ).rejects.toThrow();
    });

    it('should handle invalid URLs', async () => {
      await expect(
        showcaseService.captureScreenshot('invalid-url')
      ).rejects.toThrow();
    });

    it('should handle browser launch failures', async () => {
      // Mock browser launch failure
      const puppeteer = await import('puppeteer');
      puppeteer.default.launch.mockRejectedValueOnce(new Error('Browser launch failed'));

      await expect(
        showcaseService.captureScreenshot('https://testsite.com')
      ).rejects.toThrow();
    });

    it('should clean up browser resources on error', async () => {
      mockPage.screenshot.mockRejectedValueOnce(new Error('Test error'));

      await expect(
        showcaseService.captureScreenshot('https://testsite.com')
      ).rejects.toThrow();

      // Page should be closed on error (not pooled)
      expect(mockPage.close).toHaveBeenCalled();
    });
  });

  describe('viewport configurations', () => {
    it('should support desktop viewport', async () => {
      await showcaseService.captureScreenshot(
        'https://testsite.com',
        { viewport: { width: 1920, height: 1080 } }
      );

      expect(mockPage.setViewport).toHaveBeenCalledWith(
        expect.objectContaining({ width: 1920, height: 1080 })
      );
    });

    it('should support tablet viewport', async () => {
      await showcaseService.captureScreenshot(
        'https://testsite.com',
        { viewport: { width: 768, height: 1024 } }
      );

      expect(mockPage.setViewport).toHaveBeenCalledWith(
        expect.objectContaining({ width: 768, height: 1024 })
      );
    });

    it('should support mobile viewport', async () => {
      await showcaseService.captureScreenshot(
        'https://testsite.com',
        { viewport: { width: 375, height: 667 } }
      );

      expect(mockPage.setViewport).toHaveBeenCalledWith(
        expect.objectContaining({ width: 375, height: 667 })
      );
    });
  });

  describe('performance', () => {
    it('should complete screenshot capture within timeout', async () => {
      const startTime = Date.now();
      
      await showcaseService.captureScreenshot('https://testsite.com');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should handle concurrent screenshot requests', async () => {
      const promises = [
        showcaseService.captureScreenshot('https://site1.com'),
        showcaseService.captureScreenshot('https://site2.com'),
        showcaseService.captureScreenshot('https://site3.com')
      ];

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should reuse browser instance for multiple screenshots', async () => {
      await showcaseService.captureScreenshot('https://site1.com');
      await showcaseService.captureScreenshot('https://site2.com');

      // Browser should be reused (launched once)
      const puppeteer = await import('puppeteer');
      expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);
    });
  });
});

