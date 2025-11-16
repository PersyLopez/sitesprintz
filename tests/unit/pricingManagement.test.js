/**
 * Pricing Management API - Unit Tests
 * TDD for database-driven pricing system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initializePricingRoutes } from '../../server/routes/pricing.routes.js';

describe('Pricing Management API - TDD', () => {
  let app;
  let mockDbQuery;
  let mockAuthToken;
  let mockAdminUser;
  let mockRegularUser;

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use(express.json());

    // Mock database query function
    mockDbQuery = vi.fn();

    // Mock authentication middleware
    mockAdminUser = {
      id: 'admin-123',
      email: 'admin@sitesprintz.com',
      role: 'admin'
    };

    mockRegularUser = {
      id: 'user-456',
      email: 'user@sitesprintz.com',
      role: 'user'
    };

    // Mock auth middleware
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader === 'Bearer admin-token') {
        req.user = mockAdminUser;
      } else if (authHeader === 'Bearer user-token') {
        req.user = mockRegularUser;
      }
      next();
    });

    // Initialize routes with mocked dbQuery
    const pricingRoutes = initializePricingRoutes(mockDbQuery);
    app.use('/api/pricing', pricingRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // PUBLIC ENDPOINTS - No Auth Required
  // ============================================

  describe('GET /api/pricing - Public', () => {
    it('should return all active pricing plans', async () => {
      const mockPricing = [
        {
          plan: 'starter',
          name: 'Starter',
          price_monthly: 1500,
          price_annual: 14400,
          description: 'Perfect for service businesses',
          features: ['Feature 1', 'Feature 2'],
          trial_days: 14,
          is_popular: false,
          display_order: 1,
          price_monthly_dollars: 15.00,
          price_annual_dollars: 144.00
        },
        {
          plan: 'pro',
          name: 'Pro',
          price_monthly: 4500,
          price_annual: 43200,
          description: 'Add e-commerce',
          features: ['All Starter', 'E-commerce'],
          trial_days: 14,
          is_popular: true,
          display_order: 2,
          price_monthly_dollars: 45.00,
          price_annual_dollars: 432.00
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockPricing });

      const response = await request(app)
        .get('/api/pricing')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pricing).toEqual(mockPricing);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.anything()
      );
    });

    it('should return empty array if no active pricing', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/pricing')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pricing).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockDbQuery.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/pricing')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch pricing');
    });
  });

  describe('GET /api/pricing/:plan - Public', () => {
    it('should return specific plan details', async () => {
      const mockPlan = {
        plan: 'pro',
        name: 'Pro',
        price_monthly: 4500,
        price_annual: 43200,
        description: 'Add e-commerce',
        features: ['All Starter', 'E-commerce'],
        trial_days: 14,
        is_popular: true,
        price_monthly_dollars: 45.00,
        price_annual_dollars: 432.00
      };

      mockDbQuery.mockResolvedValue({ rows: [mockPlan] });

      const response = await request(app)
        .get('/api/pricing/pro')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pricing).toEqual(mockPlan);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE plan = $1'),
        ['pro']
      );
    });

    it('should return 404 for non-existent plan', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/pricing/invalid-plan')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Plan not found');
    });

    it('should return 404 for inactive plan', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/pricing/starter')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // ADMIN ENDPOINTS - Auth Required
  // ============================================

  describe('GET /api/pricing/admin/all - Admin Only', () => {
    it('should return all pricing plans for admin', async () => {
      const mockAllPricing = [
        {
          id: '123',
          plan: 'starter',
          name: 'Starter',
          price_monthly: 1500,
          is_active: true,
          price_monthly_dollars: 15.00
        },
        {
          id: '456',
          plan: 'premium',
          name: 'Premium',
          price_monthly: 10000,
          is_active: false,
          price_monthly_dollars: 100.00
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockAllPricing });

      const response = await request(app)
        .get('/api/pricing/admin/all')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pricing).toEqual(mockAllPricing);
      expect(response.body.pricing).toHaveLength(2);
      expect(response.body.pricing[1].is_active).toBe(false);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .get('/api/pricing/admin/all')
        .set('Authorization', 'Bearer user-token')
        .expect(403);

      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/pricing/admin/all')
        .expect(401);

      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/pricing/admin/:plan - Admin Only', () => {
    it('should update pricing for a plan', async () => {
      const updatedPlan = {
        plan: 'pro',
        name: 'Pro',
        price_monthly: 4900, // Changed from 4500 to 4900
        price_annual: 47040,
        description: 'Updated description',
        is_active: true,
        price_monthly_dollars: 49.00
      };

      mockDbQuery.mockResolvedValue({ rows: [updatedPlan] });

      const response = await request(app)
        .put('/api/pricing/admin/pro')
        .set('Authorization', 'Bearer admin-token')
        .send({
          price_monthly: 49, // Sending as dollars
          price_annual: 470.40,
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pricing.price_monthly_dollars).toBe(49.00);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pricing'),
        expect.arrayContaining([
          expect.anything(),
          4900, // Converted to cents
          expect.anything(),
          'Updated description',
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          'admin-123', // updated_by
          'pro'
        ])
      );
    });

    it('should convert dollars to cents automatically', async () => {
      mockDbQuery.mockResolvedValue({
        rows: [{
          plan: 'starter',
          price_monthly: 2000,
          price_monthly_dollars: 20.00
        }]
      });

      const response = await request(app)
        .put('/api/pricing/admin/starter')
        .set('Authorization', 'Bearer admin-token')
        .send({
          price_monthly: 20 // Sending as dollars (< 1000)
        })
        .expect(200);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.anything(),
          2000, // Converted to cents
          expect.anything()
        ])
      );
    });

    it('should handle cents if provided', async () => {
      mockDbQuery.mockResolvedValue({
        rows: [{
          plan: 'starter',
          price_monthly: 1500,
          price_monthly_dollars: 15.00
        }]
      });

      const response = await request(app)
        .put('/api/pricing/admin/starter')
        .set('Authorization', 'Bearer admin-token')
        .send({
          price_monthly: 1500 // Already in cents (>= 1000)
        })
        .expect(200);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.anything(),
          1500, // Not converted (already cents)
          expect.anything()
        ])
      );
    });

    it('should return 404 for non-existent plan', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/pricing/admin/invalid-plan')
        .set('Authorization', 'Bearer admin-token')
        .send({ price_monthly: 50 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Plan not found');
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .put('/api/pricing/admin/pro')
        .set('Authorization', 'Bearer user-token')
        .send({ price_monthly: 50 })
        .expect(403);

      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDbQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/pricing/admin/pro')
        .set('Authorization', 'Bearer admin-token')
        .send({ price_monthly: 50 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to update pricing');
    });
  });

  describe('GET /api/pricing/admin/history/:plan - Admin Only', () => {
    it('should return price change history', async () => {
      const mockHistory = [
        {
          id: '1',
          plan: 'pro',
          old_price_dollars: 25.00,
          new_price_dollars: 45.00,
          changed_at: '2025-11-14T10:00:00Z',
          changed_by_email: 'admin@sitesprintz.com'
        },
        {
          id: '2',
          plan: 'pro',
          old_price_dollars: 45.00,
          new_price_dollars: 49.00,
          changed_at: '2025-11-15T14:30:00Z',
          changed_by_email: 'admin@sitesprintz.com'
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockHistory });

      const response = await request(app)
        .get('/api/pricing/admin/history/pro')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.history).toEqual(mockHistory);
      expect(response.body.history).toHaveLength(2);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM pricing_history'),
        ['pro']
      );
    });

    it('should return empty array if no history', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/pricing/admin/history/starter')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.history).toEqual([]);
    });

    it('should limit history to 50 entries', async () => {
      const mockHistory = Array(50).fill(null).map((_, i) => ({
        id: `${i}`,
        plan: 'pro',
        old_price_dollars: 40.00,
        new_price_dollars: 45.00,
        changed_at: new Date().toISOString()
      }));

      mockDbQuery.mockResolvedValue({ rows: mockHistory });

      const response = await request(app)
        .get('/api/pricing/admin/history/pro')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.history.length).toBeLessThanOrEqual(50);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.anything()
      );
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .get('/api/pricing/admin/history/pro')
        .set('Authorization', 'Bearer user-token')
        .expect(403);

      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/pricing/admin/quick-update - Admin Only', () => {
    it('should update all prices at once', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ rows: [] }) // Update starter
        .mockResolvedValueOnce({ rows: [] }) // Update pro
        .mockResolvedValueOnce({ rows: [] }) // Update premium
        .mockResolvedValueOnce({ // Final SELECT
          rows: [
            { plan: 'starter', name: 'Starter', price_monthly_dollars: 15.00 },
            { plan: 'pro', name: 'Pro', price_monthly_dollars: 45.00 },
            { plan: 'premium', name: 'Premium', price_monthly_dollars: 100.00 }
          ]
        });

      const response = await request(app)
        .post('/api/pricing/admin/quick-update')
        .set('Authorization', 'Bearer admin-token')
        .send({
          starter: 15,
          pro: 45,
          premium: 100
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pricing).toHaveLength(3);
      expect(mockDbQuery).toHaveBeenCalledTimes(4); // 3 updates + 1 select
    });

    it('should convert dollars to cents', async () => {
      mockDbQuery
        .mockResolvedValue({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ plan: 'starter', price_monthly_dollars: 20.00 }]
        });

      await request(app)
        .post('/api/pricing/admin/quick-update')
        .set('Authorization', 'Bearer admin-token')
        .send({ starter: 20 })
        .expect(200);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.anything(),
        [2000, 'admin-123'] // Converted to cents
      );
    });

    it('should handle partial updates', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ rows: [] }) // Update pro
        .mockResolvedValueOnce({ // Final SELECT
          rows: [{ plan: 'pro', price_monthly_dollars: 49.00 }]
        });

      const response = await request(app)
        .post('/api/pricing/admin/quick-update')
        .set('Authorization', 'Bearer admin-token')
        .send({
          pro: 49 // Only update pro
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockDbQuery).toHaveBeenCalledTimes(2); // 1 update + 1 select
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/pricing/admin/quick-update')
        .set('Authorization', 'Bearer user-token')
        .send({ starter: 15 })
        .expect(403);

      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDbQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/pricing/admin/quick-update')
        .set('Authorization', 'Bearer admin-token')
        .send({ starter: 15 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // EDGE CASES & VALIDATION
  // ============================================

  describe('Input Validation', () => {
    it('should handle negative prices', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/pricing/admin/pro')
        .set('Authorization', 'Bearer admin-token')
        .send({ price_monthly: -50 })
        .expect(500);

      // Database constraint should catch this
      expect(response.body.success).toBe(false);
    });

    it('should handle zero prices', async () => {
      mockDbQuery.mockResolvedValue({
        rows: [{
          plan: 'starter',
          price_monthly: 0,
          price_monthly_dollars: 0.00
        }]
      });

      const response = await request(app)
        .put('/api/pricing/admin/starter')
        .set('Authorization', 'Bearer admin-token')
        .send({ price_monthly: 0 })
        .expect(200);

      // Allow 0 for testing purposes
      expect(response.body.pricing.price_monthly_dollars).toBe(0.00);
    });

    it('should handle very large prices', async () => {
      mockDbQuery.mockResolvedValue({
        rows: [{
          plan: 'premium',
          price_monthly: 999900,
          price_monthly_dollars: 9999.00
        }]
      });

      const response = await request(app)
        .put('/api/pricing/admin/premium')
        .set('Authorization', 'Bearer admin-token')
        .send({ price_monthly: 9999 })
        .expect(200);

      expect(response.body.pricing.price_monthly_dollars).toBe(9999.00);
    });

    it('should handle decimal prices correctly', async () => {
      mockDbQuery.mockResolvedValue({
        rows: [{
          plan: 'pro',
          price_monthly: 4999,
          price_monthly_dollars: 49.99
        }]
      });

      const response = await request(app)
        .put('/api/pricing/admin/pro')
        .set('Authorization', 'Bearer admin-token')
        .send({ price_monthly: 49.99 })
        .expect(200);

      expect(response.body.pricing.price_monthly_dollars).toBe(49.99);
    });
  });

  describe('Concurrency & Race Conditions', () => {
    it('should handle concurrent price updates', async () => {
      const updates = [
        request(app)
          .put('/api/pricing/admin/pro')
          .set('Authorization', 'Bearer admin-token')
          .send({ price_monthly: 45 }),
        request(app)
          .put('/api/pricing/admin/pro')
          .set('Authorization', 'Bearer admin-token')
          .send({ price_monthly: 49 })
      ];

      mockDbQuery.mockResolvedValue({
        rows: [{ plan: 'pro', price_monthly_dollars: 49.00 }]
      });

      const results = await Promise.all(updates);

      // Both should succeed (last write wins)
      expect(results[0].status).toBe(200);
      expect(results[1].status).toBe(200);
    });
  });
});

