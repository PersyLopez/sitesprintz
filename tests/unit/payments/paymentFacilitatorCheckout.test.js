import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import paymentFacilitatorRoutes from '../../../server/routes/payment-facilitator.routes.js';
import { prisma } from '../../../database/db.js';

const mockStripe = {
  accounts: { retrieve: vi.fn() },
  checkout: { sessions: { create: vi.fn() } }
};
const validateAndRebuildCheckout = vi.fn();

vi.mock('../../../database/db.js', () => ({
  prisma: {
    sites: { findUnique: vi.fn() },
    site_payment_method: { findUnique: vi.fn() }
  }
}));

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe() {
    return mockStripe;
  })
}));

vi.mock('../../../server/services/ProductCatalogService.js', () => ({
  ProductCatalogService: vi.fn(function MockProductCatalogService() {
    return { validateAndRebuildCheckout };
  })
}));

vi.mock('../../../server/utils/parseSiteData.js', () => ({
  parseSiteData: vi.fn(() => ({ products: [{ id: 'product-1', price: 25.5 }] }))
}));

vi.mock('../../../server/utils/delivery.js', () => ({
  buildDeliveryCharge: vi.fn(async () => ({
    ok: true,
    fee: 0,
    fulfillmentType: 'pickup'
  }))
}));

const squareCreateCheckout = vi.fn();
const getProcessor = vi.fn(async () => ({ createCheckout: squareCreateCheckout }));

vi.mock('../../../server/services/payments/PaymentServiceFactory.js', () => ({
  PaymentServiceFactory: {
    getProcessor: (...args) => getProcessor(...args)
  },
  default: {
    getProcessor: (...args) => getProcessor(...args)
  }
}));

describe('Payment facilitator Stripe checkout', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentFacilitatorRoutes);

    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    prisma.sites.findUnique.mockResolvedValue({
      id: 'site-123',
      user_id: 'user-123',
      site_data: '{"products":[{"id":"product-1","price":25.5}]}',
      users: { email: 'owner@example.com' }
    });
    prisma.site_payment_method.findUnique.mockResolvedValue({
      provider: 'stripe',
      account_id: 'acct-123',
      is_active: true
    });
    mockStripe.accounts.retrieve.mockResolvedValue({ charges_enabled: true });
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/cs_test_123'
    });
  });

  it('rebuilds checkout items from the site catalog before creating the session', async () => {
    const clientItems = [{
      productId: 'product-1',
      name: 'Tampered name',
      price: 0.01,
      quantity: 2
    }];
    const parsedSiteData = { products: [{ id: 'product-1', price: 25.5 }] };
    vi.mocked((await import('../../../server/utils/parseSiteData.js')).parseSiteData)
      .mockReturnValue(parsedSiteData);
    validateAndRebuildCheckout.mockResolvedValue({
      items: [{
        productId: 'product-1',
        name: 'Catalog product',
        description: 'Validated description',
        image: 'https://example.com/product.jpg',
        price: 25.5,
        quantity: 2
      }]
    });

    await request(app)
      .post('/api/payments/checkout/create-session')
      .send({
        siteId: 'site-123',
        items: clientItems,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      })
      .expect(200);

    expect(validateAndRebuildCheckout).toHaveBeenCalledWith(
      clientItems,
      'site-123',
      parsedSiteData
    );
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{
          price_data: expect.objectContaining({
            product_data: {
              name: 'Catalog product',
              description: 'Validated description',
              images: ['https://example.com/product.jpg']
            },
            unit_amount: 2550
          }),
          quantity: 2
        }],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          siteId: 'site-123',
          userId: 'user-123',
          site_id: 'site-123',
          user_id: 'user-123',
          order_items: JSON.stringify([{
            productId: 'product-1',
            name: 'Catalog product',
            description: 'Validated description',
            image: 'https://example.com/product.jpg',
            price: 25.5,
            quantity: 2
          }]),
          type: 'order',
          fulfillment_type: 'pickup'
        }
      }),
      { stripeAccount: 'acct-123' }
    );
  });

  it('returns INVALID_CHECKOUT when catalog validation fails', async () => {
    validateAndRebuildCheckout.mockRejectedValue(new Error('Product not found: unknown'));

    const response = await request(app)
      .post('/api/payments/checkout/create-session')
      .send({
        siteId: 'site-123',
        items: [{ productId: 'unknown', price: 1, quantity: 1 }]
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      code: 'INVALID_CHECKOUT',
      error: 'Product not found: unknown'
    });
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe('Payment facilitator Square checkout', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentFacilitatorRoutes);

    vi.clearAllMocks();
    prisma.sites.findUnique.mockResolvedValue({
      id: 'site-123',
      user_id: 'user-123',
      site_data: '{"products":[{"id":"product-1","price":25.5}]}',
      users: { email: 'owner@example.com' }
    });
    prisma.site_payment_method.findUnique.mockResolvedValue({
      provider: 'square',
      account_id: 'sq-merchant-123',
      is_active: true
    });
    getProcessor.mockResolvedValue({ createCheckout: squareCreateCheckout });
    squareCreateCheckout.mockResolvedValue({
      sessionId: 'link_sq_123',
      checkoutUrl: 'https://checkout.square.site/pay/link_sq_123'
    });
  });

  it('rebuilds checkout items then creates Square checkout via factory', async () => {
    const clientItems = [{
      productId: 'product-1',
      name: 'Tampered name',
      price: 0.01,
      quantity: 2
    }];
    const parsedSiteData = { products: [{ id: 'product-1', price: 25.5 }] };
    vi.mocked((await import('../../../server/utils/parseSiteData.js')).parseSiteData)
      .mockReturnValue(parsedSiteData);
    validateAndRebuildCheckout.mockResolvedValue({
      items: [{
        productId: 'product-1',
        name: 'Catalog product',
        description: 'Validated description',
        image: 'https://example.com/product.jpg',
        price: 25.5,
        quantity: 2
      }]
    });

    const response = await request(app)
      .post('/api/payments/checkout/create-session')
      .send({
        siteId: 'site-123',
        items: clientItems,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      redirectUrl: 'https://checkout.square.site/pay/link_sq_123',
      sessionId: 'link_sq_123',
      provider: 'square'
    });
    expect(validateAndRebuildCheckout).toHaveBeenCalledWith(
      clientItems,
      'site-123',
      parsedSiteData
    );
    expect(getProcessor).toHaveBeenCalledWith('site-123', 'square');
    expect(squareCreateCheckout).toHaveBeenCalledWith({
      items: [{
        productId: 'product-1',
        name: 'Catalog product',
        description: 'Validated description',
        image: 'https://example.com/product.jpg',
        price: 25.5,
        quantity: 2
      }],
      totalCents: 5100,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      metadata: {
        site_id: 'site-123',
        user_id: 'user-123',
        order_items: JSON.stringify([{
          productId: 'product-1',
          name: 'Catalog product',
          description: 'Validated description',
          image: 'https://example.com/product.jpg',
          price: 25.5,
          quantity: 2
        }]),
        type: 'order',
        fulfillment_type: 'pickup'
      }
    });
    expect(squareCreateCheckout.mock.calls[0][0]).not.toHaveProperty('application_fee');
  });

  it('returns INVALID_CHECKOUT when catalog validation fails', async () => {
    validateAndRebuildCheckout.mockRejectedValue(new Error('Product not found: unknown'));

    const response = await request(app)
      .post('/api/payments/checkout/create-session')
      .send({
        siteId: 'site-123',
        items: [{ productId: 'unknown', price: 1, quantity: 1 }]
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      code: 'INVALID_CHECKOUT',
      error: 'Product not found: unknown'
    });
    expect(squareCreateCheckout).not.toHaveBeenCalled();
  });
});
