import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockSessionsCreate = vi.fn();
const mockCustomersRetrieve = vi.fn();
const mockUsersFindUnique = vi.fn();
const mockUsersUpdate = vi.fn();

vi.mock('../../../database/db.js', () => ({
  prisma: {
    users: {
      findUnique: (...args) => mockUsersFindUnique(...args),
      update: (...args) => mockUsersUpdate(...args),
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
    expect(requestOptions).toEqual({
      idempotencyKey: 'plat-sub:user-checkout-1:starter',
    });
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
});
