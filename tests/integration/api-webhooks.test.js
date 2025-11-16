// Comprehensive Webhook Handler Tests
// Following strict TDD - these tests define the specification
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import Stripe from 'stripe';
import webhookRoutes from '../../server/routes/webhooks.routes.js';

// Mock environment variables
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';

describe('Stripe Webhook Handler - POST /api/webhooks/stripe', () => {
  let app;
  let mockDb;
  let mockEmailService;
  
  beforeEach(() => {
    // Setup Express app with webhook routes
    app = express();
    app.use('/api/webhooks', webhookRoutes);
    
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };
    mockEmailService = {
      send: vi.fn().mockResolvedValue({ success: true })
    };
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  // ========================================
  // SECURITY TESTS
  // ========================================
  describe('Security & Signature Validation', () => {
    it('should reject webhooks with invalid signature', async () => {
      const payload = JSON.stringify({ type: 'test.event' });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send(payload);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid signature/i);
    });
    
    it('should reject webhooks with missing signature header', async () => {
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send({ type: 'test.event' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/signature required/i);
    });
    
    it('should reject webhooks with old timestamp (replay attack)', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes old
      const payload = JSON.stringify({ type: 'test.event' });
      const signature = generateTestSignature(payload, oldTimestamp);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/timestamp.*old|replay/i);
    });
    
    it('should accept webhooks with valid signature', async () => {
      const payload = { type: 'test.event', data: { object: {} } };
      const signature = generateValidSignature(payload);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).not.toBe(400);
    });
  });
  
  // ========================================
  // IDEMPOTENCY TESTS
  // ========================================
  describe('Idempotency', () => {
    it('should process webhook only once (duplicate prevention)', async () => {
      const eventId = 'evt_test_123';
      const payload = {
        id: eventId,
        type: 'checkout.session.completed',
        data: { object: createMockCheckoutSession('payment') }
      };
      const signature = generateValidSignature(payload);
      
      // First call - should process
      const response1 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response1.status).toBe(200);
      expect(response1.body.processed).toBe(true);
      
      // Second call - should skip (already processed)
      const response2 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response2.status).toBe(200);
      expect(response2.body.processed).toBe(false);
      expect(response2.body.reason).toBe('duplicate');
      
      // Verify database was only called once
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });
    
    it('should check idempotency before processing', async () => {
      // Mark event as already processed
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'evt_test_123' }],
        rowCount: 1
      });
      
      const payload = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: { object: {} }
      };
      const signature = generateValidSignature(payload);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(false);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });
  
  // ========================================
  // PAYMENT SUCCESS FLOW
  // ========================================
  describe('checkout.session.completed (payment mode)', () => {
    it('should create order in database', async () => {
      const sessionData = createMockCheckoutSession('payment', {
        amount_total: 9900,
        customer_email: 'customer@example.com',
        metadata: {
          site_id: 'site-123',
          order_items: JSON.stringify([
            { name: 'Product 1', price: 99, quantity: 1 }
          ])
        }
      });
      
      const payload = {
        id: 'evt_payment_123',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          query: vi.fn().mockResolvedValue({ rows: [{ id: 'order-123' }], rowCount: 1 })
        };
        return await callback(mockTx);
      });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(mockDb.transaction).toHaveBeenCalled();
      
      // Verify order creation SQL was called
      const txCallback = mockDb.transaction.mock.calls[0][0];
      const mockTx = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'order-123' }] }) };
      await txCallback(mockTx);
      
      expect(mockTx.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO orders/i),
        expect.arrayContaining(['site-123'])
      );
    });
    
    it('should send confirmation email to customer', async () => {
      const sessionData = createMockCheckoutSession('payment', {
        customer_email: 'customer@example.com',
        amount_total: 9900
      });
      
      const payload = {
        id: 'evt_payment_456',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockResolvedValue({ orderId: 'order-456' });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'customer@example.com',
        expect.stringMatching(/order.*confirmation/i),
        expect.objectContaining({
          orderId: expect.any(String),
          amount: expect.any(Number)
        })
      );
    });
    
    it('should send notification to site owner', async () => {
      const sessionData = createMockCheckoutSession('payment', {
        metadata: { site_id: 'site-123' }
      });
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{ owner_email: 'owner@example.com' }],
        rowCount: 1
      });
      mockDb.transaction.mockResolvedValue({ orderId: 'order-789' });
      
      const payload = {
        id: 'evt_payment_789',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'owner@example.com',
        expect.stringMatching(/new.*order/i),
        expect.any(Object)
      );
    });
    
    it('should store order items correctly', async () => {
      const orderItems = [
        { name: 'Product 1', price: 50, quantity: 2 },
        { name: 'Product 2', price: 30, quantity: 1 }
      ];
      
      const sessionData = createMockCheckoutSession('payment', {
        metadata: {
          site_id: 'site-123',
          order_items: JSON.stringify(orderItems)
        }
      });
      
      const payload = {
        id: 'evt_payment_items',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'order-123' }] }) // INSERT order
            .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // INSERT order_items
        };
        return await callback(mockTx);
      });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Verify order items were inserted
      const txCallback = mockDb.transaction.mock.calls[0][0];
      const mockTx = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 'order-123' }] })
          .mockResolvedValueOnce({ rows: [], rowCount: 2 })
      };
      await txCallback(mockTx);
      
      expect(mockTx.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO order_items/i),
        expect.anything()
      );
    });
    
    it('should handle missing metadata gracefully', async () => {
      const sessionData = createMockCheckoutSession('payment', {
        metadata: {} // Empty metadata
      });
      
      const payload = {
        id: 'evt_payment_no_meta',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(response.body.warning).toMatch(/missing.*metadata/i);
    });
  });
  
  // ========================================
  // SUBSCRIPTION FLOW
  // ========================================
  describe('checkout.session.completed (subscription mode)', () => {
    it('should create subscription record in database', async () => {
      const sessionData = createMockCheckoutSession('subscription', {
        customer: 'cus_test123',
        subscription: 'sub_test123',
        customer_email: 'user@example.com',
        metadata: {
          userId: 'user-456',
          plan: 'pro'
        }
      });
      
      const payload = {
        id: 'evt_sub_create',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 })
        };
        return await callback(mockTx);
      });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Verify subscription was inserted
      const txCallback = mockDb.transaction.mock.calls[0][0];
      const mockTx = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
      await txCallback(mockTx);
      
      expect(mockTx.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO subscriptions/i),
        expect.arrayContaining(['sub_test123', 'user-456', 'pro'])
      );
    });
    
    it('should update user plan in database', async () => {
      const sessionData = createMockCheckoutSession('subscription', {
        metadata: { userId: 'user-789', plan: 'pro' }
      });
      
      const payload = {
        id: 'evt_sub_plan_update',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 })
        };
        return await callback(mockTx);
      });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Verify user plan was updated
      const txCallback = mockDb.transaction.mock.calls[0][0];
      const mockTx = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
      await txCallback(mockTx);
      
      expect(mockTx.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users.*SET.*plan/i),
        expect.arrayContaining(['pro', 'user-789'])
      );
    });
    
    it('should send welcome email for new subscription', async () => {
      const sessionData = createMockCheckoutSession('subscription', {
        customer_email: 'newuser@example.com',
        metadata: { plan: 'pro' }
      });
      
      const payload = {
        id: 'evt_sub_welcome',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'newuser@example.com',
        expect.stringMatching(/welcome|subscription/i),
        expect.objectContaining({
          plan: 'pro'
        })
      );
    });
    
    it('should handle subscription upgrade (existing subscriber)', async () => {
      // User already has free plan, upgrading to pro
      mockDb.query.mockResolvedValueOnce({
        rows: [{ plan: 'free', stripe_subscription_id: 'sub_old123' }],
        rowCount: 1
      });
      
      const sessionData = createMockCheckoutSession('subscription', {
        subscription: 'sub_new456',
        metadata: { userId: 'user-upgrade', plan: 'pro' }
      });
      
      const payload = {
        id: 'evt_sub_upgrade',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(response.body.action).toBe('upgrade');
    });
  });
  
  // ========================================
  // SUBSCRIPTION LIFECYCLE
  // ========================================
  describe('customer.subscription.updated', () => {
    it('should handle status change to past_due', async () => {
      const payload = {
        id: 'evt_sub_past_due',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test123',
            status: 'past_due',
            customer: 'cus_test123'
          }
        }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: 'user-123', email: 'user@example.com' }],
        rowCount: 1
      });
      
      mockDb.transaction.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Should update subscription status
      expect(mockDb.transaction).toHaveBeenCalled();
      
      // Should send payment failure notification
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringMatching(/payment.*failed|past.*due/i),
        expect.any(Object)
      );
    });
    
    it('should handle status change to canceled', async () => {
      const payload = {
        id: 'evt_sub_canceled',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_canceled',
            status: 'canceled',
            customer: 'cus_test456'
          }
        }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Should update to canceled status
      const txCallback = mockDb.transaction.mock.calls[0][0];
      const mockTx = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
      await txCallback(mockTx);
      
      expect(mockTx.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE.*subscriptions.*status/i),
        expect.arrayContaining(['canceled'])
      );
    });
    
    it('should handle plan changes (upgrade/downgrade)', async () => {
      const payload = {
        id: 'evt_sub_plan_change',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test789',
            status: 'active',
            items: {
              data: [{
                price: {
                  id: 'price_pro_monthly',
                  product: 'prod_pro'
                }
              }]
            }
          },
          previous_attributes: {
            items: {
              data: [{
                price: {
                  id: 'price_starter_monthly',
                  product: 'prod_starter'
                }
              }]
            }
          }
        }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(response.body.action).toBe('plan_change');
    });
  });
  
  // ========================================
  // PAYMENT FAILURES
  // ========================================
  describe('invoice.payment_failed', () => {
    it('should send payment failure notification', async () => {
      const payload = {
        id: 'evt_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer_email: 'failing@example.com',
            amount_due: 2900,
            attempt_count: 1
          }
        }
      };
      const signature = generateValidSignature(payload);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'failing@example.com',
        expect.stringMatching(/payment.*failed/i),
        expect.objectContaining({
          amount: 2900,
          attemptCount: 1
        })
      );
    });
    
    it('should not immediately cancel subscription on payment failure', async () => {
      const payload = {
        id: 'evt_payment_failed_2',
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_failing',
            attempt_count: 1
          }
        }
      };
      const signature = generateValidSignature(payload);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Should NOT call delete/cancel
      expect(mockDb.query).not.toHaveBeenCalledWith(
        expect.stringMatching(/DELETE.*subscriptions/i),
        expect.anything()
      );
    });
  });
  
  // ========================================
  // EDGE CASES
  // ========================================
  describe('Edge Cases', () => {
    it('should handle race condition (webhook before redirect)', async () => {
      // Webhook arrives before user is redirected back to site
      // User record might not be fully updated yet
      
      const sessionData = createMockCheckoutSession('subscription');
      const payload = {
        id: 'evt_race_condition',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      // First DB call returns no user (not created yet)
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      
      // Retry should succeed
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123' }],
        rowCount: 1
      });
      
      mockDb.transaction.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(response.body.retried).toBe(true);
    });
    
    it('should handle database transaction failure with rollback', async () => {
      const sessionData = createMockCheckoutSession('payment');
      const payload = {
        id: 'evt_db_fail',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      // Simulate transaction failure
      mockDb.transaction.mockRejectedValue(new Error('Database connection lost'));
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(500);
      expect(response.body.error).toMatch(/database.*error/i);
      
      // Event should not be marked as processed (can retry)
      expect(mockDb.query).not.toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO processed_webhooks/i),
        expect.anything()
      );
    });
    
    it('should handle unknown event types gracefully', async () => {
      const payload = {
        id: 'evt_unknown',
        type: 'unknown.event.type',
        data: { object: {} }
      };
      const signature = generateValidSignature(payload);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(false);
      expect(response.body.reason).toBe('unknown_event_type');
    });
    
    it('should handle malformed webhook payload', async () => {
      const payload = 'not valid json {{{';
      const signature = generateValidSignature(payload);
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid.*payload/i);
    });
    
    it('should handle email service failure gracefully', async () => {
      const sessionData = createMockCheckoutSession('payment');
      const payload = {
        id: 'evt_email_fail',
        type: 'checkout.session.completed',
        data: { object: sessionData }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockResolvedValue({ success: true });
      mockEmailService.send.mockRejectedValue(new Error('Email service down'));
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      // Should still succeed even if email fails
      expect(response.status).toBe(200);
      expect(response.body.warning).toMatch(/email.*failed/i);
    });
  });
  
  // ========================================
  // CUSTOMER SUBSCRIPTION DELETED
  // ========================================
  describe('customer.subscription.deleted', () => {
    it('should update subscription status to deleted', async () => {
      const payload = {
        id: 'evt_sub_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_deleted_123',
            status: 'canceled',
            customer: 'cus_test'
          }
        }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Should update status, not delete row
      const txCallback = mockDb.transaction.mock.calls[0][0];
      const mockTx = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
      await txCallback(mockTx);
      
      expect(mockTx.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE.*subscriptions/i),
        expect.not.stringMatching(/DELETE/i)
      );
    });
    
    it('should send cancellation confirmation email', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_email: 'canceling@example.com' }],
        rowCount: 1
      });
      
      const payload = {
        id: 'evt_sub_deleted_email',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test'
          }
        }
      };
      const signature = generateValidSignature(payload);
      
      mockDb.transaction.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'canceling@example.com',
        expect.stringMatching(/cancel.*confirm/i),
        expect.any(Object)
      );
    });
  });
});

// ========================================
// HELPER FUNCTIONS FOR TESTS
// ========================================

function generateValidSignature(payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // Simplified signature generation for tests
  // In real implementation, use Stripe's signature generation
  return `t=${timestamp},v1=valid_signature_hash`;
}

function generateTestSignature(payload, timestamp) {
  return `t=${timestamp},v1=test_signature_hash`;
}

function createMockCheckoutSession(mode, overrides = {}) {
  const base = {
    id: `cs_test_${Date.now()}`,
    object: 'checkout.session',
    mode: mode,
    payment_status: mode === 'subscription' ? 'paid' : 'paid',
    status: 'complete',
    created: Math.floor(Date.now() / 1000),
    amount_total: 9900,
    currency: 'usd',
    customer: 'cus_test123',
    customer_email: 'test@example.com',
    metadata: {},
    ...overrides
  };
  
  if (mode === 'subscription') {
    base.subscription = overrides.subscription || 'sub_test123';
  }
  
  return base;
}

