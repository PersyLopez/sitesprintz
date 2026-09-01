import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockSessionsCreate = vi.fn();
const mockCustomersRetrieve = vi.fn();
const mockUsersFindUnique = vi.fn();
const mockUsersUpdate = vi.fn();
const mockSitesFindFirst = vi.fn();
const mockSitesCount = vi.fn();
const mockSubscriptionsList = vi.fn();

vi.mock('../../../database/db.js', () => ({
  prisma: {
    users: {
      findUnique: (...args) => mockUsersFindUnique(...args),
      update: (...args) => mockUsersUpdate(...args),
    },
    sites: {
      count: (...args) => mockSitesCount(...args),
      findFirst: (...args) => mockSitesFindFirst(...args),
    },
  },
}));

vi.mock('../../../server/middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'user-checkout-1', email: 'checkout@example.com' };
    next();
  },
  authenticateToken: (_req, _res, next) => next(),
}));

describe('createSubscriptionCheckout metadata', () => {
  let app;

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_checkout_meta';
    vi.resetModules();

    vi.doMock('stripe', () => ({
      default: class MockStripe {
        constructor() {
          this.customers = {
            retrieve: (...args) => mockCustomersRetrieve(...args),
            list: vi.fn().mockResolvedValue({ data: [] }),
            create: vi.fn().mockResolvedValue({ id: 'cus_created' }),
          };
          this.checkout = {
            sessions: {
              create: (...args) => mockSessionsCreate(...args),
            },
          };
          this.subscriptions = {
            list: (...args) => mockSubscriptionsList(...args),
          };
        }
      },
    }));

    const { default: paymentRoutes } = await import('../../../server/routes/payments.routes.js');
    app = express();
    app.use(express.json());
    app.use('/api', paymentRoutes);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomersRetrieve.mockResolvedValue({ id: 'cus_existing' });
    mockUsersFindUnique.mockResolvedValue({ stripe_customer_id: 'cus_existing', id: 'user-checkout-1' });
    mockUsersUpdate.mockResolvedValue({});
    mockSessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.test/cs' });
    mockSitesCount.mockResolvedValue(1);
    mockSitesFindFirst.mockResolvedValue(null);
    mockSubscriptionsList.mockResolvedValue({
      data: [{ id: 'sub_1', status: 'trialing' }],
      has_more: false,
    });
  });

  it('includes userId in session metadata and client_reference_id', async () => {
    const response = await request(app)
      .post('/api/payments/create-subscription-checkout')
      .send({ plan: 'starter' });

    expect(response.status).toBe(200);
    expect(mockSessionsCreate).toHaveBeenCalledTimes(1);

    const [sessionOptions, requestOptions] = mockSessionsCreate.mock.calls[0];
    expect(sessionOptions.metadata.userId).toBe('user-checkout-1');
    expect(sessionOptions.metadata.user_email).toBe('checkout@example.com');
    expect(sessionOptions.client_reference_id).toBe('user-checkout-1');
    expect(sessionOptions.subscription_data.metadata).toEqual({
      plan: 'starter',
      userId: 'user-checkout-1',
    });
    expect(sessionOptions.subscription_data.trial_period_days).toBe(7);
    expect(requestOptions).toEqual({
      idempotencyKey: 'plat-sub:user-checkout-1:starter',
    });
  });

  it('uses configured Stripe Price ID when env is set', async () => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter_env_test';

    const response = await request(app)
      .post('/api/payments/create-subscription-checkout')
      .send({ plan: 'starter' });

    expect(response.status).toBe(200);
    const [sessionOptions] = mockSessionsCreate.mock.calls[0];
    expect(sessionOptions.line_items).toEqual([{ price: 'price_starter_env_test', quantity: 1 }]);
    expect(sessionOptions.line_items[0].price_data).toBeUndefined();

    delete process.env.STRIPE_PRICE_STARTER;
  });

  it('checks out Growth Managed at $75 when Price ID is unset', async () => {
    delete process.env.STRIPE_PRICE_GROWTH_MANAGED;

    const response = await request(app)
      .post('/api/payments/create-subscription-checkout')
      .send({ plan: 'growth_managed' });

    expect(response.status).toBe(200);
    const [sessionOptions] = mockSessionsCreate.mock.calls[0];
    expect(sessionOptions.subscription_data.metadata.plan).toBe('growth_managed');
    expect(sessionOptions.line_items[0].price_data.unit_amount).toBe(7500);
  });

  it('returns 409 when user already has active subscription', async () => {
    mockUsersFindUnique.mockResolvedValue({
      stripe_customer_id: 'cus_existing',
      id: 'user-checkout-1',
      subscription_status: 'active',
      stripe_subscription_id: 'sub_existing',
    });

    const response = await request(app)
      .post('/api/payments/create-subscription-checkout')
      .send({ plan: 'growth' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ALREADY_SUBSCRIBED');
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('refuses checkout while the no-card live trial is still active', async () => {
    mockUsersFindUnique.mockResolvedValue({
      stripe_customer_id: 'cus_existing',
      id: 'user-checkout-1',
      subscription_status: null,
      stripe_subscription_id: null,
    });
    mockSitesFindFirst.mockResolvedValue({ id: 'site-live-trial' });

    const response = await request(app)
      .post('/api/payments/create-subscription-checkout')
      .send({ plan: 'starter' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('LIVE_TRIAL_ACTIVE');
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('starts checkout for an additional site when already subscribed', async () => {
    mockUsersFindUnique.mockResolvedValue({
      stripe_customer_id: 'cus_existing',
      id: 'user-checkout-1',
      subscription_status: 'trialing',
      stripe_subscription_id: 'sub_existing',
    });

    const response = await request(app)
      .post('/api/payments/create-subscription-checkout')
      .send({ plan: 'growth', additionalSite: true, draftId: 'draft-extra-1' });

    expect(response.status).toBe(200);
    expect(mockSessionsCreate).toHaveBeenCalledTimes(1);
    const [sessionOptions, requestOptions] = mockSessionsCreate.mock.calls[0];
    expect(sessionOptions.metadata.source).toBe('sitesprintz_additional_site');
    expect(sessionOptions.metadata.additionalSite).toBe('true');
    expect(sessionOptions.subscription_data.metadata.additionalSite).toBe('true');
    expect(requestOptions).toEqual({
      idempotencyKey: 'plat-sub:user-checkout-1:growth:additional:draft-extra-1',
    });
  });

  it('refuses extra-site checkout when a paid slot is still unused', async () => {
    mockUsersFindUnique.mockResolvedValue({
      stripe_customer_id: 'cus_existing',
      id: 'user-checkout-1',
      subscription_status: 'trialing',
      stripe_subscription_id: 'sub_existing',
    });
    mockSitesCount.mockResolvedValue(0);

    const response = await request(app)
      .post('/api/payments/create-subscription-checkout')
      .send({ plan: 'growth', additionalSite: true, draftId: 'draft-extra-2' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('SITE_SLOT_AVAILABLE');
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('returns 403 BILLING_NOT_OPEN when platform collection is paused', async () => {
    process.env.PLATFORM_COLLECT_PAYMENTS = 'false';

    const response = await request(app)
      .post('/api/payments/create-subscription-checkout')
      .send({ plan: 'starter' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('BILLING_NOT_OPEN');
    expect(mockSessionsCreate).not.toHaveBeenCalled();

    delete process.env.PLATFORM_COLLECT_PAYMENTS;
  });

  it('returns 403 BILLING_NOT_OPEN for labor checkout when collection is paused', async () => {
    process.env.PLATFORM_COLLECT_PAYMENTS = 'false';

    const response = await request(app)
      .post('/api/payments/labor-checkout')
      .send({ sku: 'brand_match' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('BILLING_NOT_OPEN');

    delete process.env.PLATFORM_COLLECT_PAYMENTS;
  });
});
