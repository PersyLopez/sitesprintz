/**
 * SEO Service Unit Tests
 * Following TDD methodology: RED-GREEN-REFACTOR
 * Tests written FIRST, implementation follows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import SEOService from '../../server/services/seoService.js';

describe('SEOService', () => {
  let seoService;

  beforeEach(() => {
    seoService = new SEOService();
  });

  describe('generateMetaTags', () => {
    it('should generate basic meta tags for a site', () => {
      const siteData = {
        businessName: 'Best Pizza',
        businessDescription: 'Authentic Italian pizza in downtown',
        businessPhone: '555-1234',
        businessEmail: 'info@bestpizza.com',
        category: 'restaurant'
      };

      const metaTags = seoService.generateMetaTags(siteData);

      expect(metaTags).toHaveProperty('title');
      expect(metaTags).toHaveProperty('description');
      expect(metaTags).toHaveProperty('keywords');
      expect(metaTags.title).toContain('Best Pizza');
      expect(metaTags.description).toContain('Authentic Italian pizza');
    });

    it('should generate proper title tag with character limit', () => {
      const siteData = {
        businessName: 'A'.repeat(100),
        businessDescription: 'Test description',
        category: 'restaurant'
      };

      const metaTags = seoService.generateMetaTags(siteData);

      expect(metaTags.title.length).toBeLessThanOrEqual(60);
    });

    it('should generate description with optimal length', () => {
      const siteData = {
        businessName: 'Best Pizza',
        businessDescription: 'A'.repeat(300),
        category: 'restaurant'
      };

      const metaTags = seoService.generateMetaTags(siteData);

      expect(metaTags.description.length).toBeLessThanOrEqual(160);
      expect(metaTags.description.length).toBeGreaterThan(50);
    });

    it('should generate category-specific keywords', () => {
      const restaurantData = {
        businessName: 'Best Pizza',
        businessDescription: 'Authentic Italian pizza',
        category: 'restaurant'
      };

      const metaTags = seoService.generateMetaTags(restaurantData);

      expect(metaTags.keywords).toContain('restaurant');
      expect(metaTags.keywords).toContain('food');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalData = {
        businessName: 'Test Business',
        category: 'consultant'
      };

      const metaTags = seoService.generateMetaTags(minimalData);

      expect(metaTags.title).toBeTruthy();
      expect(metaTags.description).toBeTruthy();
      expect(metaTags.keywords).toBeTruthy();
    });

    it('should include Open Graph tags', () => {
      const siteData = {
        businessName: 'Best Pizza',
        businessDescription: 'Authentic Italian pizza',
        category: 'restaurant',
        logo: 'https://example.com/logo.png'
      };

      const metaTags = seoService.generateMetaTags(siteData);

      expect(metaTags).toHaveProperty('og:title');
      expect(metaTags).toHaveProperty('og:description');
      expect(metaTags).toHaveProperty('og:type');
      expect(metaTags['og:type']).toBe('website');
    });

    it('should include Twitter Card tags', () => {
      const siteData = {
        businessName: 'Best Pizza',
        businessDescription: 'Authentic Italian pizza',
        category: 'restaurant'
      };

      const metaTags = seoService.generateMetaTags(siteData);

      expect(metaTags).toHaveProperty('twitter:card');
      expect(metaTags).toHaveProperty('twitter:title');
      expect(metaTags).toHaveProperty('twitter:description');
      expect(metaTags['twitter:card']).toBe('summary_large_image');
    });
  });

  describe('generateSchemaMarkup', () => {
    it('should generate LocalBusiness schema for restaurant', () => {
      const siteData = {
        businessName: 'Best Pizza',
        businessDescription: 'Authentic Italian pizza',
        businessAddress: '123 Main St, City, ST 12345',
        businessPhone: '555-1234',
        businessEmail: 'info@bestpizza.com',
        category: 'restaurant'
      };

      const schema = seoService.generateSchemaMarkup('restaurant', siteData);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Restaurant');
      expect(schema.name).toBe('Best Pizza');
      expect(schema.description).toBe('Authentic Italian pizza');
      expect(schema.telephone).toBe('555-1234');
    });

    it('should generate address object in schema', () => {
      const siteData = {
        businessName: 'Best Salon',
        businessAddress: '123 Main St, City, ST 12345',
        category: 'salon'
      };

      const schema = seoService.generateSchemaMarkup('salon', siteData);

      expect(schema.address).toBeTruthy();
      expect(schema.address['@type']).toBe('PostalAddress');
      expect(schema.address.streetAddress).toBeTruthy();
    });

    it('should generate Product schema for product showcase', () => {
      const productData = {
        name: 'Premium Widget',
        description: 'Best widget in the market',
        price: 99.99,
        currency: 'USD',
        image: 'https://example.com/widget.jpg'
      };

      const schema = seoService.generateSchemaMarkup('product', productData);

      expect(schema['@type']).toBe('Product');
      expect(schema.name).toBe('Premium Widget');
      expect(schema.offers).toBeTruthy();
      expect(schema.offers.price).toBe(99.99);
      expect(schema.offers.priceCurrency).toBe('USD');
    });

    it('should generate Service schema for service businesses', () => {
      const serviceData = {
        businessName: 'Plumbing Pro',
        serviceName: 'Emergency Plumbing',
        serviceDescription: '24/7 emergency plumbing services',
        category: 'plumbing'
      };

      const schema = seoService.generateSchemaMarkup('service', serviceData);

      expect(schema['@type']).toBe('Service');
      expect(schema.name).toBe('Emergency Plumbing');
      expect(schema.provider).toBeTruthy();
      expect(schema.provider.name).toBe('Plumbing Pro');
    });

    it('should handle organization schema for consultants', () => {
      const consultantData = {
        businessName: 'Jane Doe Consulting',
        businessDescription: 'Business strategy consultant',
        category: 'consultant'
      };

      const schema = seoService.generateSchemaMarkup('consultant', consultantData);

      expect(schema['@type']).toBe('ProfessionalService');
      expect(schema.name).toBe('Jane Doe Consulting');
    });

    it('should include aggregateRating if reviews exist', () => {
      const siteData = {
        businessName: 'Best Gym',
        category: 'gym',
        averageRating: 4.8,
        reviewCount: 127
      };

      const schema = seoService.generateSchemaMarkup('gym', siteData);

      expect(schema.aggregateRating).toBeTruthy();
      expect(schema.aggregateRating.ratingValue).toBe(4.8);
      expect(schema.aggregateRating.reviewCount).toBe(127);
    });
  });

  describe('generateSitemap', () => {
    it('should generate valid XML sitemap', async () => {
      const subdomain = 'testsite';
      const pages = [
        { path: '/', priority: 1.0, changefreq: 'daily' },
        { path: '/services', priority: 0.8, changefreq: 'weekly' },
        { path: '/contact', priority: 0.6, changefreq: 'monthly' }
      ];

      const sitemap = await seoService.generateSitemap(subdomain, pages);

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain('<urlset');
      expect(sitemap).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
      expect(sitemap).toContain('<url>');
      expect(sitemap).toContain('</urlset>');
    });

    it('should include all pages in sitemap', async () => {
      const subdomain = 'testsite';
      const pages = [
        { path: '/', priority: 1.0, changefreq: 'daily' },
        { path: '/about', priority: 0.7, changefreq: 'monthly' },
        { path: '/services', priority: 0.8, changefreq: 'weekly' }
      ];

      const sitemap = await seoService.generateSitemap(subdomain, pages);

      expect(sitemap).toContain('<loc>https://testsite.sitesprintz.com/</loc>');
      expect(sitemap).toContain('<loc>https://testsite.sitesprintz.com/about</loc>');
      expect(sitemap).toContain('<loc>https://testsite.sitesprintz.com/services</loc>');
    });

    it('should include lastmod dates', async () => {
      const subdomain = 'testsite';
      const pages = [
        { path: '/', priority: 1.0, changefreq: 'daily', lastmod: '2024-01-15' }
      ];

      const sitemap = await seoService.generateSitemap(subdomain, pages);

      expect(sitemap).toContain('<lastmod>2024-01-15</lastmod>');
    });

    it('should include priority and changefreq', async () => {
      const subdomain = 'testsite';
      const pages = [
        { path: '/', priority: 1.0, changefreq: 'daily' }
      ];

      const sitemap = await seoService.generateSitemap(subdomain, pages);

      expect(sitemap).toContain('<priority>1.0</priority>');
      expect(sitemap).toContain('<changefreq>daily</changefreq>');
    });

    it('should handle custom domain if provided', async () => {
      const subdomain = 'testsite';
      const customDomain = 'www.example.com';
      const pages = [
        { path: '/', priority: 1.0, changefreq: 'daily' }
      ];

      const sitemap = await seoService.generateSitemap(subdomain, pages, { customDomain });

      expect(sitemap).toContain('<loc>https://www.example.com/</loc>');
      expect(sitemap).not.toContain('sitesprintz.com');
    });
  });

  describe('generateRobotsTxt', () => {
    it('should generate robots.txt with sitemap URL', () => {
      const subdomain = 'testsite';

      const robotsTxt = seoService.generateRobotsTxt(subdomain);

      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Allow: /');
      expect(robotsTxt).toContain('Sitemap: https://testsite.sitesprintz.com/sitemap.xml');
    });

    it('should disallow specific paths if provided', () => {
      const subdomain = 'testsite';
      const options = {
        disallow: ['/admin', '/private']
      };

      const robotsTxt = seoService.generateRobotsTxt(subdomain, options);

      expect(robotsTxt).toContain('Disallow: /admin');
      expect(robotsTxt).toContain('Disallow: /private');
    });

    it('should handle custom domain in sitemap URL', () => {
      const subdomain = 'testsite';
      const options = {
        customDomain: 'www.example.com'
      };

      const robotsTxt = seoService.generateRobotsTxt(subdomain, options);

      expect(robotsTxt).toContain('Sitemap: https://www.example.com/sitemap.xml');
      expect(robotsTxt).not.toContain('sitesprintz.com');
    });

    it('should block all if noindex option is true', () => {
      const subdomain = 'testsite';
      const options = {
        noindex: true
      };

      const robotsTxt = seoService.generateRobotsTxt(subdomain, options);

      expect(robotsTxt).toContain('Disallow: /');
      expect(robotsTxt).not.toContain('Allow: /');
    });
  });

  describe('getCanonicalUrl', () => {
    it('should generate canonical URL for subdomain', () => {
      const subdomain = 'testsite';
      const path = '/services';

      const canonical = seoService.getCanonicalUrl(subdomain, path);

      expect(canonical).toBe('https://testsite.sitesprintz.com/services');
    });

    it('should handle root path', () => {
      const subdomain = 'testsite';
      const path = '/';

      const canonical = seoService.getCanonicalUrl(subdomain, path);

      expect(canonical).toBe('https://testsite.sitesprintz.com/');
    });

    it('should remove trailing slashes from paths', () => {
      const subdomain = 'testsite';
      const path = '/services/';

      const canonical = seoService.getCanonicalUrl(subdomain, path);

      expect(canonical).toBe('https://testsite.sitesprintz.com/services');
    });

    it('should handle custom domain', () => {
      const subdomain = 'testsite';
      const path = '/about';
      const options = {
        customDomain: 'www.example.com'
      };

      const canonical = seoService.getCanonicalUrl(subdomain, path, options);

      expect(canonical).toBe('https://www.example.com/about');
      expect(canonical).not.toContain('sitesprintz.com');
    });

    it('should handle query parameters by removing them', () => {
      const subdomain = 'testsite';
      const path = '/services?utm_source=google';

      const canonical = seoService.getCanonicalUrl(subdomain, path);

      expect(canonical).toBe('https://testsite.sitesprintz.com/services');
      expect(canonical).not.toContain('utm_source');
    });
  });

  describe('parseAddress', () => {
    it('should parse full address string', () => {
      const addressString = '123 Main St, New York, NY 10001';

      const parsed = seoService.parseAddress(addressString);

      expect(parsed.streetAddress).toBe('123 Main St');
      expect(parsed.addressLocality).toBe('New York');
      expect(parsed.addressRegion).toBe('NY');
      expect(parsed.postalCode).toBe('10001');
    });

    it('should handle addresses without postal code', () => {
      const addressString = '456 Oak Ave, Los Angeles, CA';

      const parsed = seoService.parseAddress(addressString);

      expect(parsed.streetAddress).toBe('456 Oak Ave');
      expect(parsed.addressLocality).toBe('Los Angeles');
      expect(parsed.addressRegion).toBe('CA');
    });

    it('should return null for invalid addresses', () => {
      const addressString = 'invalid';

      const parsed = seoService.parseAddress(addressString);

      expect(parsed).toBeNull();
    });
  });

  describe('optimization methods', () => {
    it('should suggest alt tags for images without them', () => {
      const images = [
        { src: '/images/pizza-margherita.jpg', alt: '' },
        { src: '/images/pasta-carbonara.jpg', alt: 'Pasta' },
        { src: '/images/tiramisu.jpg', alt: '' }
      ];

      const suggestions = seoService.suggestAltTags(images);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].src).toBe('/images/pizza-margherita.jpg');
      expect(suggestions[0].suggestedAlt).toContain('pizza');
      expect(suggestions[0].suggestedAlt).toContain('margherita');
    });

    it('should validate meta tags and provide recommendations', () => {
      const metaTags = {
        title: 'A'.repeat(70), // Too long
        description: 'Short', // Too short
        keywords: ''
      };

      const validation = seoService.validateMetaTags(metaTags);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Title is too long');
      expect(validation.warnings).toContain('Description is too short');
    });
  });
});

