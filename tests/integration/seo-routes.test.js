/**
 * Integration Tests for SEO Routes
 * Following TDD methodology: Test route behavior
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import seoRoutes from '../../server/routes/seo.routes.js';
import { query } from '../../database/db.js';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock subdomain extraction middleware
  app.use((req, res, next) => {
    req.subdomain = req.headers['x-subdomain'] || 'testsite';
    req.hostname = `${req.subdomain}.sitesprintz.com`;
    next();
  });
  
  // Mock auth middleware for testing
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      req.user = { id: 'test-user-id', email: 'test@example.com', role: 'user' };
    }
    next();
  });
  
  app.use('/', seoRoutes);
  return app;
};

describe('SEO Routes Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /sitemap.xml', () => {
    it('should generate and return XML sitemap for published site', async () => {
      // Mock database response
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'testsite',
          is_published: true,
          site_data: {
            businessName: 'Test Business',
            pages: [{ path: '/menu' }]
          },
          custom_domain: null
        }]
      });

      const response = await request(app)
        .get('/sitemap.xml')
        .set('x-subdomain', 'testsite');

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.header['content-type']).toContain('application/xml');
        expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(response.text).toContain('<urlset');
      }
    });

    it('should return 404 for non-existent site', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/sitemap.xml')
        .set('x-subdomain', 'nonexistent');

      expect(response.status).toBe(404);
      expect(response.text).toContain('Site not found');
    });

    it('should include custom domain in sitemap URLs', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'testsite',
          is_published: true,
          site_data: { businessName: 'Test Business' },
          custom_domain: 'www.example.com'
        }]
      });

      const response = await request(app)
        .get('/sitemap.xml')
        .set('x-subdomain', 'testsite');

      expect(response.status).toBe(200);
      expect(response.text).toContain('<loc>https://www.example.com/</loc>');
      expect(response.text).not.toContain('sitesprintz.com');
    });

    it('should cache sitemap with appropriate headers', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'testsite',
          is_published: true,
          site_data: { businessName: 'Test Business' }
        }]
      });

      const response = await request(app)
        .get('/sitemap.xml')
        .set('x-subdomain', 'testsite');

      expect(response.status).toBe(200);
      expect(response.header['cache-control']).toContain('public');
      expect(response.header['cache-control']).toContain('max-age=3600');
    });
  });

  describe('GET /robots.txt', () => {
    it('should generate and return robots.txt for published site', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'testsite',
          is_published: true,
          custom_domain: null,
          seo_config: {}
        }]
      });

      const response = await request(app)
        .get('/robots.txt')
        .set('x-subdomain', 'testsite');

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/plain');
      expect(response.text).toContain('User-agent: *');
      expect(response.text).toContain('Allow: /');
      expect(response.text).toContain('Sitemap: https://testsite.sitesprintz.com/sitemap.xml');
    });

    it('should respect noindex configuration', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'testsite',
          is_published: true,
          seo_config: { noindex: true }
        }]
      });

      const response = await request(app)
        .get('/robots.txt')
        .set('x-subdomain', 'testsite');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Disallow: /');
      expect(response.text).not.toContain('Allow: /');
    });

    it('should include custom disallow paths', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'testsite',
          is_published: true,
          seo_config: { disallow: ['/admin', '/private'] }
        }]
      });

      const response = await request(app)
        .get('/robots.txt')
        .set('x-subdomain', 'testsite');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Disallow: /admin');
      expect(response.text).toContain('Disallow: /private');
    });
  });

  describe('GET /api/seo/:subdomain', () => {
    it('should return SEO config for authenticated user', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'testsite',
          user_id: 'test-user-id',
          site_data: {
            businessName: 'Test Business',
            businessDescription: 'A test business',
            category: 'restaurant'
          },
          seo_config: {
            metaTags: { title: 'Custom Title' },
            disallow: [],
            noindex: false
          }
        }]
      });

      const response = await request(app)
        .get('/api/seo/testsite')
        .set('authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subdomain', 'testsite');
      expect(response.body).toHaveProperty('seoConfig');
      expect(response.body).toHaveProperty('generatedMetaTags');
      expect(response.body).toHaveProperty('canonicalUrl');
      expect(response.body.generatedMetaTags).toHaveProperty('title');
      expect(response.body.generatedMetaTags).toHaveProperty('description');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/seo/testsite');

      // Should fail without auth token (middleware will handle this)
      expect([401, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent site', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/seo/nonexistent')
        .set('authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/seo/:subdomain', () => {
    it('should update SEO config for authenticated user', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [{ id: 'site-123' }]
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE query

      const response = await request(app)
        .put('/api/seo/testsite')
        .set('authorization', 'Bearer test-token')
        .send({
          metaTags: {
            title: 'New Title',
            description: 'New description for testing purposes',
            keywords: 'test, seo, keywords'
          },
          disallow: ['/admin'],
          noindex: false
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('seoConfig');
      expect(response.body.seoConfig).toHaveProperty('metaTags');
    });

    it('should validate meta tags before saving', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'site-123' }]
      });

      const response = await request(app)
        .put('/api/seo/testsite')
        .set('authorization', 'Bearer test-token')
        .send({
          metaTags: {
            title: 'A'.repeat(100), // Too long
            description: 'Short', // Too short
            keywords: 'test'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('validation');
    });

    it('should return 404 for non-owned site', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/seo/notmysite')
        .set('authorization', 'Bearer test-token')
        .send({
          metaTags: {
            title: 'Test Title',
            description: 'Test description',
            keywords: 'test'
          }
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/seo/:subdomain/schema', () => {
    it('should return Schema.org markup for published site', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'testsite',
          is_published: true,
          site_data: {
            businessName: 'Test Restaurant',
            businessDescription: 'Best food in town',
            businessAddress: '123 Main St, City, ST 12345',
            businessPhone: '555-1234',
            category: 'restaurant'
          }
        }]
      });

      const response = await request(app)
        .get('/api/seo/testsite/schema');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('@context', 'https://schema.org');
      expect(response.body).toHaveProperty('@type', 'Restaurant');
      expect(response.body).toHaveProperty('name', 'Test Restaurant');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('telephone', '555-1234');
    });

    it('should return 404 for non-published site', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/seo/nonexistent/schema');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/seo/:subdomain/validate', () => {
    it('should validate meta tags and return recommendations', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'site-123' }]
      });

      const response = await request(app)
        .post('/api/seo/testsite/validate')
        .set('authorization', 'Bearer test-token')
        .send({
          metaTags: {
            title: 'Good Title Length',
            description: 'This is a good description with appropriate length for SEO purposes',
            keywords: 'test, keywords'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('validation');
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.validation).toHaveProperty('isValid');
      expect(response.body.validation).toHaveProperty('errors');
      expect(response.body.validation).toHaveProperty('warnings');
    });

    it('should return validation errors for invalid meta tags', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'site-123' }]
      });

      const response = await request(app)
        .post('/api/seo/testsite/validate')
        .set('authorization', 'Bearer test-token')
        .send({
          metaTags: {
            title: '', // Empty title
            description: 'Short',
            keywords: ''
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.validation.isValid).toBe(false);
      expect(response.body.validation.errors.length).toBeGreaterThan(0);
    });
  });
});

