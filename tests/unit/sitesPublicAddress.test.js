/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../../database/db.js', () => ({
  prisma: {
    sites: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../../database/db.js';
import siteRoutes from '../../server/routes/sites.routes.js';

const STREET = '99 Hidden Ln Unit 4B';
const OWNER_ID = 'owner-area-privacy';
const SITE_ID = 'site-area-privacy';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sites', siteRoutes);
  return app;
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret-key');
}

function areaModeSite() {
  return {
    id: SITE_ID,
    subdomain: 'area-privacy-shop',
    template_id: 'salon',
    status: 'published',
    plan: 'growth',
    is_public: true,
    user_id: OWNER_ID,
    created_at: new Date('2026-01-01'),
    published_at: new Date('2026-01-02'),
    expires_at: null,
    site_data: {
      contact: {
        address: STREET,
        privateStreet: STREET,
        addressDisplay: 'area',
        serviceAreaLabel: 'Montclair, NJ',
        serviceRadiusMiles: 10,
      },
    },
  };
}

describe('GET /api/sites/:id address privacy', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
    prisma.sites.findUnique.mockResolvedValue(areaModeSite());
  });

  it('omits the private street for unauthenticated visitors', async () => {
    const response = await request(createApp()).get(`/api/sites/${SITE_ID}`);

    expect(response.status).toBe(200);
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('99 Hidden');
    expect(serialized).not.toContain(STREET);
    expect(response.body.site.data.contact.address).toBe(
      'Serving Montclair, NJ · within 10 miles'
    );
    expect(response.body.site.data.contact.privateStreet).toBeUndefined();
  });

  it('returns the private street to the owner', async () => {
    const response = await request(createApp())
      .get(`/api/sites/${SITE_ID}`)
      .set('Authorization', `Bearer ${signToken(OWNER_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body.site.data.contact.address).toBe(STREET);
    expect(response.body.site.data.contact.privateStreet).toBe(STREET);
  });
});
