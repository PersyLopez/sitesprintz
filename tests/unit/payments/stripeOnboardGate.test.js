/**
 * POST /api/stripe/connect/onboard — Growth gate and applyTo forwarding.
 * Mirrors requirePaymentsAccess in processor-connect.routes.js.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockUsersFindUnique = vi.fn();
const mockUserCanConnectPayments = vi.fn();
const mockResolveOwnedSiteId = vi.fn();
const mockInitiateStripeOAuth = vi.fn();
const mockCreateStandardAccountLink = vi.fn();
const mockIsStripeOAuthConfigured = vi.fn();

vi.mock('../../../database/db.js', () => ({
  prisma: {
    users: { findUnique: (...args) => mockUsersFindUnique(...args) }
  }
}));

vi.mock('../../../server/middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'user-onboard-1', email: 'owner@example.com' };
    next();
  },
  authenticateToken: (_req, _res, next) => next()
}));

vi.mock('../../../server/services/payments/processorConnectHelpers.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    userCanConnectPayments: (...args) => mockUserCanConnectPayments(...args),
    resolveOwnedSiteId: (...args) => mockResolveOwnedSiteId(...args)
  };
});

vi.mock('../../../server/services/payments/StripeConnectService.js', () => ({
  initiateStripeOAuth: (...args) => mockInitiateStripeOAuth(...args),
  createStandardAccountLink: (...args) => mockCreateStandardAccountLink(...args),
  isStripeOAuthConfigured: (...args) => mockIsStripeOAuthConfigured(...args),
  syncStripeConnectionStatus: vi.fn()
}));

describe('Stripe Standard onboarding access', () => {
  let app;

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_onboard_gate';
    vi.resetModules();
    const stripeRoutes = (await import('../../../server/routes/stripe.routes.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/stripe', stripeRoutes);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCanConnectPayments.mockResolvedValue(true);
    mockUsersFindUnique.mockResolvedValue({
      id: 'user-onboard-1',
      email: 'owner@example.com',
      stripe_account_id: null
    });
    mockResolveOwnedSiteId.mockResolvedValue('site-onboard-1');
    mockIsStripeOAuthConfigured.mockReturnValue(false);
    mockCreateStandardAccountLink.mockResolvedValue({
      url: 'https://connect.stripe.com/setup/acct_1',
      accountId: 'acct_1'
    });
    mockInitiateStripeOAuth.mockResolvedValue({ authorizeUrl: 'https://connect.stripe.com/oauth/authorize' });
  });

  it('rejects a non-Growth owner before any Stripe account is created', async () => {
    mockUserCanConnectPayments.mockResolvedValue(false);

    const res = await request(app).post('/api/stripe/connect/onboard').send({});

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, code: 'GROWTH_PLAN_REQUIRED' });
    expect(mockCreateStandardAccountLink).not.toHaveBeenCalled();
    expect(mockInitiateStripeOAuth).not.toHaveBeenCalled();
  });

  it('forwards applyTo to the Account Link flow', async () => {
    const res = await request(app)
      .post('/api/stripe/connect/onboard')
      .send({ siteId: 'site-onboard-1', applyTo: 'all' });

    expect(res.status).toBe(200);
    expect(mockCreateStandardAccountLink).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: 'site-onboard-1', applyTo: 'all' })
    );
  });

  it('forwards applyTo to the OAuth flow and defaults to site scope', async () => {
    mockIsStripeOAuthConfigured.mockReturnValue(true);

    const res = await request(app).post('/api/stripe/connect').send({ siteId: 'site-onboard-1' });

    expect(res.status).toBe(200);
    expect(mockInitiateStripeOAuth).toHaveBeenCalledWith(
      'user-onboard-1',
      'site-onboard-1',
      expect.stringContaining('/api/connect/stripe/callback'),
      'site'
    );
  });
});
