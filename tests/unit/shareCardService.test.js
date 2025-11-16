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
  extractFeatures,
  generateShareCard,
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

  describe('extractFeatures - Universal Feature Detection', () => {
    it('should extract features from Starter template', () => {
      const normalized = {
        tier: 'Starter',
        hasCheckout: false,
        products: [1, 2, 3],
        services: [1, 2],
        hasTestimonials: true,
        avgRating: 4.8
      };

      const features = extractFeatures(normalized);

      expect(features).toContain('3+ Products');
      expect(features).toContain('2+ Services');
      expect(features).toContain('4.8★ Reviews');
      expect(features).not.toContain('Online Ordering');
    });

    it('should extract features from Pro template', () => {
      const normalized = {
        tier: 'Pro',
        hasCheckout: true,
        hasBooking: true,
        hasAnalytics: true,
        hasReviews: true,
        products: [1, 2, 3, 4, 5]
      };

      const features = extractFeatures(normalized);

      expect(features).toContain('Online Ordering');
      expect(features).toContain('Book Appointments');
      expect(features).toContain('Real-time Analytics');
      expect(features).toContain('Google Reviews');
    });

    it('should extract features from Premium template', () => {
      const normalized = {
        tier: 'Premium',
        hasAdvancedForms: true,
        hasClientPortal: true,
        hasAutomation: true
      };

      const features = extractFeatures(normalized);

      expect(features.length).toBeGreaterThan(0);
      expect(features.length).toBeLessThanOrEqual(4);
    });

    it('should limit features to 4 maximum', () => {
      const normalized = {
        tier: 'Pro',
        hasCheckout: true,
        hasBooking: true,
        hasAnalytics: true,
        hasReviews: true,
        products: [1, 2, 3, 4, 5],
        services: [1, 2, 3],
        hasTestimonials: true,
        hasGallery: true,
        avgRating: 5
      };

      const features = extractFeatures(normalized);

      expect(features.length).toBeLessThanOrEqual(4);
    });

    it('should handle template with no features', () => {
      const normalized = {
        tier: 'Starter',
        hasCheckout: false
      };

      const features = extractFeatures(normalized);

      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThanOrEqual(1); // At least "Professional Website"
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

    it('should include QR code', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' }
      };

      const buffer = await generateShareCard(data, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      // QR code should be embedded in image
      expect(buffer.length).toBeGreaterThan(20000); // With QR code, image should be substantial
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

  describe('Template-Specific Features', () => {
    it('should show different features for Starter vs Pro', async () => {
      const starterData = {
        subdomain: 'starter',
        plan: 'Starter',
        brand: { name: 'Starter Biz' },
        settings: { allowCheckout: false }
      };

      const proData = {
        subdomain: 'pro',
        plan: 'Pro',
        brand: { name: 'Pro Biz' },
        settings: { allowCheckout: true },
        features: { booking: { enabled: true } }
      };

      const starterBuffer = await generateShareCard(starterData, 'social');
      const proBuffer = await generateShareCard(proData, 'social');

      expect(starterBuffer).toBeInstanceOf(Buffer);
      expect(proBuffer).toBeInstanceOf(Buffer);
      
      // Different features should result in different images
      expect(starterBuffer.length).not.toBe(proBuffer.length);
    });
  });
});

