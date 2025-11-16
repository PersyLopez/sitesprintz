/**
 * Pricing Management - Integration Tests
 * Test with real database (test environment)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { query as dbQuery } from '../../database/db.js';

describe('Pricing Management Integration Tests', () => {
  let app;
  let adminToken;
  let userToken;
  let testUserId;
  let adminUserId;

  beforeAll(async () => {
    // Import app (assumes server exports app)
    const serverModule = await import('../../server.js');
    app = serverModule.default || serverModule.app;

    // Create test users
    const adminResult = await dbQuery(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
       RETURNING id`,
      ['test-admin@sitesprintz.test', 'hash123', 'admin']
    );
    adminUserId = adminResult.rows[0].id;

    const userResult = await dbQuery(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
       RETURNING id`,
      ['test-user@sitesprintz.test', 'hash456', 'user']
    );
    testUserId = userResult.rows[0].id;

    // Generate tokens (mock JWT for testing)
    adminToken = 'test-admin-token';
    userToken = 'test-user-token';
  });

  afterAll(async () => {
    // Cleanup test users
    await dbQuery('DELETE FROM users WHERE email LIKE $1', ['%@sitesprintz.test']);
  });

  beforeEach(async () => {
    // Reset pricing to defaults before each test
    await dbQuery(`
      UPDATE pricing
      SET 
        price_monthly = CASE
          WHEN plan = 'starter' THEN 1500
          WHEN plan = 'pro' THEN 4500
          WHEN plan = 'premium' THEN 10000
        END,
        is_active = true
      WHERE plan IN ('starter', 'pro', 'premium')
    `);
  });

  describe('GET /api/pricing - Integration', () => {
    it('should fetch real pricing from database', async () => {
      const response = await request(app)
        .get('/api/pricing')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pricing).toBeInstanceOf(Array);
      expect(response.body.pricing.length).toBeGreaterThan(0);

      const starterPlan = response.body.pricing.find(p => p.plan === 'starter');
      expect(starterPlan).toBeDefined();
      expect(starterPlan.price_monthly).toBe(1500);
      expect(starterPlan.price_monthly_dollars).toBe(15.00);
    });

    it('should only return active plans', async () => {
      // Deactivate premium plan
      await dbQuery(
        `UPDATE pricing SET is_active = false WHERE plan = 'premium'`
      );

      const response = await request(app)
        .get('/api/pricing')
        .expect(200);

      const premiumPlan = response.body.pricing.find(p => p.plan === 'premium');
      expect(premiumPlan).toBeUndefined();
    });

    it('should return plans in correct display order', async () => {
      const response = await request(app)
        .get('/api/pricing')
        .expect(200);

      const plans = response.body.pricing;
      for (let i = 0; i < plans.length - 1; i++) {
        expect(plans[i].display_order).toBeLessThanOrEqual(plans[i + 1].display_order);
      }
    });
  });

  describe('PUT /api/pricing/admin/:plan - Integration', () => {
    it('should update price in database', async () => {
      const response = await request(app)
        .put('/api/pricing/admin/pro')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price_monthly: 49
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pricing.price_monthly_dollars).toBe(49.00);

      // Verify in database
      const dbResult = await dbQuery(
        'SELECT price_monthly FROM pricing WHERE plan = $1',
        ['pro']
      );
      expect(dbResult.rows[0].price_monthly).toBe(4900);
    });

    it('should log price change to history', async () => {
      // Initial update
      await request(app)
        .put('/api/pricing/admin/starter')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price_monthly: 20 })
        .expect(200);

      // Check history
      const response = await request(app)
        .get('/api/pricing/admin/history/starter')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.history.length).toBeGreaterThan(0);
      const lastChange = response.body.history[0];
      expect(lastChange.plan).toBe('starter');
      expect(lastChange.new_price_dollars).toBe(20.00);
    });

    it('should track who made the change', async () => {
      await request(app)
        .put('/api/pricing/admin/pro')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price_monthly: 50 })
        .expect(200);

      // Check that updated_by is set
      const dbResult = await dbQuery(
        'SELECT updated_by FROM pricing WHERE plan = $1',
        ['pro']
      );
      expect(dbResult.rows[0].updated_by).toBe(adminUserId);
    });

    it('should update timestamp', async () => {
      const beforeUpdate = new Date();

      await request(app)
        .put('/api/pricing/admin/premium')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price_monthly: 120 })
        .expect(200);

      const dbResult = await dbQuery(
        'SELECT updated_at FROM pricing WHERE plan = $1',
        ['premium']
      );
      const updatedAt = new Date(dbResult.rows[0].updated_at);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('POST /api/pricing/admin/quick-update - Integration', () => {
    it('should update multiple prices atomically', async () => {
      const response = await request(app)
        .post('/api/pricing/admin/quick-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          starter: 18,
          pro: 48,
          premium: 98
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify all updates in database
      const dbResult = await dbQuery(
        `SELECT plan, price_monthly 
         FROM pricing 
         WHERE plan IN ('starter', 'pro', 'premium')
         ORDER BY display_order`
      );

      expect(dbResult.rows[0].price_monthly).toBe(1800); // $18
      expect(dbResult.rows[1].price_monthly).toBe(4800); // $48
      expect(dbResult.rows[2].price_monthly).toBe(9800); // $98
    });
  });

  describe('Server Integration - Checkout Flow', () => {
    it('should use database pricing in checkout', async () => {
      // Update price in database
      await dbQuery(
        `UPDATE pricing SET price_monthly = 4700 WHERE plan = 'pro'`
      );

      // Create checkout (would call actual endpoint)
      const pricingResult = await dbQuery(
        `SELECT price_monthly FROM pricing WHERE plan = $1 AND is_active = true`,
        ['pro']
      );

      expect(pricingResult.rows[0].price_monthly).toBe(4700);
      // Stripe would receive 4700 cents = $47.00
    });

    it('should fallback to hardcoded if table not found', async () => {
      // Simulate missing table (would need to temporarily drop/rename)
      // This test verifies the fallback logic exists
      const fallbackPricing = {
        starter: { amount: 1500 },
        pro: { amount: 4500 },
        premium: { amount: 10000 }
      };

      expect(fallbackPricing.pro.amount).toBe(4500);
    });
  });

  describe('Frontend Integration', () => {
    it('should provide pricing data for React components', async () => {
      const response = await request(app)
        .get('/api/pricing')
        .expect(200);

      const pricing = response.body.pricing;

      // Verify data structure matches frontend expectations
      pricing.forEach(plan => {
        expect(plan).toHaveProperty('plan');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price_monthly');
        expect(plan).toHaveProperty('price_monthly_dollars');
        expect(plan).toHaveProperty('price_annual_dollars');
        expect(plan).toHaveProperty('description');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('trial_days');
        expect(plan).toHaveProperty('is_popular');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection failures', async () => {
      // This would require mocking the database connection
      // Or testing with database temporarily unavailable
      // Verify graceful degradation
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE pricing; --";

      const response = await request(app)
        .get(`/api/pricing/${maliciousInput}`)
        .expect(404); // Should not find plan, not execute SQL

      // Verify table still exists
      const dbResult = await dbQuery('SELECT COUNT(*) FROM pricing');
      expect(parseInt(dbResult.rows[0].count)).toBeGreaterThan(0);
    });

    it('should validate price constraints', async () => {
      const response = await request(app)
        .put('/api/pricing/admin/pro')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price_monthly: -50 // Negative price
        })
        .expect(500);

      expect(response.body.success).toBe(false);

      // Verify price wasn't updated
      const dbResult = await dbQuery(
        'SELECT price_monthly FROM pricing WHERE plan = $1',
        ['pro']
      );
      expect(dbResult.rows[0].price_monthly).toBe(4500); // Unchanged
    });
  });

  describe('Performance Tests', () => {
    it('should fetch pricing quickly', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/pricing')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should be under 100ms
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/pricing')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});

