import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

const WEBHOOK_SECRET = 'whsec_test_secret';
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

function signStripePayload(rawBody, secret = WEBHOOK_SECRET) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return { signature: `t=${timestamp},v1=${signature}`, rawBody };
}

function createEvent(type, objectOverrides = {}) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    object: 'event',
    type,
    data: { object: objectOverrides },
    created: Math.floor(Date.now() / 1000),
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

describe('Stripe Webhook Handler - POST /api/webhooks/stripe', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.processEvent.mockResolvedValue({ processed: true, action: 'payment_processed' });
    app = await loadApp();
  });

  describe('Security & Signature Validation', () => {
    it('should reject webhooks with invalid signature', async () => {
      const rawBody = JSON.stringify(createEvent('checkout.session.completed', {}));
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'invalid_signature')
        .send(rawBody);

      expect(response.status).toBe(400);
      expect(response.text).toMatch(/Webhook Error:/i);
      expect(mocks.processEvent).not.toHaveBeenCalled();
    });

    it('should reject webhooks with missing signature header', async () => {
      const rawBody = JSON.stringify(createEvent('checkout.session.completed', {}));
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(response.status).toBe(400);
      expect(response.text).toMatch(/Webhook Error:/i);
    });

    it('should accept webhooks with valid HMAC signature', async () => {
      const event = createEvent('checkout.session.completed', { mode: 'payment', metadata: {} });
      const rawBody = JSON.stringify(event);
      const { signature } = signStripePayload(rawBody);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(rawBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, processed: true });
      expect(mocks.processEvent).toHaveBeenCalledWith(
        expect.objectContaining({ id: event.id, type: event.type }),
      );
    });
  });

  describe('Idempotency', () => {
    it('should process webhook once then return duplicate on replay', async () => {
      const event = createEvent('checkout.session.completed', { mode: 'payment' });
      const rawBody = JSON.stringify(event);
      const { signature } = signStripePayload(rawBody);

      mocks.processEvent
        .mockResolvedValueOnce({ processed: true, action: 'payment_processed' })
        .mockResolvedValueOnce({ processed: false, reason: 'duplicate' });

      const response1 = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(rawBody);

      const response2 = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(rawBody);

      expect(response1.status).toBe(200);
      expect(response1.body).toEqual({ success: true, processed: true });
      expect(response2.status).toBe(200);
      expect(response2.body).toEqual({ success: true, duplicate: true });
      expect(mocks.processEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Processor responses', () => {
    it('should return 200 for unknown event types', async () => {
      mocks.processEvent.mockResolvedValue({ processed: false, reason: 'unknown_event_type' });
      const event = createEvent('unknown.event.type', {});
      const rawBody = JSON.stringify(event);
      const { signature } = signStripePayload(rawBody);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(rawBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, processed: false });
    });

    it('should return 500 when processor fails without duplicate reason', async () => {
      mocks.processEvent.mockResolvedValue({ processed: false, reason: 'handler_error' });
      const event = createEvent('checkout.session.completed', { mode: 'payment' });
      const rawBody = JSON.stringify(event);
      const { signature } = signStripePayload(rawBody);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(rawBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('handler_error');
      expect(mocks.prismaCreate).toHaveBeenCalled();
    });
  });
});
