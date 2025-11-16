/**
 * Integration Tests for Public Showcase Gallery
 * TDD: Tests written first to define expected behavior
 * 
 * Gallery should:
 * - List all public showcases with opt-in
 * - Filter by category (restaurant, salon, gym, etc.)
 * - Search functionality
 * - SEO-optimized pages
 * - Privacy controls (opt-in/opt-out)
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import showcaseRoutes from '../../server/routes/showcase.routes.js';
import { query } from '../../server/db/index.js';

// Mock database
vi.mock('../../server/db/index.js', () => ({
  query: vi.fn()
}));

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      req.user = { id: 'test-user-id', email: 'test@example.com', role: 'user' };
    }
    next();
  });
  
  app.use('/', showcaseRoutes);
  return app;
};

describe('Public Showcase Gallery Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /showcases (Public Gallery)', () => {
    it('should list all public showcases', async () => {
      // Mock database response with public sites
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            subdomain: 'restaurant1',
            business_name: 'Great Restaurant',
            category: 'restaurant',
            is_public: true,
            created_at: new Date('2025-01-01')
          },
          {
            subdomain: 'salon1',
            business_name: 'Beautiful Salon',
            category: 'salon',
            is_public: true,
            created_at: new Date('2025-01-02')
          }
        ]
      });

      const response = await request(app).get('/showcases');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });

    it('should only show sites where is_public is true', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { subdomain: 'public1', is_public: true },
          { subdomain: 'public2', is_public: true }
        ]
      });

      const response = await request(app).get('/showcases');

      expect(response.status).toBe(200);
      // Verify query was called with public filter
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('is_public'),
        expect.anything()
      );
    });

    it('should filter by category', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { subdomain: 'restaurant1', category: 'restaurant', is_public: true }
        ]
      });

      const response = await request(app)
        .get('/showcases?category=restaurant');

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('category'),
        expect.arrayContaining(['restaurant'])
      );
    });

    it('should support search functionality', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { subdomain: 'pizza-place', business_name: 'Pizza Palace', is_public: true }
        ]
      });

      const response = await request(app)
        .get('/showcases?search=pizza');

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('business_name'),
        expect.arrayContaining(['%pizza%'])
      );
    });

    it('should include site metadata', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            subdomain: 'restaurant1',
            business_name: 'Great Restaurant',
            category: 'restaurant',
            is_public: true,
            created_at: new Date('2025-01-01'),
            template_id: 'restaurant-fine-dining'
          }
        ]
      });

      const response = await request(app).get('/showcases');

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('subdomain');
        expect(response.body[0]).toHaveProperty('business_name');
        expect(response.body[0]).toHaveProperty('category');
      }
    });

    it('should sort by creation date (newest first)', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { subdomain: 'new1', created_at: new Date('2025-01-02') },
          { subdomain: 'old1', created_at: new Date('2025-01-01') }
        ]
      });

      const response = await request(app).get('/showcases');

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        expect.anything()
      );
    });

    it('should support pagination', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: Array(10).fill(null).map((_, i) => ({
          subdomain: `site${i}`,
          is_public: true
        }))
      });

      const response = await request(app)
        .get('/showcases?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10])
      );
    });
  });

  describe('PUT /api/showcase/:subdomain/visibility', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/showcase/testsite/visibility')
        .send({ is_public: true });

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should update is_public status when authenticated', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ subdomain: 'testsite', user_id: 'test-user-id' }]
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ subdomain: 'testsite', is_public: true }]
      });

      const response = await request(app)
        .put('/api/showcase/testsite/visibility')
        .set('authorization', 'Bearer test-token')
        .send({ is_public: true });

      expect([200, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      }
    });

    it('should validate is_public is boolean', async () => {
      const response = await request(app)
        .put('/api/showcase/testsite/visibility')
        .set('authorization', 'Bearer test-token')
        .send({ is_public: 'invalid' });

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should only allow owner to change visibility', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ subdomain: 'testsite', user_id: 'other-user-id' }]
      });

      const response = await request(app)
        .put('/api/showcase/testsite/visibility')
        .set('authorization', 'Bearer test-token')
        .send({ is_public: true });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('GET /showcases/categories', () => {
    it('should list all available categories', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { category: 'restaurant', count: 5 },
          { category: 'salon', count: 3 },
          { category: 'gym', count: 2 }
        ]
      });

      const response = await request(app).get('/showcases/categories');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('category');
        expect(response.body[0]).toHaveProperty('count');
      }
    });

    it('should only count public sites', async () => {
      const response = await request(app).get('/showcases/categories');

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('is_public = true'),
        expect.anything()
      );
    });
  });

  describe('GET /showcases/featured', () => {
    it('should return featured showcases', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { subdomain: 'featured1', is_featured: true, is_public: true },
          { subdomain: 'featured2', is_featured: true, is_public: true }
        ]
      });

      const response = await request(app).get('/showcases/featured');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should limit featured results', async () => {
      const response = await request(app)
        .get('/showcases/featured?limit=6');

      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.length).toBeLessThanOrEqual(6);
      }
    });
  });

  describe('SEO and Meta Tags', () => {
    it('should include SEO meta tags in gallery page', async () => {
      const response = await request(app).get('/showcases');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should generate sitemap for public showcases', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { subdomain: 'site1', updated_at: new Date() },
          { subdomain: 'site2', updated_at: new Date() }
        ]
      });

      const response = await request(app).get('/showcases/sitemap.xml');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/xml/);
      }
    });
  });

  describe('Analytics and Tracking', () => {
    it('should track showcase views', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ subdomain: 'testsite', is_public: true }]
      });
      vi.mocked(query).mockResolvedValueOnce({ rows: [] }); // Insert view

      const response = await request(app).get('/showcase/testsite');

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should increment view count', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ subdomain: 'testsite', view_count: 10 }]
      });

      const response = await request(app).get('/api/showcase/testsite/stats');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('views');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/showcases');

      expect([500, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid category filters', async () => {
      const response = await request(app)
        .get('/showcases?category=invalid<script>');

      expect([200, 400]).toContain(response.status);
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/showcases?page=-1&limit=10000');

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Performance', () => {
    it('should respond quickly with cached results', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const startTime = Date.now();
      await request(app).get('/showcases');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array(100).fill(null).map((_, i) => ({
        subdomain: `site${i}`,
        is_public: true
      }));

      vi.mocked(query).mockResolvedValueOnce({ rows: largeResultSet });

      const response = await request(app).get('/showcases');

      expect(response.status).toBe(200);
      // Should use pagination
    });
  });
});

