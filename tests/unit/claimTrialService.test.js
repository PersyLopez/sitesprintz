import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../database/db.js', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockStripe = {
  customers: {
    list: vi.fn(),
    create: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  },
};

import { prisma } from '../../database/db.js';
import {
  createClaimTrialCheckout,
  completeClaimTrialCheckout,
  isSubscribedStatus,
  normalizeClaimPlan,
} from '../../server/services/claimTrialService.js';

describe('claimTrialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    delete process.env.STRIPE_PRICE_STARTER;
    delete process.env.STRIPE_PRICE_GROWTH;
    mockStripe.customers.list.mockResolvedValue({ data: [] });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_123' });
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/test',
    });
    prisma.users.update.mockResolvedValue({});
  });

  it('normalizes pro/premium to growth', () => {
    expect(normalizeClaimPlan('pro')).toBe('growth');
    expect(normalizeClaimPlan('premium')).toBe('growth');
    expect(normalizeClaimPlan('starter')).toBe('starter');
    expect(normalizeClaimPlan('invalid')).toBeNull();
  });

  it('detects trialing and active as subscribed', () => {
    expect(isSubscribedStatus('trialing')).toBe(true);
    expect(isSubscribedStatus('active')).toBe(true);
    expect(isSubscribedStatus('canceled')).toBe(false);
  });

  it('creates checkout session with 7-day trial and required metadata', async () => {
    const user = { id: 'user-1', email: 'owner@example.com' };
    const site = { id: 'site-1', subdomain: 'riverside-cuts' };

    const result = await createClaimTrialCheckout({
      user,
      site,
      plan: 'growth',
      claimToken: 'ab'.repeat(32),
      req: { headers: { origin: 'http://localhost:3000' } },
      stripe: mockStripe,
    });

    expect(result.url).toBe('https://checkout.stripe.com/test');
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        payment_method_collection: 'always',
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            plan: 'growth',
            userId: 'user-1',
          },
        },
        metadata: {
          userId: 'user-1',
          plan: 'growth',
          siteId: 'site-1',
          source: 'claim_trial',
        },
        success_url: expect.stringContaining('/claim/'),
        cancel_url: expect.stringContaining('/claim/'),
      })
    );
    const call = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(call.line_items[0].price_data.unit_amount).toBe(3500);
    expect(call.metadata).not.toHaveProperty('claimToken');
  });

  it('uses configured Growth Price ID when env is set', async () => {
    process.env.STRIPE_PRICE_GROWTH = 'price_growth_claim_test';
    const user = { id: 'user-1', email: 'owner@example.com' };
    const site = { id: 'site-1', subdomain: 'riverside-cuts' };

    await createClaimTrialCheckout({
      user,
      site,
      plan: 'growth',
      claimToken: 'ab'.repeat(32),
      req: { headers: { origin: 'http://localhost:3000' } },
      stripe: mockStripe,
    });

    const call = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(call.line_items).toEqual([{ price: 'price_growth_claim_test', quantity: 1 }]);
    delete process.env.STRIPE_PRICE_GROWTH;
  });

  it('syncs user subscription on trial-complete', async () => {
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      status: 'complete',
      customer: 'cus_123',
      metadata: {
        userId: 'user-1',
        plan: 'starter',
        siteId: 'site-1',
        source: 'claim_trial',
      },
      subscription: {
        id: 'sub_123',
        status: 'trialing',
        current_period_end: 1_700_000_000,
      },
    });

    const result = await completeClaimTrialCheckout({
      user: { id: 'user-1' },
      site: { id: 'site-1' },
      sessionId: 'cs_123',
      stripe: mockStripe,
    });

    expect(result).toEqual({ ready: true, subscriptionStatus: 'trialing' });
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        stripe_subscription_id: 'sub_123',
        subscription_status: 'trialing',
        plan: 'starter',
        subscription_plan: 'starter',
      }),
    });
  });
});
