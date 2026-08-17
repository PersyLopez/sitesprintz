import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  hashClaimToken,
} from '../../server/services/claimTokenService.js';

vi.mock('../../database/db.js', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    sites: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    outreach_candidates: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../../database/db.js';
import claimRoutes from '../../server/routes/claim.routes.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/claim', claimRoutes);
  return app;
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret-key');
}

const CLAIM_TOKEN = 'ab'.repeat(32);
const CLAIM_HASH = hashClaimToken(CLAIM_TOKEN);

const claimant = {
  id: 'user-1',
  email: 'owner@example.com',
  role: 'user',
  status: 'active',
  email_verified: true,
  subscription_status: 'trialing',
  subscription_plan: 'starter',
};

const prospectSite = {
  id: 'riverside-cuts',
  subdomain: 'riverside-cuts',
  user_id: 'admin-1',
  claim_token_hash: CLAIM_HASH,
  claim_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  site_data: { businessName: 'Riverside Cuts' },
};

describe('claim routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        sites: prisma.sites,
        outreach_candidates: prisma.outreach_candidates,
      })
    );
    prisma.sites.update.mockResolvedValue({ ...prospectSite, user_id: 'user-1' });
    prisma.outreach_candidates.updateMany.mockResolvedValue({ count: 1 });
    prisma.users.findUnique.mockImplementation(({ where }) => {
      if (where.id === 'user-1') return Promise.resolve(claimant);
      if (where.id === 'admin-1') return Promise.resolve({ id: 'admin-1', role: 'admin' });
      return Promise.resolve(null);
    });
  });

  it('returns 401 when accept is called with no token', async () => {
    const response = await request(createApp()).post(`/api/claim/${CLAIM_TOKEN}/accept`);
    expect(response.status).toBe(401);
    expect(prisma.sites.update).not.toHaveBeenCalled();
  });

  it('transfers user_id, clears the hash, and marks the candidate claimed', async () => {
    prisma.sites.findUnique.mockResolvedValue({ ...prospectSite });

    const response = await request(createApp())
      .post(`/api/claim/${CLAIM_TOKEN}/accept`)
      .set('Authorization', `Bearer ${signToken({ userId: 'user-1' })}`);

    expect(response.status).toBe(200);
    expect(response.body.claimed).toBe(true);
    expect(response.body).not.toHaveProperty('claim_token_hash');
    expect(prisma.sites.update).toHaveBeenCalledWith({
      where: { id: 'riverside-cuts' },
      data: {
        user_id: 'user-1',
        claim_token_hash: null,
        claim_token_expires: null,
      },
    });
    expect(prisma.outreach_candidates.updateMany).toHaveBeenCalledWith({
      where: { site_id: 'riverside-cuts' },
      data: { status: 'claimed' },
    });
  });

  it('returns 410 when the claim token is expired', async () => {
    prisma.sites.findUnique.mockResolvedValue({
      ...prospectSite,
      claim_token_expires: new Date(Date.now() - 1000),
    });

    const response = await request(createApp())
      .post(`/api/claim/${CLAIM_TOKEN}/accept`)
      .set('Authorization', `Bearer ${signToken({ userId: 'user-1' })}`);

    expect([400, 410]).toContain(response.status);
    expect(prisma.sites.update).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown token without leaking a hash', async () => {
    prisma.sites.findUnique.mockResolvedValue(null);

    const response = await request(createApp()).get(`/api/claim/${CLAIM_TOKEN}`);

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toMatch(/claim_token_hash/);
  });
});
