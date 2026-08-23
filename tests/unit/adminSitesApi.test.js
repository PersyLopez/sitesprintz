/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../../database/db.js', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    sites: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../../database/db.js';
import adminRoutes from '../../server/routes/admin.routes.js';

const ANALYTICS_RECENT_CAP = 10;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret-key');
}

describe('GET /api/admin/sites', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
  });

  it('returns more sites than the analytics recent cap for admin', async () => {
    const mockSites = Array.from({ length: 15 }, (_, index) => ({
      id: `site-${index}`,
      subdomain: `site-${index}`,
      status: 'published',
      plan: 'starter',
      published_at: new Date('2025-01-01'),
      created_at: new Date('2025-01-01'),
      user_id: 'user-1',
      users: { email: 'user@example.com' },
    }));

    prisma.users.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      email_verified: true,
      subscription_status: 'active',
      subscription_plan: 'pro',
    });
    prisma.sites.findMany.mockResolvedValue(mockSites);
    prisma.sites.count.mockResolvedValue(15);

    const response = await request(createApp())
      .get('/api/admin/sites')
      .set('Authorization', `Bearer ${signToken('admin-1')}`);

    expect(response.status).toBe(200);
    expect(response.body.sites).toHaveLength(15);
    expect(response.body.sites.length).toBeGreaterThan(ANALYTICS_RECENT_CAP);

    const findManyArgs = prisma.sites.findMany.mock.calls[0][0];
    expect(findManyArgs.take).toBeGreaterThan(ANALYTICS_RECENT_CAP);
  });

  it('returns 403 for non-admin users', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
      status: 'active',
      email_verified: true,
      subscription_status: 'active',
      subscription_plan: 'starter',
    });

    const response = await request(createApp())
      .get('/api/admin/sites')
      .set('Authorization', `Bearer ${signToken('user-1')}`);

    expect(response.status).toBe(403);
    expect(prisma.sites.findMany).not.toHaveBeenCalled();
  });
});
