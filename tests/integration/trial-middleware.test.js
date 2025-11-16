/**
 * 🧪 PHASE 3 TDD: Trial Expiration Middleware - Integration Tests
 * 
 * Tests the Express middleware layer that enforces trial expiration
 * 
 * Integration scenarios:
 * - Middleware behavior
 * - HTTP responses
 * - Route integration
 * - Admin bypass
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireActiveTrial } from '../server/middleware/trialExpiration.js';
import * as db from '../database/db.js';

// Mock database
vi.mock('../database/db.js', () => ({
  query: vi.fn()
}));

describe('Trial Expiration Middleware - Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Test route
    app.post('/api/test/:subdomain/publish',
      (req, res, next) => {
        // Mock auth - add user to request
        req.user = req.body.user || { id: 'user-123', role: 'user' };
        next();
      },
      requireActiveTrial,
      (req, res) => {
        res.json({ success: true, trialStatus: req.trialStatus });
      }
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requireActiveTrial middleware', () => {
    it('should allow access for active trial', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: futureDate,
          plan: 'trial'
        }]
      });

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.trialStatus).toBeDefined();
      expect(response.body.trialStatus.isExpired).toBe(false);
    });

    it('should block access for expired trial', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: pastDate,
          plan: 'trial'
        }]
      });

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Trial expired');
      expect(response.body.code).toBe('TRIAL_EXPIRED');
      expect(response.body.message).toContain('upgrade');
    });

    it('should allow access for paid plan even if expires_at passed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: pastDate,
          plan: 'pro' // Paid plan
        }]
      });

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should bypass trial check for admins', async () => {
      // Don't even set up db mock - admin should bypass
      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({
          user: { id: 'admin-1', role: 'admin' }
        });

      expect(response.status).toBe(200);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent site', async () => {
      db.query.mockResolvedValue({
        rows: [] // Site not found
      });

      const response = await request(app)
        .post('/api/test/non-existent/publish')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Site not found');
    });

    it('should require subdomain parameter', async () => {
      const appNoSubdomain = express();
      appNoSubdomain.use(express.json());
      appNoSubdomain.post('/api/test',
        (req, res, next) => {
          req.user = { id: 'user-123', role: 'user' };
          next();
        },
        requireActiveTrial,
        (req, res) => res.json({ success: true })
      );

      const response = await request(appNoSubdomain)
        .post('/api/test')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Subdomain required');
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to check trial status');
    });

    it('should attach trial status to request', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: futureDate,
          plan: 'trial'
        }]
      });

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      expect(response.body.trialStatus).toMatchObject({
        isExpired: false,
        daysRemaining: expect.any(Number),
        expiresAt: expect.any(String)
      });
    });

    it('should attach siteId to request', async () => {
      const appWithSiteId = express();
      appWithSiteId.use(express.json());
      appWithSiteId.post('/api/test/:subdomain/action',
        (req, res, next) => {
          req.user = { id: 'user-123', role: 'user' };
          next();
        },
        requireActiveTrial,
        (req, res) => {
          res.json({ siteId: req.siteId });
        }
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: futureDate,
          plan: 'trial'
        }]
      });

      const response = await request(appWithSiteId)
        .post('/api/test/test-site/action')
        .send({});

      expect(response.body.siteId).toBe('site-123');
    });
  });

  describe('Edge cases', () => {
    it('should handle trial expiring today', async () => {
      // Expires at end of today
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: today,
          plan: 'trial'
        }]
      });

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      // Should still allow (expires at end of day)
      expect(response.status).toBe(200);
    });

    it('should handle null expires_at gracefully', async () => {
      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: null,
          plan: 'trial'
        }]
      });

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      // Null expires_at = no trial expiration
      expect(response.status).toBe(200);
    });

    it('should handle concurrent requests to same site', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: futureDate,
          plan: 'trial'
        }]
      });

      // Send 5 concurrent requests
      const requests = Array(5).fill(null).map(() => 
        request(app).post('/api/test/test-site/publish').send({})
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle subdomain from body as fallback', async () => {
      const appBodySubdomain = express();
      appBodySubdomain.use(express.json());
      appBodySubdomain.post('/api/test',
        (req, res, next) => {
          req.user = { id: 'user-123', role: 'user' };
          next();
        },
        requireActiveTrial,
        (req, res) => res.json({ success: true })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: futureDate,
          plan: 'trial'
        }]
      });

      const response = await request(appBodySubdomain)
        .post('/api/test')
        .send({ subdomain: 'test-site' });

      expect(response.status).toBe(200);
    });
  });

  describe('Error responses', () => {
    it('should include helpful upgrade message', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: pastDate,
          plan: 'trial'
        }]
      });

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      expect(response.body.message).toContain('upgrade');
      expect(response.body.message).toContain('trial has expired');
    });

    it('should use standardized error format', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: pastDate,
          plan: 'trial'
        }]
      });

      const response = await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        code: 'TRIAL_EXPIRED'
      });
    });

    it('should log errors with context', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      db.query.mockRejectedValue(new Error('Connection timeout'));

      await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Trial check error'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should complete check in reasonable time', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      db.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: futureDate,
          plan: 'trial'
        }]
      });

      const start = Date.now();

      await request(app)
        .post('/api/test/test-site/publish')
        .send({});

      const duration = Date.now() - start;

      // Should complete in under 100ms (excluding network)
      expect(duration).toBeLessThan(100);
    });
  });
});

describe('Trial Warning Email Flow - Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Simulated cron endpoint
    app.post('/api/internal/send-trial-warnings',
      (req, res, next) => {
        // Internal endpoint - require admin or cron key
        if (req.headers['x-cron-key'] === 'test-key') {
          next();
        } else {
          res.status(401).json({ error: 'Unauthorized' });
        }
      },
      async (req, res) => {
        // Mock implementation - real one in routes
        const { sendTrialExpirationWarnings } = await import('../server/middleware/trialExpiration.js');
        const result = await sendTrialExpirationWarnings();
        res.json(result);
      }
    );

    vi.clearAllMocks();
  });

  it('should protect cron endpoint with key', async () => {
    const response = await request(app)
      .post('/api/internal/send-trial-warnings')
      .send({});

    expect(response.status).toBe(401);
  });

  it('should allow cron with valid key', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const response = await request(app)
      .post('/api/internal/send-trial-warnings')
      .set('x-cron-key', 'test-key')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('sent');
  });
});

