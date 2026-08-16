import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../../database/db.js';
import seoRoutes from '../../server/routes/seo.routes.js';
import express from 'express';

describe('SEO Routes - Sitemap and Robots', () => {
  let app;
  let testSiteId;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/', seoRoutes);

    // Create a test published site
    testSiteId = 'test-sitemap-' + Date.now();
    await prisma.sites.create({
      data: {
        id: testSiteId,
        subdomain: testSiteId,
        user_id: 'test-user',
        site_data: {
          businessName: 'Test Cleaning',
          businessDescription: 'Professional cleaning services',
          sections: [
            { type: 'hero', enabled: true, order: 1 },
            { type: 'services', enabled: true, order: 2 },
            { type: 'about', enabled: true, order: 3 },
            { type: 'contact', enabled: true, order: 4 }
          ]
        },
        status: 'published'
      }
    });
  });

  afterAll(async () => {
    // Clean up test site
    if (testSiteId) {
      await prisma.sites.delete({
        where: { id: testSiteId }
      }).catch(() => {});
    }
  });

  describe('GET /sites/:siteId/sitemap.xml', () => {
    it('should return valid XML sitemap for published site', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/sitemap.xml`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/xml');
      expect(response.text).toContain('<?xml version="1.0"');
      expect(response.text).toContain('<urlset');
      expect(response.text).toContain('</urlset>');
    });

    it('should include homepage URL with highest priority', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/sitemap.xml`)
        .expect(200);

      expect(response.text).toContain('<loc>');
      expect(response.text).toContain('<priority>1.0</priority>');
    });

    it('should include section URLs', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/sitemap.xml`)
        .expect(200);

      expect(response.text).toContain('#services');
      expect(response.text).toContain('#about');
      expect(response.text).toContain('#contact');
    });

    it('should include proper XML tags', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/sitemap.xml`)
        .expect(200);

      expect(response.text).toContain('<loc>');
      expect(response.text).toContain('</loc>');
      expect(response.text).toContain('<priority>');
      expect(response.text).toContain('</priority>');
      expect(response.text).toContain('<changefreq>');
      expect(response.text).toContain('</changefreq>');
    });

    it('should set proper cache headers', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/sitemap.xml`)
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age=3600');
    });

    it('should return 404 for non-existent site', async () => {
      await request(app)
        .get('/sites/non-existent-site/sitemap.xml')
        .expect(404);
    });

    it('should return 404 for unpublished site', async () => {
      const unpublishedSite = await prisma.sites.create({
        data: {
          id: 'unpublished-' + Date.now(),
          subdomain: 'unpublished-' + Date.now(),
          user_id: 'test-user',
          site_data: {},
          status: 'draft'
        }
      });

      await request(app)
        .get(`/sites/${unpublishedSite.id}/sitemap.xml`)
        .expect(404);

      await prisma.sites.delete({
        where: { id: unpublishedSite.id }
      });
    });
  });

  describe('GET /sites/:siteId/robots.txt', () => {
    it('should return valid robots.txt', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/robots.txt`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('User-agent: *');
      expect(response.text).toContain('Allow:');
    });

    it('should include sitemap reference', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/robots.txt`)
        .expect(200);

      expect(response.text).toContain('Sitemap:');
    });

    it('should set proper cache headers', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/robots.txt`)
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age=3600');
    });

    it('should return 404 for non-existent site', async () => {
      await request(app)
        .get('/sites/non-existent-site/robots.txt')
        .expect(404);
    });

    it('should return 404 for unpublished site', async () => {
      const unpublishedSite = await prisma.sites.create({
        data: {
          id: 'unpublished-robots-' + Date.now(),
          subdomain: 'unpublished-robots-' + Date.now(),
          user_id: 'test-user',
          site_data: {},
          status: 'draft'
        }
      });

      await request(app)
        .get(`/sites/${unpublishedSite.id}/robots.txt`)
        .expect(404);

      await prisma.sites.delete({
        where: { id: unpublishedSite.id }
      });
    });

    it('should follow robots.txt standard format', async () => {
      const response = await request(app)
        .get(`/sites/${testSiteId}/robots.txt`)
        .expect(200);

      const lines = response.text.split('\n');
      expect(lines.length).toBeGreaterThan(2);
      expect(lines[0]).toMatch(/User-agent/i);
    });
  });

  describe('Integration: Sitemap and Robots consistency', () => {
    it('should have matching site references in both files', async () => {
      const sitemapResponse = await request(app)
        .get(`/sites/${testSiteId}/sitemap.xml`)
        .expect(200);

      const robotsResponse = await request(app)
        .get(`/sites/${testSiteId}/robots.txt`)
        .expect(200);

      // Both should reference the same site domain pattern
      expect(sitemapResponse.text).toContain(testSiteId);
      expect(robotsResponse.text).toContain(testSiteId);
    });

    it('should handle disabled sections correctly', async () => {
      // Create site with mixed enabled/disabled sections
      const mixedSiteId = 'mixed-' + Date.now();
      await prisma.sites.create({
        data: {
          id: mixedSiteId,
          subdomain: mixedSiteId,
          user_id: 'test-user',
          site_data: {
            businessName: 'Mixed Site',
            sections: [
              { type: 'services', enabled: true, order: 1 },
              { type: 'about', enabled: false, order: 2 },
              { type: 'contact', enabled: true, order: 3 }
            ]
          },
          status: 'published'
        }
      });

      const response = await request(app)
        .get(`/sites/${mixedSiteId}/sitemap.xml`)
        .expect(200);

      expect(response.text).toContain('#services');
      expect(response.text).toContain('#contact');
      expect(response.text).not.toContain('#about');

      await prisma.sites.delete({
        where: { id: mixedSiteId }
      });
    });
  });
});
