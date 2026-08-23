import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../../database/db.js';
import { seedPrismaData, resetPrismaMocks } from '../mocks/prisma.js';
import { createTestUser, createTestSite } from '../utils/integrationTestSetup.js';

vi.mock('../../server/middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'products-route-user', email: 'products@test.com', role: 'user' };
    next();
  },
}));

import siteRoutes from '../../server/routes/sites.routes.js';

const TEST_USER_ID = 'products-route-user';
const TEST_SITE_ID = 'products-route-site';

const bookingServices = [
  { id: 'svc-haircut', title: 'Haircut & Style', description: 'Salon cut', price: 65 },
  { id: 'svc-color', title: 'Color Treatment', description: 'Full color', price: 120 },
];

const catalogProducts = [
  {
    id: 'prod-shampoo',
    name: 'Salon Shampoo',
    description: 'Retail bottle',
    price: 24,
    category: 'Retail',
    available: true,
  },
];

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/sites', siteRoutes);
  return app;
};

describe('API Integration Tests - Site products', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetPrismaMocks();
    seedPrismaData({
      users: [createTestUser({ id: TEST_USER_ID, email: 'products@test.com' })],
      sites: [
        createTestSite({
          id: TEST_SITE_ID,
          user_id: TEST_USER_ID,
          subdomain: 'products-route-site',
          site_data: {
            businessName: 'Products Route Salon',
            services: { items: bookingServices },
          },
        }),
      ],
    });
  });

  describe('GET /api/sites/:siteId/products', () => {
    it('falls back to services.items when products array is missing', async () => {
      const response = await request(app).get(`/api/sites/${TEST_SITE_ID}/products`);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(2);
      expect(response.body.products[0]).toMatchObject({
        id: 'svc-haircut',
        title: 'Haircut & Style',
        category: 'Service',
      });

      const site = await prisma.sites.findUnique({ where: { id: TEST_SITE_ID } });
      const siteData = typeof site.site_data === 'string' ? JSON.parse(site.site_data) : site.site_data;
      expect(siteData.services.items).toEqual(bookingServices);
      expect(siteData.products).toBeUndefined();
    });

    it('returns stored products when products array exists', async () => {
      seedPrismaData({
        sites: [
          createTestSite({
            id: TEST_SITE_ID,
            user_id: TEST_USER_ID,
            subdomain: 'products-route-site',
            site_data: {
              products: catalogProducts,
              services: { items: bookingServices },
            },
          }),
        ],
      });

      const response = await request(app).get(`/api/sites/${TEST_SITE_ID}/products`);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0]).toMatchObject({
        id: 'prod-shampoo',
        name: 'Salon Shampoo',
      });
    });
  });

  describe('PUT /api/sites/:siteId/products', () => {
    it('updates products only and preserves services.items', async () => {
      seedPrismaData({
        sites: [
          createTestSite({
            id: TEST_SITE_ID,
            user_id: TEST_USER_ID,
            subdomain: 'products-route-site',
            site_data: {
              products: catalogProducts,
              services: { items: bookingServices },
            },
          }),
        ],
      });

      const updatedCatalog = [
        ...catalogProducts,
        {
          id: 'prod-conditioner',
          name: 'Salon Conditioner',
          description: 'Retail bottle',
          price: 22,
          category: 'Retail',
          available: true,
        },
      ];

      const response = await request(app)
        .put(`/api/sites/${TEST_SITE_ID}/products`)
        .send({ products: updatedCatalog });

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(2);

      const site = await prisma.sites.findUnique({ where: { id: TEST_SITE_ID } });
      const siteData = typeof site.site_data === 'string' ? JSON.parse(site.site_data) : site.site_data;

      expect(siteData.products).toHaveLength(2);
      expect(siteData.products[1].name).toBe('Salon Conditioner');
      expect(siteData.services.items).toEqual(bookingServices);
      expect(siteData.services.items[0].title).toBe('Haircut & Style');
      expect(siteData.services.items[1].title).toBe('Color Treatment');
    });
  });
});
