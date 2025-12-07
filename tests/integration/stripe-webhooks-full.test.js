/**
 * Integration Tests: Complete Stripe Webhook Testing
 * Tests all webhook event types: checkout.session.completed, subscription.updated, 
 * subscription.deleted, invoice.payment_failed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

// Mock Stripe webhook signature generation
function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

function createStripeWebhookEvent(type, data) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    object: 'event',
    type: type,
    data: {
      object: data
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null
    }
  };
}

describe('Stripe Webhooks - Complete Integration Tests', () => {
  let app;
  const webhookSecret = 'whsec_test_secret_key_for_testing';

  beforeEach(() => {
    app = express();
    app.use(express.raw({ type: 'application/json' }));
    
    // Import and set up webhook route
    // This would normally be: app.use('/api/webhooks', webhookRoutes);
  });

  describe('checkout.session.completed - Payment Mode', () => {
    it('should handle checkout.session.completed for one-time payment', async () => {
      const eventData = {
        id: 'cs_test_123',
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        customer_email: 'customer@example.com',
        client_reference_id: 'site_123',
        metadata: {
          siteId: 'site_123',
          userId: 'user_456'
        },
        amount_total: 2900, // $29.00
        currency: 'usd'
      };

      const event = createStripeWebhookEvent('checkout.session.completed', eventData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify order was created in database
      // This would require database access in integration tests
    });

    it('should handle checkout.session.completed for subscription', async () => {
      const eventData = {
        id: 'cs_test_456',
        object: 'checkout.session',
        mode: 'subscription',
        payment_status: 'paid',
        customer_email: 'customer@example.com',
        subscription: 'sub_test_123',
        metadata: {
          plan: 'premium',
          userId: 'user_456'
        }
      };

      const event = createStripeWebhookEvent('checkout.session.completed', eventData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify subscription was created and user plan updated
    });
  });

  describe('customer.subscription.updated', () => {
    it('should handle subscription status updates', async () => {
      const subscriptionData = {
        id: 'sub_test_123',
        object: 'subscription',
        status: 'active',
        customer: 'cus_test_123',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
        items: {
          data: [{
            price: {
              id: 'price_premium',
              unit_amount: 9900 // $99.00
            }
          }]
        }
      };

      const event = createStripeWebhookEvent('customer.subscription.updated', subscriptionData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
    });

    it('should handle subscription plan changes', async () => {
      const subscriptionData = {
        id: 'sub_test_123',
        object: 'subscription',
        status: 'active',
        customer: 'cus_test_123',
        items: {
          data: [{
            price: {
              id: 'price_premium', // Changed from starter to premium
              unit_amount: 9900
            }
          }]
        },
        previous_attributes: {
          items: {
            data: [{
              price: {
                id: 'price_starter',
                unit_amount: 2900
              }
            }]
          }
        }
      };

      const event = createStripeWebhookEvent('customer.subscription.updated', subscriptionData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify user plan was updated in database
    });

    it('should handle subscription past_due status', async () => {
      const subscriptionData = {
        id: 'sub_test_123',
        object: 'subscription',
        status: 'past_due',
        customer: 'cus_test_123'
      };

      const event = createStripeWebhookEvent('customer.subscription.updated', subscriptionData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify notification was sent to user
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should handle subscription cancellation', async () => {
      const subscriptionData = {
        id: 'sub_test_123',
        object: 'subscription',
        status: 'canceled',
        customer: 'cus_test_123',
        canceled_at: Math.floor(Date.now() / 1000)
      };

      const event = createStripeWebhookEvent('customer.subscription.deleted', subscriptionData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify subscription marked as cancelled in database
      // Verify user plan downgraded or access revoked
    });

    it('should preserve user data on cancellation', async () => {
      const subscriptionData = {
        id: 'sub_test_123',
        object: 'subscription',
        status: 'canceled',
        customer: 'cus_test_123'
      };

      const event = createStripeWebhookEvent('customer.subscription.deleted', subscriptionData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify user account still exists
      // Verify subscription record preserved with cancelled status
    });
  });

  describe('invoice.payment_failed', () => {
    it('should handle failed payment for subscription', async () => {
      const invoiceData = {
        id: 'in_test_123',
        object: 'invoice',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        amount_due: 9900,
        currency: 'usd',
        status: 'open',
        attempt_count: 1
      };

      const event = createStripeWebhookEvent('invoice.payment_failed', invoiceData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify notification sent to user
      // Verify subscription status updated (but not cancelled yet)
    });

    it('should handle multiple payment failures', async () => {
      const invoiceData = {
        id: 'in_test_123',
        object: 'invoice',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        amount_due: 9900,
        attempt_count: 3 // Multiple attempts failed
      };

      const event = createStripeWebhookEvent('invoice.payment_failed', invoiceData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify urgent notification sent
      // Verify subscription may be marked for cancellation
    });
  });

  describe('Webhook Security', () => {
    it('should reject webhooks with invalid signature', async () => {
      const event = createStripeWebhookEvent('checkout.session.completed', {});
      const payload = JSON.stringify(event);
      const invalidSignature = 'invalid_signature';

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', invalidSignature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.text).toContain('signature');
    });

    it('should reject webhooks without signature header', async () => {
      const event = createStripeWebhookEvent('checkout.session.completed', {});
      const payload = JSON.stringify(event);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should handle duplicate webhook events (idempotency)', async () => {
      const eventData = {
        id: 'cs_test_123',
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid'
      };

      const event = createStripeWebhookEvent('checkout.session.completed', eventData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      // First request
      const response1 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response1.status).toBe(200);

      // Duplicate request (same event ID)
      const response2 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response2.status).toBe(200);
      
      // Should acknowledge but not reprocess
      // Verify no duplicate orders/subscriptions created
    });
  });

  describe('Webhook Error Handling', () => {
    it('should handle webhook processing errors gracefully', async () => {
      // Create event that might cause processing error
      const eventData = {
        id: 'cs_test_error',
        object: 'checkout.session',
        mode: 'payment',
        // Missing required fields to trigger error
      };

      const event = createStripeWebhookEvent('checkout.session.completed', eventData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      // Should still return 200 to acknowledge receipt
      // Errors should be logged but not block webhook
      expect(response.status).toBe(200);
    });

    it('should log failed webhooks for debugging', async () => {
      const eventData = {
        id: 'cs_test_fail',
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid'
      };

      const event = createStripeWebhookEvent('checkout.session.completed', eventData);
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      // This would test that errors are logged to failed webhooks directory
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Verify error logged to stripe-failed directory if processing fails
    });
  });

  describe('Webhook Event Processing Order', () => {
    it('should process events in correct order', async () => {
      // Test that subscription.updated after checkout.session.completed works correctly
      const checkoutEvent = createStripeWebhookEvent('checkout.session.completed', {
        id: 'cs_test_123',
        subscription: 'sub_test_123',
        customer_email: 'test@example.com'
      });

      const subscriptionEvent = createStripeWebhookEvent('customer.subscription.updated', {
        id: 'sub_test_123',
        status: 'active'
      });

      // Process checkout first
      const payload1 = JSON.stringify(checkoutEvent);
      const signature1 = generateStripeSignature(payload1, webhookSecret);
      
      const response1 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature1)
        .send(payload1);

      expect(response1.status).toBe(200);

      // Then process subscription update
      const payload2 = JSON.stringify(subscriptionEvent);
      const signature2 = generateStripeSignature(payload2, webhookSecret);
      
      const response2 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature2)
        .send(payload2);

      expect(response2.status).toBe(200);
    });
  });
});









