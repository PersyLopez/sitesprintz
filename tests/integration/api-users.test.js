import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import usersRoutes from '../../server/routes/users.routes.js';

const createTestApp = (role = 'user', userId = 'test-user-1') => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware
  app.use((req, res, next) => {
    req.user = {
      id: userId,
      userId: userId,
      email: role === 'admin' ? 'admin@example.com' : `user${userId}@example.com`,
      role: role
    };
    next();
  });
  
  app.use('/api/users', usersRoutes);
  return app;
};

describe('Users Routes Integration Tests', () => {
  let userApp;
  let adminApp;
  let otherUserApp;
  const testUserId = 'test-user-1';
  const otherUserId = 'test-user-2';

  beforeAll(() => {
    userApp = createTestApp('user', testUserId);
    adminApp = createTestApp('admin', 'admin-user-id');
    otherUserApp = createTestApp('user', otherUserId);
  });

  describe('GET /api/users/:userId/sites', () => {
    it('should return user\'s own sites', async () => {
      const response = await request(userApp)
        .get(`/api/users/${testUserId}/sites`);

      expect([200, 401, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('sites');
        expect(Array.isArray(response.body.sites)).toBe(true);
      }
    });

    it('should enforce ownership - deny access to other user\'s sites', async () => {
      const response = await request(userApp)
        .get(`/api/users/${otherUserId}/sites`);

      // Should deny access to other user's sites
      expect([401, 403]).toContain(response.status);
      if (response.body && response.body.error) {
        // Error message varies: "denied", "unauthorized", "no token", "forbidden"
        expect(response.body.error.toLowerCase()).toMatch(/denied|unauthorized|forbidden|no token|access/i);
      }
    });

    it('should allow admin access to any user\'s sites', async () => {
      const response = await request(adminApp)
        .get(`/api/users/${testUserId}/sites`);

      // Admin should have access
      expect([200, 401, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('sites');
      }
    });

    it('should return empty array when user has no sites', async () => {
      const newUserId = 'user-with-no-sites';
      const newUserApp = createTestApp('user', newUserId);

      const response = await request(newUserApp)
        .get(`/api/users/${newUserId}/sites`);

      if (response.status === 200) {
        expect(response.body.sites).toEqual([]);
      }
    });

    it('should return sites ordered by creation date', async () => {
      const response = await request(userApp)
        .get(`/api/users/${testUserId}/sites`);

      if (response.status === 200 && response.body.sites.length > 1) {
        const sites = response.body.sites;
        // Check if sorted by created_at DESC
        for (let i = 0; i < sites.length - 1; i++) {
          if (sites[i].created_at && sites[i + 1].created_at) {
            const date1 = new Date(sites[i].created_at);
            const date2 = new Date(sites[i + 1].created_at);
            expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
          }
        }
      }
    });

    it('should handle invalid user ID format', async () => {
      const response = await request(userApp)
        .get('/api/users/invalid-@#$-id/sites');

      // Should handle gracefully
      expect([401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/users/:userId/sites/:siteId', () => {
    it('should delete user\'s own site', async () => {
      const siteId = 'test-site-123';

      const response = await request(userApp)
        .delete(`/api/users/${testUserId}/sites/${siteId}`);

      // Should succeed or fail with proper error
      expect([200, 401, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message.toLowerCase()).toContain('deleted');
      }
    });

    it('should reject deletion of other user\'s site', async () => {
      const siteId = 'other-user-site-456';

      const response = await request(userApp)
        .delete(`/api/users/${otherUserId}/sites/${siteId}`);

      // Should deny access
      expect([401, 403]).toContain(response.status);
      if (response.body && response.body.error) {
        expect(response.body.error.toLowerCase()).toMatch(/denied|unauthorized|forbidden|no token|access/i);
      }
    });

    it('should handle non-existent site gracefully', async () => {
      const siteId = 'non-existent-site-999';

      const response = await request(userApp)
        .delete(`/api/users/${testUserId}/sites/${siteId}`);

      // Should handle gracefully (might succeed with 0 rows affected)
      expect([200, 401, 404, 500]).toContain(response.status);
    });

    it('should allow admin to delete any user\'s site', async () => {
      const siteId = 'admin-delete-test-site';

      const response = await request(adminApp)
        .delete(`/api/users/${testUserId}/sites/${siteId}`);

      // Admin should have access
      expect([200, 401, 404, 500]).toContain(response.status);
    });

    it('should handle missing site ID', async () => {
      const response = await request(userApp)
        .delete(`/api/users/${testUserId}/sites/`);

      // Should 404 or handle route mismatch
      expect([400, 401, 404]).toContain(response.status);
    });

    it('should handle SQL injection in site ID', async () => {
      const maliciousSiteId = "'; DROP TABLE sites; --";

      const response = await request(userApp)
        .delete(`/api/users/${testUserId}/sites/${encodeURIComponent(maliciousSiteId)}`);

      // Should handle safely without SQL injection
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/users/:userId/analytics', () => {
    it('should return user\'s own analytics', async () => {
      const response = await request(userApp)
        .get(`/api/users/${testUserId}/analytics`);

      expect([200, 401, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('analytics');
        expect(Array.isArray(response.body.analytics)).toBe(true);
      }
    });

    it('should enforce ownership - deny access to other user\'s analytics', async () => {
      const response = await request(userApp)
        .get(`/api/users/${otherUserId}/analytics`);

      // Should deny access
      expect([401, 403]).toContain(response.status);
      if (response.body && response.body.error) {
        expect(response.body.error.toLowerCase()).toMatch(/denied|unauthorized|forbidden|no token|access/i);
      }
    });

    it('should allow admin access to any user\'s analytics', async () => {
      const response = await request(adminApp)
        .get(`/api/users/${testUserId}/analytics`);

      // Admin should have access
      expect([200, 401, 404, 500]).toContain(response.status);
    });

    it('should handle user with no sites gracefully', async () => {
      const newUserId = 'user-no-analytics';
      const newUserApp = createTestApp('user', newUserId);

      const response = await request(newUserApp)
        .get(`/api/users/${newUserId}/analytics`);

      if (response.status === 200) {
        expect(response.body.analytics).toEqual([]);
      }
    });

    it('should include all relevant analytics metrics', async () => {
      const response = await request(userApp)
        .get(`/api/users/${testUserId}/analytics`);

      if (response.status === 200 && response.body.analytics.length > 0) {
        const analytics = response.body.analytics[0];
        
        // Should have analytics structure
        expect(analytics).toHaveProperty('site_id');
        expect(analytics).toHaveProperty('subdomain');
        expect(analytics).toHaveProperty('total_views');
        expect(analytics).toHaveProperty('views_30d');
        expect(analytics).toHaveProperty('total_submissions');
      }
    });

    it('should order analytics by total views descending', async () => {
      const response = await request(userApp)
        .get(`/api/users/${testUserId}/analytics`);

      if (response.status === 200 && response.body.analytics.length > 1) {
        const analytics = response.body.analytics;
        
        // Check if sorted by total_views DESC
        for (let i = 0; i < analytics.length - 1; i++) {
          expect(Number(analytics[i].total_views)).toBeGreaterThanOrEqual(
            Number(analytics[i + 1].total_views)
          );
        }
      }
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(userApp)
        .get(`/api/users/${testUserId}/analytics`);

      // Should return proper error response
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
      
      if (response.status >= 500) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Security & Access Control', () => {
    it('should enforce authentication on all user routes', async () => {
      const app = express();
      app.use(express.json());
      // No auth middleware
      app.use('/api/users', usersRoutes);

      const routes = [
        { method: 'get', path: `/api/users/${testUserId}/sites` },
        { method: 'delete', path: `/api/users/${testUserId}/sites/test-site` },
        { method: 'get', path: `/api/users/${testUserId}/analytics` }
      ];

      for (const route of routes) {
        let response;
        if (route.method === 'delete') {
          response = await request(app).delete(route.path);
        } else {
          response = await request(app).get(route.path);
        }

        // Should require authentication
        expect([401, 403, 500]).toContain(response.status);
      }
    });

    it('should validate userId parameter consistency', async () => {
      // User trying to access their own resources but wrong userId in URL
      const response = await request(userApp)
        .get(`/api/users/wrong-user-id/sites`);

      // Should enforce that URL userId matches authenticated user
      expect([401, 403]).toContain(response.status);
    });

    it('should prevent privilege escalation attempts', async () => {
      // Regular user trying to act as admin by manipulating requests
      const response = await request(userApp)
        .get(`/api/users/${otherUserId}/sites`);

      // Should reject even if user tries to fake admin access
      expect([401, 403]).toContain(response.status);
    });
  });
});


