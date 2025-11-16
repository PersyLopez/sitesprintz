/**
 * Showcase Service
 * Generates story-like showcases of published sites
 * Captures screenshots and creates shareable highlight reels
 * Following TDD: Implementation written to pass tests
 * 
 * REFACTOR Phase: Performance optimizations applied
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ShowcaseService {
  constructor(config = {}) {
    this.screenshotDir = config.screenshotDir || path.join(__dirname, '../../public/showcases');
    this.cacheTimeout = config.cacheTimeout || 3600000; // 1 hour default
    this.cache = new Map();
    this.browser = null;
    this.browserPromise = null; // Track browser launch promise
    
    // Viewport presets
    this.viewports = {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    };

    // Performance settings
    this.maxConcurrentPages = config.maxConcurrentPages || 3;
    this.pagePool = [];
    this.activeTasks = 0;
  }

  /**
   * Get or create browser instance (optimized with promise caching)
   * @returns {Promise<Browser>}
   */
  async getBrowser() {
    if (this.browser) {
      return this.browser;
    }

    // REFACTOR: Prevent multiple simultaneous browser launches
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // REFACTOR: Prevent OOM issues
          '--disable-accelerated-2d-canvas', // REFACTOR: Reduce memory
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu' // REFACTOR: Not needed for screenshots
        ]
      }).then(browser => {
        this.browser = browser;
        this.browserPromise = null;
        return browser;
      });
    }

    return this.browserPromise;
  }

  /**
   * Get page from pool or create new one (REFACTOR: Page pooling)
   * @returns {Promise<Page>}
   */
  async getPage() {
    const browser = await this.getBrowser();
    
    // Reuse page from pool if available
    if (this.pagePool.length > 0) {
      return this.pagePool.pop();
    }

    const page = await browser.newPage();
    
    // REFACTOR: Set resource blocking for faster loads
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block unnecessary resources
      if (['font', 'media', 'websocket'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    return page;
  }

  /**
   * Return page to pool (REFACTOR: Page reuse)
   * @param {Page} page - Page to return
   */
  async releasePage(page) {
    if (this.pagePool.length < this.maxConcurrentPages) {
      // Clear page state before returning to pool
      try {
        await page.goto('about:blank');
        this.pagePool.push(page);
      } catch (error) {
        await page.close();
      }
    } else {
      await page.close();
    }
  }

  /**
   * Close browser instance and clean up resources
   */
  async closeBrowser() {
    // Close all pooled pages
    await Promise.all(this.pagePool.map(page => page.close()));
    this.pagePool = [];

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Capture screenshot of a URL
   * @param {string} url - URL to capture
   * @param {Object} options - Screenshot options
   * @returns {Promise<Object>} Screenshot data
   */
  async captureScreenshot(url, options = {}) {
    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }

    const page = await this.getPage();

    try {
      // Set viewport
      const viewport = options.viewport || this.viewports.desktop;
      await page.setViewport(viewport);

      // Navigate to URL with timeout
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Capture screenshot
      const buffer = await page.screenshot({
        fullPage: options.fullPage || false,
        type: 'png',
        // REFACTOR: Optimize quality/size tradeoff
        quality: options.quality || 80,
        optimizeForSpeed: true
      });

      await this.releasePage(page);

      return {
        buffer,
        width: viewport.width,
        height: viewport.height
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Capture highlight sections of a site (REFACTOR: Parallel capture)
   * @param {string} subdomain - Site subdomain
   * @param {string} siteUrl - Full site URL
   * @param {Object} options - Capture options
   * @returns {Promise<Object>} Highlights data
   */
  async captureHighlights(subdomain, siteUrl, options = {}) {
    const page = await this.getPage();

    try {
      // Set viewport based on options
      const viewportType = options.viewport || 'desktop';
      const viewport = typeof viewportType === 'string' 
        ? this.viewports[viewportType]
        : viewportType;
      
      await page.setViewport(viewport);
      await page.goto(siteUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      const highlights = {
        sections: []
      };

      // REFACTOR: Define selectors once
      const sectionSelectors = {
        hero: 'section[class*="hero"], .hero, header[class*="hero"]',
        services: 'section[class*="services"], section[class*="products"], .services, .products',
        reviews: 'section[class*="reviews"], section[class*="testimonials"], .reviews, .testimonials',
        contact: 'section[class*="contact"], .contact, footer'
      };

      // REFACTOR: Capture sections in parallel
      const capturePromises = Object.entries(sectionSelectors).map(async ([sectionName, selector]) => {
        const element = await page.$(selector);
        if (element) {
          const buffer = await element.screenshot();
          const imagePath = await this.saveScreenshot(subdomain, sectionName, buffer);
          return {
            name: sectionName,
            data: {
              image: imagePath,
              width: viewport.width,
              height: sectionName === 'hero' ? Math.min(viewport.height, 800) : undefined
            }
          };
        }
        return null;
      });

      // Wait for all captures to complete
      const results = await Promise.all(capturePromises);

      // Process results
      results.forEach(result => {
        if (result) {
          const { name, data } = result;
          highlights.sections.push(name);
          
          if (name === 'services') {
            highlights[name] = [data];
          } else {
            highlights[name] = data;
          }
        }
      });

      await this.releasePage(page);
      return highlights;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Save screenshot buffer to file (REFACTOR: Async write with compression)
   * @param {string} subdomain - Site subdomain
   * @param {string} section - Section name
   * @param {Buffer} buffer - Screenshot buffer
   * @returns {Promise<string>} File path
   */
  async saveScreenshot(subdomain, section, buffer) {
    const dir = path.join(this.screenshotDir, subdomain);
    await fs.mkdir(dir, { recursive: true });
    
    const filename = `${section}-${Date.now()}.png`;
    const filepath = path.join(dir, filename);
    
    // REFACTOR: Write asynchronously without blocking
    await fs.writeFile(filepath, buffer, { flag: 'w' });
    
    // Return relative path for web access
    return `/showcases/${subdomain}/${filename}`;
  }

  /**
   * Generate complete showcase for a site
   * @param {string} subdomain - Site subdomain
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Showcase data
   */
  async generateShowcase(subdomain, options = {}) {
    // Check cache first
    const cached = this.cache.get(subdomain);
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
      return cached.data;
    }

    const siteUrl = `https://${subdomain}.sitesprintz.com`;
    
    try {
      // REFACTOR: Increment active tasks for monitoring
      this.activeTasks++;

      // Capture highlights
      const highlights = await this.captureHighlights(subdomain, siteUrl, options);

      // Load site metadata
      const metadata = await this.loadSiteMetadata(subdomain);

      const showcase = {
        subdomain,
        highlights,
        metadata,
        generatedAt: new Date().toISOString(),
        url: `/showcase/${subdomain}`
      };

      // Cache the result
      this.cache.set(subdomain, {
        data: showcase,
        timestamp: Date.now()
      });

      // REFACTOR: Clean up old cache entries
      this.cleanupCache();

      // Save to file (async, don't await to speed up response)
      this.saveShowcase(showcase).catch(console.error);

      return showcase;
    } catch (error) {
      throw new Error(`Failed to generate showcase for ${subdomain}: ${error.message}`);
    } finally {
      this.activeTasks--;
    }
  }

  /**
   * Clean up old cache entries (REFACTOR: Memory management)
   */
  cleanupCache() {
    const now = Date.now();
    const maxCacheSize = 50; // Keep max 50 showcases in memory

    // Remove expired entries
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }

    // If still too large, remove oldest entries
    if (this.cache.size > maxCacheSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - maxCacheSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Load site metadata
   * @param {string} subdomain - Site subdomain
   * @returns {Promise<Object>} Site metadata
   */
  async loadSiteMetadata(subdomain) {
    // In real implementation, load from database or site.json
    // For now, return minimal metadata
    return {
      businessName: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
      template: 'unknown'
    };
  }

  /**
   * Save showcase to file system
   * @param {Object} showcase - Showcase data
   * @returns {Promise<string>} File path
   */
  async saveShowcase(showcase) {
    const dir = path.join(this.screenshotDir, showcase.subdomain);
    await fs.mkdir(dir, { recursive: true });
    
    const filepath = path.join(dir, 'showcase.json');
    await fs.writeFile(filepath, JSON.stringify(showcase, null, 2));
    
    return filepath;
  }

  /**
   * Load showcase from file system
   * @param {string} subdomain - Site subdomain
   * @returns {Promise<Object|null>} Showcase data or null
   */
  async loadShowcase(subdomain) {
    try {
      const filepath = path.join(this.screenshotDir, subdomain, 'showcase.json');
      const data = await fs.readFile(filepath, 'utf-8');
      const showcase = JSON.parse(data);
      
      // Validate showcase data
      if (showcase && showcase.subdomain && showcase.highlights && showcase.generatedAt) {
        return showcase;
      }
      return null;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete showcase
   * @param {string} subdomain - Site subdomain
   * @returns {Promise<boolean>} Success status
   */
  async deleteShowcase(subdomain) {
    try {
      const dir = path.join(this.screenshotDir, subdomain);
      
      // Check if directory exists
      try {
        await fs.access(dir);
      } catch (error) {
        // Directory doesn't exist
        return false;
      }
      
      // Delete the directory
      await fs.rm(dir, { recursive: true, force: true });
      
      // Clear from cache
      this.cache.delete(subdomain);
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * List all showcases
   * @returns {Promise<Array>} List of showcases
   */
  async listShowcases() {
    try {
      const entries = await fs.readdir(this.screenshotDir, { withFileTypes: true });
      const showcases = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const showcase = await this.loadShowcase(entry.name);
          if (showcase) {
            showcases.push({
              subdomain: showcase.subdomain,
              generatedAt: showcase.generatedAt,
              url: showcase.url
            });
          }
        }
      }

      // Sort by creation date (newest first)
      showcases.sort((a, b) => 
        new Date(b.generatedAt) - new Date(a.generatedAt)
      );

      return showcases;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Refresh showcase (regenerate with fresh screenshots)
   * @param {string} subdomain - Site subdomain
   * @returns {Promise<Object>} New showcase data
   */
  async refreshShowcase(subdomain) {
    // Clear cache
    this.cache.delete(subdomain);
    
    // Delete old showcase
    await this.deleteShowcase(subdomain);
    
    // Generate new showcase
    return await this.generateShowcase(subdomain);
  }

  /**
   * Get service statistics (REFACTOR: Monitoring)
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      activeTasks: this.activeTasks,
      pagePoolSize: this.pagePool.length,
      browserActive: this.browser !== null
    };
  }
}

export default ShowcaseService;

