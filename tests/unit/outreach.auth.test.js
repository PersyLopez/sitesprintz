/**
 * Outreach auth: real requireAdmin. Mock prisma user load (authenticateAndLoadUser).
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
    outreach_candidates: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../server/services/outreach/candidateFinder.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchPlacesCandidates: vi.fn(),
    fetchPlaceDetails: vi.fn(),
  };
});

import { prisma } from '../../database/db.js';
import { searchPlacesCandidates } from '../../server/services/outreach/candidateFinder.js';
import outreachRoutes from '../../server/routes/outreach.routes.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/outreach', outreachRoutes);
  return app;
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret-key');
}

describe('outreach routes auth (requireAdmin not mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
  });

  it('returns 401 when no token is provided', async () => {
    const response = await request(createApp())
      .post('/api/outreach/search')
      .send({ city: 'Austin', niche: 'salon' });

    expect(response.status).toBe(401);
    expect(searchPlacesCandidates).not.toHaveBeenCalled();
  });

  it('returns 401 or 403 for a role:user token', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
      status: 'active',
      email_verified: true,
      subscription_status: 'active',
      subscription_plan: 'starter',
    });

    const token = signToken({ userId: 'user-1' });
    const response = await request(createApp())
      .post('/api/outreach/search')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Austin', niche: 'salon' });

    expect([401, 403]).toContain(response.status);
    expect(searchPlacesCandidates).not.toHaveBeenCalled();
  });
});
