/**
 * Share Card Service - TDD Unit Tests (RED PHASE)
 * 
 * Testing Strategy:
 * - Template-agnostic: Works for Starter, Pro, Premium
 * - Comprehensive: All edge cases covered
 * - Modular: Easy to extend
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeTemplateData,
  extractOfferLines,
  generateShareCard,
  generateQrPng,
  calculateCardDimensions,
  escapeHtml,
  wrapText
} from '../../server/services/shareCardService.js';
import sharp from 'sharp';

describe('ShareCardService - Universal Template Support (TDD)', () => {
  
  describe('normalizeTemplateData - Template Agnostic', () => {
    it('should normalize Starter template data', () => {
      const starterTemplate = {
        subdomain: 'test-starter',
        plan: 'Starter',
        brand: { name: 'Test Business' },
        hero: { 
          title: 'Welcome',
          subtitle: 'Best business in town',
          image: 'https://example.com/hero.jpg'
        },
        settings: { allowCheckout: false },
        products: [{ name: 'Product 1' }, { name: 'Product 2' }]
      };

      const normalized = normalizeTemplateData(starterTemplate);

      expect(normalized).toHaveProperty('businessName', 'Test Business');
      expect(normalized).toHaveProperty('tagline', 'Best business in town');
      expect(normalized).toHaveProperty('heroImage', 'https://example.com/hero.jpg');
      expect(normalized).toHaveProperty('subdomain', 'test-starter');
      expect(normalized).toHaveProperty('tier', 'Starter');
      expect(normalized.products).toHaveLength(2);
    });

    it('should normalize Pro template data', () => {
      const proTemplate = {
        subdomain: 'test-pro',
        plan: 'Pro',
        brand: { name: 'Pro Business' },
        hero: { 
          title: 'Professional',
          subtitle: 'Pro services',
          image: 'https://example.com/pro-hero.jpg'
        },
        settings: { allowCheckout: true },
        features: {
          booking: { enabled: true, provider: 'Calendly' },
          analytics: true,
          reviews: { enabled: true }
        },
        products: [1, 2, 3, 4, 5]
      };

      const normalized = normalizeTemplateData(proTemplate);

      expect(normalized.tier).toBe('Pro');
      expect(normalized.businessName).toBe('Pro Business');
      expect(normalized.hasCheckout).toBe(true);
      expect(normalized.hasBooking).toBe(true);
      expect(normalized.hasAnalytics).toBe(true);
      expect(normalized.hasReviews).toBe(true);
    });

    it('should normalize Premium template data with meta structure', () => {
      const premiumTemplate = {
        subdomain: 'test-premium',
        plan: 'Premium',
        meta: {
          businessName: 'Premium Corp',
          pageTitle: 'Premium Services',
          logo: 'https://example.com/logo.png'
        },
        hero: { 
          title: 'Premium Title',
          image: 'https://example.com/premium-hero.jpg'
        }
      };

      const normalized = normalizeTemplateData(premiumTemplate);

      expect(normalized.tier).toBe('Premium');
      expect(normalized.businessName).toBe('Premium Corp');
      expect(normalized.heroImage).toBe('https://example.com/premium-hero.jpg');
    });

    it('should handle missing hero subtitle with fallback to title', () => {
      const template = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: { title: 'Main Title' }
      };

      const normalized = normalizeTemplateData(template);

      expect(normalized.tagline).toBe('Main Title');
    });

    it('should provide default tagline if both subtitle and title missing', () => {
      const template = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: {}
      };

      const normalized = normalizeTemplateData(template);

      expect(normalized.tagline).toBe('Welcome to our business');
    });

    it('should provide placeholder image if hero image missing', () => {
      const template = {
        subdomain: 'test',
        brand: { name: 'Test' }
      };

      const normalized = normalizeTemplateData(template);

      expect(normalized.heroImage).toContain('placeholder');
    });

    it('should handle missing brand name', () => {
      const template = {
        subdomain: 'test-subdomain'
      };

      const normalized = normalizeTemplateData(template);

      expect(normalized.businessName).toBe('test-subdomain');
    });

    it('should detect services from services.items', () => {
      const template = {
        subdomain: 'test',
        brand: { name: 'Test' },
        services: {
          items: [{ title: 'Service 1' }, { title: 'Service 2' }]
        }
      };

      const normalized = normalizeTemplateData(template);

      expect(normalized.services).toHaveLength(2);
    });

    it('should detect testimonials', () => {
      const template = {
        subdomain: 'test',
        brand: { name: 'Test' },
        testimonials: {
          items: [
            { rating: 5, text: 'Great!' },
            { rating: 4, text: 'Good' }
          ]
        }
      };

      const normalized = normalizeTemplateData(template);

      expect(normalized.hasTestimonials).toBe(true);
      expect(normalized.avgRating).toBe(4.5);
    });
  });

  describe('extractOfferLines - shop offer, not platform pills', () => {
    it('formats priced salon services from catalog', () => {
      const siteData = {
        services: {
          items: [
            { name: 'Haircut', price: 23 },
            { name: 'Color', price: 85 },
            { name: 'Blowout', price: 40 },
          ],
        },
      };

      const lines = extractOfferLines(siteData);

      expect(lines).toEqual(['Haircut · $23.00', 'Color · $85.00', 'Blowout · $40.00']);
      expect(lines).not.toContain('Online Ordering');
      expect(lines).not.toContain('Professional Website');
    });

    it('formats product shop catalog', () => {
      const siteData = {
        products: [
          { name: 'Silk scarf', price: 42 },
          { name: 'Tote', price: 28 },
        ],
      };

      const lines = extractOfferLines(siteData);

      expect(lines).toContain('Silk scarf · $42.00');
      expect(lines).toContain('Tote · $28.00');
    });

    it('includes named services without a price after priced catalog rows', () => {
      const siteData = {
        products: [{ name: 'Balm', price: 12 }],
        services: {
          items: [{ title: 'Consult' }],
        },
      };

      const lines = extractOfferLines(siteData);

      expect(lines[0]).toBe('Balm · $12.00');
      expect(lines).toContain('Consult');
    });

    it('caps at four lines', () => {
      const siteData = {
        products: [1, 2, 3, 4, 5].map((n) => ({ name: `Item ${n}`, price: n * 10 })),
      };

      expect(extractOfferLines(siteData).length).toBe(4);
    });

    it('returns empty for empty Starter — no invented pills', () => {
      const lines = extractOfferLines({
        brand: { name: 'River Salon' },
        settings: { allowCheckout: false },
      });

      expect(lines).toEqual([]);
    });

    it('respects a smaller social limit', () => {
      const siteData = {
        products: [
          { name: 'A', price: 1 },
          { name: 'B', price: 2 },
          { name: 'C', price: 3 },
        ],
      };

      expect(extractOfferLines(siteData, { limit: 2 })).toHaveLength(2);
    });
  });

  describe('calculateCardDimensions', () => {
    it('should return correct dimensions for social format', () => {
      const dims = calculateCardDimensions('social');
      expect(dims).toEqual({ width: 1200, height: 630 });
    });

    it('should return correct dimensions for story format', () => {
      const dims = calculateCardDimensions('story');
      expect(dims).toEqual({ width: 1080, height: 1920 });
    });

    it('should return correct dimensions for square format', () => {
      const dims = calculateCardDimensions('square');
      expect(dims).toEqual({ width: 1080, height: 1080 });
    });

    it('should default to social format for invalid input', () => {
      const dims = calculateCardDimensions('invalid');
      expect(dims).toEqual({ width: 1200, height: 630 });
    });

    it('should handle null input', () => {
      const dims = calculateCardDimensions(null);
      expect(dims).toEqual({ width: 1200, height: 630 });
    });
  });

  describe('escapeHtml - Security', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const escaped = escapeHtml(input);
      
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });

    it('should escape quotes', () => {
      const input = 'Test "Company" & \'Business\'';
      const escaped = escapeHtml(input);
      
      expect(escaped).toContain('&quot;');
      expect(escaped).toContain('&#039;');
      expect(escaped).toContain('&amp;');
    });

    it('should handle empty string', () => {
      const escaped = escapeHtml('');
      expect(escaped).toBe('');
    });

    it('should handle null', () => {
      const escaped = escapeHtml(null);
      expect(escaped).toBe('');
    });
  });

  describe('wrapText - Text Formatting', () => {
    it('should split long text into multiple lines', () => {
      const ctx = {
        measureText: (text) => ({ width: text.length * 10 })
      };
      
      const text = 'This is a very long text that should be wrapped into multiple lines';
      const maxWidth = 200;
      
      const lines = wrapText(ctx, text, maxWidth);
      
      expect(Array.isArray(lines)).toBe(true);
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should return single line for short text', () => {
      const ctx = {
        measureText: (text) => ({ width: text.length * 10 })
      };
      
      const text = 'Short text';
      const maxWidth = 500;
      
      const lines = wrapText(ctx, text, maxWidth);
      
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('Short text');
    });

    it('should limit to 2 lines maximum', () => {
      const ctx = {
        measureText: (text) => ({ width: text.length * 10 })
      };
      
      const text = 'This is a very very long text that could potentially wrap into many many lines but should be limited';
      const maxWidth = 100;
      
      const lines = wrapText(ctx, text, maxWidth);
      
      expect(lines.length).toBeLessThanOrEqual(2);
    });
  });

  describe('generateShareCard - Universal Card Generation', () => {
    it('should generate card for Starter template', async () => {
      const starterData = {
        subdomain: 'test-starter',
        brand: { name: 'Starter Business' },
        hero: { subtitle: 'Simple & effective', image: 'https://via.placeholder.com/1200x630' }
      };

      const buffer = await generateShareCard(starterData, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      const metadata = await sharp(buffer).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(630);
      expect(metadata.format).toBe('png');
    });

    it('should generate card for Pro template', async () => {
      const proData = {
        subdomain: 'test-pro',
        plan: 'Pro',
        brand: { name: 'Pro Business' },
        hero: { subtitle: 'Professional services' },
        features: { booking: { enabled: true } }
      };

      const buffer = await generateShareCard(proData, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate card for Premium template', async () => {
      const premiumData = {
        subdomain: 'test-premium',
        plan: 'Premium',
        meta: { businessName: 'Premium Corp' },
        hero: { title: 'Premium Services' }
      };

      const buffer = await generateShareCard(premiumData, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle all formats', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' }
      };

      const formats = ['social', 'story', 'square'];

      for (const format of formats) {
        const buffer = await generateShareCard(data, format);
        const metadata = await sharp(buffer).metadata();
        
        expect(buffer).toBeInstanceOf(Buffer);
        expect(metadata.format).toBe('png');
        
        const dims = calculateCardDimensions(format);
        expect(metadata.width).toBe(dims.width);
        expect(metadata.height).toBe(dims.height);
      }
    });

    it('should handle missing hero image gracefully', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: { subtitle: 'Test' }
        // No hero.image
      };

      const buffer = await generateShareCard(data, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      // Should use gradient background
    });

    it('should escape HTML in business name', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test & "Company" <Inc>' },
        hero: { subtitle: 'Safe subtitle' }
      };

      const buffer = await generateShareCard(data, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      // Should not contain raw HTML/scripts
    });

    it('should handle long business names', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Very Long Business Name That Should Be Handled Properly Without Breaking' },
        hero: { subtitle: 'Test' }
      };

      const buffer = await generateShareCard(data, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should include QR code on story format', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' }
      };

      const buffer = await generateShareCard(data, 'story');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(20000);
    });

    it('should generate lighter social OG card without QR footer', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: { subtitle: 'OG highlight' }
      };

      const socialBuffer = await generateShareCard(data, 'social');
      const storyBuffer = await generateShareCard(data, 'story');

      expect(socialBuffer).toBeInstanceOf(Buffer);
      expect(storyBuffer).toBeInstanceOf(Buffer);
      expect(socialBuffer.length).not.toBe(storyBuffer.length);
    });

    it('should optimize image quality', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' }
      };

      const buffer = await generateShareCard(data, 'social');
      const metadata = await sharp(buffer).metadata();

      // Should be high quality PNG
      expect(metadata.format).toBe('png');
      // File size should be reasonable (not too large, not too small)
      expect(buffer.length).toBeGreaterThan(10000);
      expect(buffer.length).toBeLessThan(2000000);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for null template data', async () => {
      await expect(generateShareCard(null, 'social'))
        .rejects.toThrow('Invalid template data');
    });

    it('should throw error for undefined template data', async () => {
      await expect(generateShareCard(undefined, 'social'))
        .rejects.toThrow('Invalid template data');
    });

    it('should handle image load failures gracefully', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: { image: 'https://invalid-url-that-will-fail-123456789.com/image.jpg' }
      };

      // Should not throw, should fallback to gradient
      const buffer = await generateShareCard(data, 'social');
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle network timeouts', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: { image: 'https://httpstat.us/200?sleep=15000' } // 15s timeout
      };

      // Should timeout and use fallback
      const buffer = await generateShareCard(data, 'social');
      expect(buffer).toBeInstanceOf(Buffer);
    }, 20000);

    it('should handle empty subdomain', async () => {
      const data = {
        subdomain: '',
        brand: { name: 'Test' }
      };

      const buffer = await generateShareCard(data, 'social');
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generateQrPng', () => {
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    it('returns a PNG buffer for a valid URL', async () => {
      const buffer = await generateQrPng('https://rightsitelight.com/view/share-demo', { width: 64 });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);

      const metadata = await sharp(buffer).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBeLessThanOrEqual(64);
      expect(metadata.height).toBeLessThanOrEqual(64);
      expect(buffer.length).toBeGreaterThan(32);
      expect(buffer.length).toBeLessThan(20_000);
    });

    it('throws for invalid input', async () => {
      await expect(generateQrPng(null)).rejects.toThrow('Invalid site URL');
      await expect(generateQrPng(undefined)).rejects.toThrow('Invalid site URL');
      await expect(generateQrPng('')).rejects.toThrow('Invalid site URL');
      await expect(generateQrPng(42)).rejects.toThrow('Invalid site URL');
    });
  });

  describe('Template-Specific Features', () => {
    it('should show different offer lines for a catalog shop vs empty Starter', async () => {
      const starterData = {
        subdomain: 'starter',
        plan: 'Starter',
        brand: { name: 'Starter Biz' },
        settings: { allowCheckout: false }
      };

      const catalogData = {
        subdomain: 'pro',
        plan: 'Pro',
        brand: { name: 'Pro Biz' },
        products: [{ name: 'Haircut', price: 23 }],
      };

      const starterBuffer = await generateShareCard(starterData, 'square');
      const catalogBuffer = await generateShareCard(catalogData, 'square');

      expect(starterBuffer).toBeInstanceOf(Buffer);
      expect(catalogBuffer).toBeInstanceOf(Buffer);
      expect(starterBuffer.length).not.toBe(catalogBuffer.length);
    });
  });
});

