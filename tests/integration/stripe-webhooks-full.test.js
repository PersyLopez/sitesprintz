import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

const WEBHOOK_SECRET = 'whsec_test_secret_key_for_testing';
const STRIPE_SECRET = 'sk_test_123';

const mocks = vi.hoisted(() => ({
  processEvent: vi.fn(),
  prismaCreate: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock('../../database/db.js', () => ({
  prisma: {
    webhook_events: {
      create: (...args) => mocks.prismaCreate(...args),
    },
  },
}));

vi.mock('../../server/services/webhookProcessor.js', () => ({
  WebhookProcessor: class MockWebhookProcessor {
    processEvent(event) {
      return mocks.processEvent(event);
    }
  },
}));

function generateStripeSignature(payload, secret = WEBHOOK_SECRET) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

function createStripeWebhookEvent(type, data) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    object: 'event',
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  };
}

async function loadApp() {
  vi.resetModules();
  process.env.STRIPE_SECRET_KEY = STRIPE_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const express = (await import('express')).default;
  const webhookRoutes = (await import('../../server/routes/webhooks.routes.js')).default;
  const app = express();
  app.use('/api/webhooks', webhookRoutes);
  return app;
}

async function postWebhook(app, event) {
  const payload = JSON.stringify(event);
  const signature = generateStripeSignature(payload);
  return request(app)
    .post('/api/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', signature)
    .send(payload);
}

describe('Stripe Webhooks - Complete Integration Tests', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.processEvent.mockResolvedValue({ processed: true, action: 'handled' });
    app = await loadApp();
  });

  describe('checkout.session.completed', () => {
    it('should handle one-time payment checkout', async () => {
      const event = createStripeWebhookEvent('checkout.session.completed', {
        id: 'cs_test_123',
        mode: 'payment',
        payment_status: 'paid',
        metadata: { site_id: 'site_123' },
      });

      const response = await postWebhook(app, event);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, processed: true });
      expect(mocks.processEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'checkout.session.completed' }),
      );
    });

    it('should handle subscription checkout', async () => {
      mocks.processEvent.mockResolvedValue({ processed: true, action: 'subscription_created' });
      const event = createStripeWebhookEvent('checkout.session.completed', {
        id: 'cs_test_456',
        mode: 'subscription',
        subscription: 'sub_test_123',
        metadata: { plan: 'premium', userId: 'user_456' },
      });

      const response = await postWebhook(app, event);

      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(true);
    });
  });

  describe('subscription lifecycle', () => {
    it('should handle customer.subscription.updated', async () => {
      const event = createStripeWebhookEvent('customer.subscription.updated', {
        id: 'sub_test_123',
        status: 'active',
        customer: 'cus_test_123',
      });

      const response = await postWebhook(app, event);

      expect(response.status).toBe(200);
      expect(mocks.processEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'customer.subscription.updated' }),
      );
    });

    it('should handle customer.subscription.deleted', async () => {
      const event = createStripeWebhookEvent('customer.subscription.deleted', {
        id: 'sub_test_123',
        status: 'canceled',
        customer: 'cus_test_123',
      });

      const response = await postWebhook(app, event);

      expect(response.status).toBe(200);
      expect(mocks.processEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'customer.subscription.deleted' }),
      );
    });
  });

  describe('invoice.payment_failed', () => {
    it('should handle failed subscription payment', async () => {
      const event = createStripeWebhookEvent('invoice.payment_failed', {
        id: 'in_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        amount_due: 9900,
        attempt_count: 1,
      });

      const response = await postWebhook(app, event);

      expect(response.status).toBe(200);
      expect(mocks.processEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'invoice.payment_failed' }),
      );
    });
  });

  describe('Webhook Security', () => {
    it('should reject webhooks with invalid signature', async () => {
      const event = createStripeWebhookEvent('checkout.session.completed', {});
      const payload = JSON.stringify(event);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'invalid_signature')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.text).toMatch(/Webhook Error:/i);
    });

    it('should reject webhooks without signature header', async () => {
      const event = createStripeWebhookEvent('checkout.session.completed', {});
      const payload = JSON.stringify(event);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.text).toMatch(/Webhook Error:/i);
    });

    it('should acknowledge duplicate webhook events', async () => {
      const event = createStripeWebhookEvent('checkout.session.completed', {
        id: 'cs_test_123',
        mode: 'payment',
        payment_status: 'paid',
      });
      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload);

      mocks.processEvent
        .mockResolvedValueOnce({ processed: true })
        .mockResolvedValueOnce({ processed: false, reason: 'duplicate' });

      const response1 = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payload);

      const response2 = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response1.status).toBe(200);
      expect(response1.body.processed).toBe(true);
      expect(response2.status).toBe(200);
      expect(response2.body).toEqual({ success: true, duplicate: true });
    });
  });
});
