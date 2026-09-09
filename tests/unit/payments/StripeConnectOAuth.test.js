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
  sites: { update: vi.fn(), findFirst: vi.fn() },
  site_payment_method: { upsert: vi.fn() },
  users: { update: vi.fn(), findUnique: vi.fn() }
};

const mockStripeAccounts = {
  retrieve: vi.fn(),
  create: vi.fn()
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
      this.accounts = mockStripeAccounts;
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
    mockPrisma.sites.findFirst.mockResolvedValue({ id: 'site_123' });
    mockPrisma.users.findUnique.mockResolvedValue({ stripe_account_id: 'acct_123' });
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

  it('persists stripe_connected when Account Link onboarding finished', async () => {
    mockStripeAccounts.retrieve.mockResolvedValue({
      id: 'acct_123',
      charges_enabled: true,
      payouts_enabled: true
    });

    const { syncStripeConnectionStatus } = await import('../../../server/services/payments/StripeConnectService.js');
    const result = await syncStripeConnectionStatus('user_123');

    expect(result).toMatchObject({ connected: true, accountId: 'acct_123' });
    expect(mockPrisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      data: { stripe_account_id: 'acct_123', stripe_connected: true }
    });
    expect(mockPrisma.payment_processor_credentials.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { site_id_processor: { site_id: 'site_123', processor: 'stripe' } }
      })
    );
    expect(mockPrisma.sites.update).not.toHaveBeenCalled();
  });

  it('clears stripe_connected when the account can no longer charge', async () => {
    mockStripeAccounts.retrieve.mockResolvedValue({
      id: 'acct_123',
      charges_enabled: false,
      payouts_enabled: true
    });

    const { syncStripeConnectionStatus } = await import('../../../server/services/payments/StripeConnectService.js');
    const result = await syncStripeConnectionStatus('user_123');

    expect(result).toMatchObject({ connected: false, chargesEnabled: false });
    expect(mockPrisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      data: { stripe_account_id: 'acct_123', stripe_connected: false }
    });
  });

  it('leaves stored state alone when Stripe retrieve fails', async () => {
    mockStripeAccounts.retrieve.mockRejectedValue(new Error('stripe down'));

    const { syncStripeConnectionStatus } = await import('../../../server/services/payments/StripeConnectService.js');
    const result = await syncStripeConnectionStatus('user_123');

    expect(result).toEqual({ connected: false, reason: 'verify_failed', accountId: 'acct_123' });
    expect(mockPrisma.users.update).not.toHaveBeenCalled();
  });

  it('reports no_account before onboarding starts', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ stripe_account_id: null });

    const { syncStripeConnectionStatus } = await import('../../../server/services/payments/StripeConnectService.js');
    const result = await syncStripeConnectionStatus('user_123');

    expect(result).toEqual({ connected: false, reason: 'no_account' });
    expect(mockStripeAccounts.retrieve).not.toHaveBeenCalled();
  });
});
