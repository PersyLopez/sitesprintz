import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { resetPrismaMocks } from '../utils/integrationTestSetup.js';

vi.mock('../../server/routes/submissions.routes.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createContactHealthProbe: vi.fn().mockResolvedValue({ ok: true, submissionId: 1, subdomain: 'canary' }),
  };
});

vi.mock('../../server/routes/feedback.routes.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createFeedbackHealthProbe: vi.fn().mockResolvedValue({ ok: true, submissionId: 2 }),
  };
});

import healthRouter from '../../server/routes/health.js';
import { prisma } from '../../database/db.js';
import { createContactHealthProbe } from '../../server/routes/submissions.routes.js';
import { createFeedbackHealthProbe } from '../../server/routes/feedback.routes.js';

const app = express();
app.use('/health', healthRouter);

describe('Health Endpoints Integration Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test';
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    prisma.submissions.findFirst.mockResolvedValue(null);
    prisma.sites.findFirst.mockResolvedValue({ id: 'site-1' });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('GET /health', () => {
    it('should return health status without ops configuration', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(Object.keys(response.body).sort()).toEqual([
        'beta',
        'billing',
        'status',
        'timestamp',
        'turnstileSiteKey',
      ]);
      expect(typeof response.body.status).toBe('string');
      expect(response.body.uptime).toBeUndefined();
      expect(response.body.services).toBeUndefined();
      expect(response.body.performance).toBeUndefined();
    });

    it('should include public beta flags only', async () => {
      const response = await request(app).get('/health');
      expect(response.body.beta).toEqual({
        enabled: expect.any(Boolean),
        allowSignups: expect.any(Boolean),
      });
    });

    it('includes the public Turnstile site key when configured', async () => {
      process.env.VITE_TURNSTILE_SITE_KEY = '0xpublic-site-key';
      process.env.TURNSTILE_SECRET_KEY = '0xturnstile-secret-must-not-leak';
      const response = await request(app).get('/health');
      expect(response.body.turnstileSiteKey).toBe('0xpublic-site-key');
      expect(JSON.stringify(response.body)).not.toContain('0xturnstile-secret-must-not-leak');
    });

    it('includes billing.collectsPayments without leaking Stripe configuration', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_health_secret_key';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_do_not_leak';
      process.env.STRIPE_PRICE_STARTER = 'price_starter_secret';
      process.env.STRIPE_PRICE_GROWTH = 'price_growth_secret';
      process.env.STRIPE_PRICE_GROWTH_MANAGED = 'price_managed_secret';
      process.env.PLATFORM_COLLECT_PAYMENTS = 'false';

      const response = await request(app).get('/health');

      expect(response.body.billing).toEqual({
        collectsPayments: false,
      });

      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('sk_live_health_secret_key');
      expect(serialized).not.toContain('whsec_do_not_leak');
      expect(serialized).not.toContain('price_starter_secret');
      expect(serialized).not.toContain('price_growth_secret');
      expect(serialized).not.toContain('price_managed_secret');
      expect(response.body.billing.liveKey).toBeUndefined();
      expect(response.body.billing.collectBootReady).toBeUndefined();
      expect(response.body.beta.stripeMode).toBeUndefined();
    });

    it('reports degraded with HTTP 200 when the database is unreachable', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused secrets'));
      const response = await request(app).get('/health').expect(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.timestamp).toEqual(expect.any(String));
      expect(JSON.stringify(response.body)).not.toContain('connection refused');
    });
  });

  describe('GET /health/forms', () => {
    it('returns forms health shape', async () => {
      prisma.submissions.findFirst
        .mockResolvedValueOnce({ created_at: new Date('2026-01-01T00:00:00.000Z') })
        .mockResolvedValueOnce({ created_at: new Date('2026-01-02T00:00:00.000Z') });

      const response = await request(app).get('/health/forms').expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        email: { configured: true },
        canary: { configured: false, siteFound: false },
        forms: {
          contact: { lastSubmittedAt: expect.any(String) },
          platformFeedback: { lastSubmittedAt: expect.any(String) },
        },
        probe: { status: 'not_configured' },
      });
    });

    it('rejects wrong probe header with 401', async () => {
      process.env.HEALTH_PROBE_SECRET = 'secret-value';
      const response = await request(app)
        .get('/health/forms')
        .set('X-Health-Probe', 'wrong-secret')
        .expect(401);

      expect(response.body.code).toBe('PROBE_UNAUTHORIZED');
      expect(createContactHealthProbe).not.toHaveBeenCalled();
    });

    it('returns probe not_configured when secret unset even with header', async () => {
      delete process.env.HEALTH_PROBE_SECRET;
      delete process.env.HEALTH_PROBE_SUBDOMAIN;

      const response = await request(app)
        .get('/health/forms')
        .set('X-Health-Probe', 'anything')
        .expect(200);

      expect(response.body.probe).toEqual({ status: 'not_configured' });
      expect(createContactHealthProbe).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/full', () => {
    it('rejects unauthenticated requests', async () => {
      delete process.env.HEALTH_PROBE_SECRET;
      const response = await request(app).get('/health/full').expect(401);
      expect(response.body.code).toBe('PROBE_UNAUTHORIZED');
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        timestamp: expect.any(String),
      });
    });

    it('includes compact forms summary when probe header matches', async () => {
      process.env.HEALTH_PROBE_SECRET = 'secret-value';
      prisma.submissions.findFirst.mockResolvedValue(null);
      prisma.sites.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/health/full')
        .set('X-Health-Probe', 'secret-value')
        .expect(200);

      expect(response.body.checks.stripe).toMatchObject({
        status: expect.stringMatching(/^(ok|not_configured)$/),
        mode: expect.stringMatching(/^(live|test|missing|invalid)$/),
      });
      expect(response.body.checks.forms).toMatchObject({
        status: 'ok',
        emailConfigured: true,
        canary: expect.any(Object),
        lastSubmittedAt: {
          contact: null,
          platformFeedback: null,
        },
      });
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.ready).toBe('boolean');
    });
  });

  describe('GET /health/stripe', () => {
    it('rejects unauthenticated requests', async () => {
      delete process.env.HEALTH_PROBE_SECRET;
      const response = await request(app)
        .get('/health/stripe')
        .set('X-Health-Probe', 'anything')
        .expect(401);
      expect(response.body.code).toBe('PROBE_UNAUTHORIZED');
    });

    it('rejects a wrong probe header even when the secret is set', async () => {
      process.env.HEALTH_PROBE_SECRET = 'secret-value';
      const response = await request(app)
        .get('/health/stripe')
        .set('X-Health-Probe', 'wrong-secret')
        .expect(401);
      expect(response.body.code).toBe('PROBE_UNAUTHORIZED');
    });

    it('reports stripeKeyMode without charging when probe header matches', async () => {
      process.env.HEALTH_PROBE_SECRET = 'secret-value';
      process.env.STRIPE_SECRET_KEY = 'sk_test_health';
      const response = await request(app)
        .get('/health/stripe')
        .set('X-Health-Probe', 'secret-value')
        .expect(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'stripe',
        configured: true,
        mode: 'test',
      });
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status without uptime', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toEqual({
        alive: true,
        timestamp: expect.any(String),
      });
    });
  });
});
