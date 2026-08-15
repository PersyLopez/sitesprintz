/**
 * Stripe Standard Connect — OAuth for existing accounts, Account Links otherwise.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn()
};

const mockPrisma = {
  payment_processor_credentials: { upsert: vi.fn() },
  sites: { update: vi.fn() },
  site_payment_method: { upsert: vi.fn() },
  users: { update: vi.fn() }
};

vi.mock('../../../server/utils/redis.js', () => ({
  default: mockRedis,
  getRedis: () => mockRedis
}));

vi.mock('../../../server/utils/encryption.js', () => ({
  encrypt: vi.fn((text) => `encrypted_${text}`),
  decrypt: vi.fn()
}));

vi.mock('../../../database/db.js', () => ({
  prisma: mockPrisma
}));

vi.mock('stripe', () => {
  class Stripe {
    constructor() {
      this.oauth = { token: vi.fn() };
      this.accounts = {
        retrieve: vi.fn(),
        create: vi.fn()
      };
      this.accountLinks = { create: vi.fn() };
    }
  }
  return { default: Stripe };
});

describe('Stripe Standard Connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_CLIENT_ID = 'ca_test_123';
    mockPrisma.payment_processor_credentials.upsert.mockResolvedValue({});
    mockPrisma.sites.update.mockResolvedValue({});
    mockPrisma.site_payment_method.upsert.mockResolvedValue({});
    mockPrisma.users.update.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_CLIENT_ID;
  });

  it('builds a Standard OAuth URL for existing Stripe accounts', async () => {
    const { initiateStripeOAuth } = await import('../../../server/services/payments/StripeConnectService.js');
    const result = await initiateStripeOAuth(
      'user_123',
      'site_123',
      'http://localhost:3000/api/connect/stripe/callback'
    );

    expect(result.authorizeUrl).toContain('connect.stripe.com/oauth/authorize');
    expect(result.authorizeUrl).toContain('client_id=ca_test_123');
    expect(result.authorizeUrl).toContain('scope=read_write');
    expect(result.state).toHaveLength(64);
  });

  it('rejects expired OAuth state', async () => {
    mockRedis.get.mockResolvedValue(null);
    const { handleStripeOAuthCallback } = await import('../../../server/services/payments/StripeConnectService.js');
    await expect(handleStripeOAuthCallback('code', 'bad')).rejects.toThrow('Invalid or expired state token');
  });
});
