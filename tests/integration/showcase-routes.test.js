/**
 * SHOWCASE ROUTES INTEGRATION TESTS
 * 
 * Migrated to Prisma ORM - Tests should now be reliable!
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { prisma } from '../../database/db.js';
import { createTestUser, createTestSite } from '../helpers/db-helpers.js';
import jwt from 'jsonwebtoken';

// Helper to generate auth tokens for integration tests
function getAuthToken(userEmail, userId) {
  return jwt.sign(
    { email: userEmail, userId: userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '24h' }
  );
}

// Mock CSRF protection to avoid 403 errors in API tests
vi.mock('../../server/middleware/csrf.js', () => ({
  csrfProtection: (req, res, next) => next(),
  csrfTokenEndpoint: (req, res) => res.json({ csrfToken: 'mock-token' })
}));

describe('Showcase Routes Integration Tests', () => {
  let testUser;
  let authToken;
  let publicSite;
  let privateSite;

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser();
    authToken = getAuthToken(testUser.email, testUser.id);

    // Create public site
    publicSite = await createTestSite(testUser.id, {
      subdomain: `public-showcase-${Date.now()}`,
      site_data: { brand: { name: 'Public Showcase Site' } },
      template_id: 'restaurant',
      status: 'published',
      isPublic: true
    });

    // Create private site
    privateSite = await createTestSite(testUser.id, {
      subdomain: `private-showcase-${Date.now()}`,
      site_data: { brand: { name: 'Private Showcase Site' } },
      template_id: 'salon',
      status: 'published',
      isPublic: false
    });
  });

  afterEach(async () => {
    // Cleanup - Prisma handles cascading deletes
    await prisma.sites.deleteMany({
      where: { user_id: testUser.id }
    });
    await prisma.users.delete({
      where: { id: testUser.id }
    });
  });

  // ==================== GET /api/showcases ====================
  describe('GET /api/showcases', () => {
    it('should return list of public sites', async () => {
      const response = await request(app)
        .get('/api/showcases')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sites).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.page).toBe(1);
    });

    it('should not include private sites', async () => {
      const response = await request(app)
        .get('/api/showcases')
        .expect(200);

      const privateSiteInResults = response.body.sites.find(
        site => site.subdomain === privateSite.subdomain
      );
      expect(privateSiteInResults).toBeUndefined();
    });

    it('should include public sites', async () => {
      const response = await request(app)
        .get('/api/showcases')
        .expect(200);

      const publicSiteInResults = response.body.sites.find(
        site => site.subdomain === publicSite.subdomain
      );
      expect(publicSiteInResults).toBeDefined();
      expect(publicSiteInResults.name).toBe('Public Showcase Site');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/showcases?page=1&pageSize=1')
        .expect(200);

      expect(response.body.sites).toHaveLength(1);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(1);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/showcases?category=restaurant')
        .expect(200);

      response.body.sites.forEach(site => {
        expect(site.template).toContain('restaurant');
      });
    });

    it('should search by name', async () => {
      const response = await request(app)
        .get('/api/showcases?search=Public')
        .expect(200);

      expect(response.body.sites.length).toBeGreaterThan(0);
      response.body.sites.forEach(site => {
        expect(site.name.toLowerCase()).toContain('public');
      });
    });

    it('should sort by name', async () => {
      const response = await request(app)
        .get('/api/showcases?sortBy=name&sortOrder=asc')
        .expect(200);

      const names = response.body.sites.map(s => s.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  // ==================== GET /api/showcases/categories ====================
  describe('GET /api/showcases/categories', () => {
    it('should return list of categories with counts', async () => {
      const response = await request(app)
        .get('/api/showcases/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.categories).toBeInstanceOf(Array);

      if (response.body.categories.length > 0) {
        expect(response.body.categories[0]).toHaveProperty('template');
        expect(response.body.categories[0]).toHaveProperty('count');
      }
    });
  });

  // ==================== GET /api/showcases/stats ====================
  describe('GET /api/showcases/stats', () => {
    it('should return gallery statistics', async () => {
      const response = await request(app)
        .get('/api/showcases/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('totalPublic');
      expect(response.body).toHaveProperty('totalCategories');
      expect(response.body).toHaveProperty('latestDate');
    });
  });

  // ==================== GET /api/showcases/:subdomain ====================
  describe('GET /api/showcases/:subdomain', () => {
    it('should return public site by subdomain', async () => {
      const response = await request(app)
        .get(`/api/showcases/${publicSite.subdomain}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.site.subdomain).toBe(publicSite.subdomain);
      expect(response.body.site.name).toBe('Public Showcase Site');
    });

    it('should return 404 for private site', async () => {
      const response = await request(app)
        .get(`/api/showcases/${privateSite.subdomain}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for nonexistent site', async () => {
      await request(app)
        .get('/api/showcases/nonexistent')
        .expect(404);
    });

    it('should validate subdomain format', async () => {
      await request(app)
        .get('/api/showcases/invalid!@#')
        .expect(400);
    });
  });

  // ==================== PUT /api/sites/:siteId/public ====================
  describe('PUT /api/sites/:siteId/public', () => {
    it('should toggle site to public (authenticated)', async () => {
      const response = await request(app)
        .put(`/api/sites/${privateSite.id}/public`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isPublic).toBe(true);

      // Verify in database
      const dbSite = await prisma.sites.findUnique({
        where: { id: privateSite.id },
        select: { is_public: true }
      });
      expect(dbSite.is_public).toBe(true);
    });

    it('should toggle site to private (authenticated)', async () => {
      const response = await request(app)
        .put(`/api/sites/${publicSite.id}/public`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isPublic).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/sites/${privateSite.id}/public`)
        .send({ isPublic: true })
        .expect(401);
    });

    it('should prevent unauthorized users from toggling', async () => {
      const otherUser = await createTestUser({ email: `other-${Date.now()}@test.com` });
      const otherToken = getAuthToken(otherUser.email, otherUser.id);

      await request(app)
        .put(`/api/sites/${publicSite.id}/public`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ isPublic: false })
        .expect(403);

      // Cleanup
      await prisma.users.delete({
        where: { id: otherUser.id }
      });
    });

    it('should validate isPublic boolean', async () => {
      await request(app)
        .put(`/api/sites/${publicSite.id}/public`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: 'invalid' })
        .expect(400);
    });

    it('should only allow published sites to be made public', async () => {
      const draftSite = await createTestSite(testUser.id, {
        subdomain: `draft-site-${Date.now()}`,
        site_data: { brand: { name: 'Draft Site' } },
        status: 'draft'
      });

      await request(app)
        .put(`/api/sites/${draftSite.id}/public`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: true })
        .expect(400);

      await prisma.sites.delete({
        where: { id: draftSite.id }
      });
    });
  });

  // ==================== GET /showcase/:subdomain ====================
  describe('GET /showcase/:subdomain (HTML Viewer)', () => {
    it('should render HTML showcase page for public site', async () => {
      const response = await request(app)
        .get(`/showcase/${publicSite.subdomain}`)
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('Public Showcase Site');
      expect(response.text).toContain(publicSite.subdomain);
    });

    it('should return 404 for private site', async () => {
      await request(app)
        .get(`/showcase/${privateSite.subdomain}`)
        .expect(404);
    });

    it('should include meta tags for SEO', async () => {
      const response = await request(app)
        .get(`/showcase/${publicSite.subdomain}`)
        .expect(200);

      expect(response.text).toContain('<meta name="description"');
      expect(response.text).toContain('<meta property="og:title"');
      expect(response.text).toContain('<meta property="og:image"');
    });

    it('should be mobile responsive', async () => {
      const response = await request(app)
        .get(`/showcase/${publicSite.subdomain}`)
        .expect(200);

      expect(response.text).toContain('viewport');
      expect(response.text).toContain('responsive');
    });
  });
});
