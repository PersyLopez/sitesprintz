import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { resetPrismaMocks } from '../utils/integrationTestSetup.js';

vi.mock('../../server/middleware/rateLimiting.js', () => ({
  registrationLimiter: (_req, _res, next) => next(),
  loginLimiter: (_req, _res, next) => next(),
  passwordResetLimiter: (_req, _res, next) => next(),
}));

const betaAllowsPublicSignups = vi.fn(() => true);
vi.mock('../../server/config/betaMode.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    betaAllowsPublicSignups: (...args) => betaAllowsPublicSignups(...args),
  };
});

import authRoutes from '../../server/routes/auth.routes.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('POST /api/auth/register beta gate', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    betaAllowsPublicSignups.mockReturnValue(true);
  });

  afterEach(() => {
    betaAllowsPublicSignups.mockReturnValue(true);
  });

  it('returns 403 BETA_INVITE_ONLY when signups are closed', async () => {
    betaAllowsPublicSignups.mockReturnValue(false);
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        password: 'TestPassword123!',
        acceptedTerms: true,
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('BETA_INVITE_ONLY');
  });
});
