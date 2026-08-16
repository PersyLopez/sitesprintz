import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../../database/db.js';

vi.mock('../../database/db.js', () => ({
  prisma: {
    sites: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    orders: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    products: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    users: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('../../server/middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: '11111111-1111-1111-1111-111111111111', role: 'user' };
    next();
  }
}));

import ordersRoutes from '../../server/routes/orders.routes.js';

const growthSite = {
  id: 'site-1',
  user_id: '11111111-1111-1111-1111-111111111111',
  subdomain: 'cafe',
  status: 'published',
  is_public: true,
  plan: 'growth',
  site_data: {
    settings: { payOnSite: true, allowCheckout: true },
    products: [{ id: 'soup', name: 'Soup', price: 8 }]
  },
  users: { plan: 'growth', subscription_plan: 'growth' }
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRoutes);
  return app;
}

describe('POST /api/orders/:siteId/pay-on-site', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.sites.findUnique.mockResolvedValue(growthSite);
    prisma.sites.findFirst.mockResolvedValue(null);
  });

  it('rejects orders when pay on site is not enabled', async () => {
    prisma.sites.findUnique.mockResolvedValue({
      ...growthSite,
      site_data: { settings: { allowCheckout: true, payOnSite: false } }
    });

    const response = await request(createApp())
      .post('/api/orders/site-1/pay-on-site')
      .send({
        customerName: 'Alex',
        customerEmail: 'alex@example.com',
        items: [{ name: 'Soup', price: 8, quantity: 1 }]
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PAY_ON_SITE_DISABLED');
    expect(prisma.orders.create).not.toHaveBeenCalled();
  });

  it('creates an unpaid order when pay on site is enabled', async () => {
    prisma.orders.create.mockResolvedValue({
      id: 'order-1',
      status: 'pending',
      payment_status: 'unpaid',
      fulfillment_type: 'pay_on_site',
      total_amount: 16,
      customer_name: 'Alex Rivera',
      customer_email: 'alex@example.com'
    });

    const response = await request(createApp())
      .post('/api/orders/site-1/pay-on-site')
      .send({
        customerName: 'Alex Rivera',
        customerEmail: 'alex@example.com',
        items: [{ id: 'soup', name: 'Soup', price: 0.01, quantity: 2 }]
      });

    expect(response.status).toBe(201);
    expect(response.body.order.paymentStatus).toBe('unpaid');
    expect(prisma.orders.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        payment_status: 'unpaid',
        fulfillment_type: 'pay_on_site',
        total_amount: 16
      })
    }));
  });

  it('rejects items that are not on the site catalog', async () => {
    const response = await request(createApp())
      .post('/api/orders/site-1/pay-on-site')
      .send({
        customerName: 'Alex Rivera',
        customerEmail: 'alex@example.com',
        items: [{ name: 'Not On Menu', price: 8, quantity: 1 }]
      });

    expect(response.status).toBe(400);
    expect(prisma.orders.create).not.toHaveBeenCalled();
  });

  it('rejects an empty cart', async () => {
    const response = await request(createApp())
      .post('/api/orders/site-1/pay-on-site')
      .send({
        customerName: 'Alex Rivera',
        customerEmail: 'alex@example.com',
        items: []
      });

    expect(response.status).toBe(400);
    expect(prisma.orders.create).not.toHaveBeenCalled();
  });

  it('rejects unpublished sites', async () => {
    prisma.sites.findUnique.mockResolvedValue({
      ...growthSite,
      status: 'draft'
    });

    const response = await request(createApp())
      .post('/api/orders/site-1/pay-on-site')
      .send({
        customerName: 'Alex Rivera',
        customerEmail: 'alex@example.com',
        items: [{ name: 'Soup', price: 8, quantity: 1 }]
      });

    expect(response.status).toBe(404);
    expect(prisma.orders.create).not.toHaveBeenCalled();
  });

  it('rejects invalid email', async () => {
    const response = await request(createApp())
      .post('/api/orders/site-1/pay-on-site')
      .send({
        customerName: 'Alex Rivera',
        customerEmail: 'not-an-email',
        items: [{ name: 'Soup', price: 8, quantity: 1 }]
      });

    expect(response.status).toBe(400);
    expect(prisma.orders.create).not.toHaveBeenCalled();
  });

  it('simulates gallery demo orders without writing to the database', async () => {
    prisma.sites.findUnique.mockResolvedValue({
      ...growthSite,
      subdomain: 'gallery-products',
      site_data: {
        settings: { payOnSite: true, allowCheckout: true, demoMode: true },
        products: [{ id: 'soup', name: 'Soup', price: 8 }]
      }
    });

    const response = await request(createApp())
      .post('/api/orders/site-1/pay-on-site')
      .send({
        customerName: 'Alex Rivera',
        customerEmail: 'alex@example.com',
        customerPhone: '5551234567',
        items: [{ id: 'soup', name: 'Soup', price: 8, quantity: 1 }]
      });

    expect(response.status).toBe(201);
    expect(response.body.order?.demo).toBe(true);
    expect(String(response.body.order?.id || '')).toMatch(/^demo-/);
    expect(prisma.orders.create).not.toHaveBeenCalled();
  });
});
