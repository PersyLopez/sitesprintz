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
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
    });

    it('should include service health checks', async () => {
      const response = await request(app).get('/health');
      expect(response.body.services).toHaveProperty('api');
      expect(response.body.services).toHaveProperty('database');
    });

    it('should include beta flags', async () => {
      const response = await request(app).get('/health');
      expect(response.body.beta).toEqual({
        enabled: expect.any(Boolean),
        allowSignups: expect.any(Boolean),
        stripeMode: expect.stringMatching(/^(live|test|missing|invalid)$/),
      });
    });

    it('includes the public Turnstile site key when configured', async () => {
      process.env.VITE_TURNSTILE_SITE_KEY = '0xpublic-site-key';
      const response = await request(app).get('/health');
      expect(response.body.turnstileSiteKey).toBe('0xpublic-site-key');
      expect(JSON.stringify(response.body)).not.toMatch(/SECRET/i);
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
    it('includes compact forms summary', async () => {
      prisma.submissions.findFirst.mockResolvedValue(null);
      prisma.sites.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/health/full').expect(200);

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

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toEqual({
        alive: true,
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });
});
