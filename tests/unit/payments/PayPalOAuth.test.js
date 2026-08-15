/**
 * PayPal OAuth Flow Tests
 * Merchants connect their own PayPal account. No client-secret paste.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn()
};

const mockEncrypt = vi.fn((text) => `encrypted_${text}`);

const mockPrisma = {
  payment_processor_credentials: {
    upsert: vi.fn()
  },
  sites: {
    update: vi.fn()
  },
  site_payment_method: {
    upsert: vi.fn()
  },
  users: {
    update: vi.fn()
  }
};

global.fetch = vi.fn();

vi.mock('../../../server/utils/redis.js', () => ({
  default: mockRedis,
  getRedis: () => mockRedis
}));

vi.mock('../../../server/utils/encryption.js', () => ({
  encrypt: mockEncrypt,
  decrypt: vi.fn()
}));

vi.mock('../../../database/db.js', () => ({
  prisma: mockPrisma
}));

describe('PayPal OAuth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYPAL_CLIENT_ID = 'paypal_client';
    process.env.PAYPAL_CLIENT_SECRET = 'paypal_secret';
    process.env.NODE_ENV = 'test';
    mockPrisma.payment_processor_credentials.upsert.mockResolvedValue({});
    mockPrisma.sites.update.mockResolvedValue({});
    mockPrisma.site_payment_method.upsert.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
  });

  it('builds a hosted PayPal authorize URL with state', async () => {
    const { initiatePayPalOAuth } = await import('../../../server/services/payments/PayPalOAuthService.js');
    const result = await initiatePayPalOAuth(
      'site_123',
      'user_123',
      'http://localhost:3000/api/connect/paypal/callback'
    );

    expect(result.state).toHaveLength(64);
    expect(result.authorizeUrl).toContain('signin/authorize');
    expect(result.authorizeUrl).toContain('client_id=paypal_client');
    expect(result.authorizeUrl).toContain('state=');
    expect(mockRedis.setex).toHaveBeenCalledWith(
      `paypal_oauth_state:${result.state}`,
      600,
      expect.stringContaining('site_123')
    );
  });

  it('rejects expired state tokens', async () => {
    mockRedis.get.mockResolvedValue(null);
    const { handlePayPalCallback } = await import('../../../server/services/payments/PayPalOAuthService.js');

    await expect(handlePayPalCallback('code', 'bad-state'))
      .rejects.toThrow('Invalid or expired state token');
  });

  it('stores the merchant id after a successful callback', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({
      userId: 'user_123',
      siteId: 'site_123',
      redirectUri: 'http://localhost:3000/api/connect/paypal/callback'
    }));

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'paypal_at',
          refresh_token: 'paypal_rt',
          expires_in: 3600
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payer_id: 'PAYPALMERCHANT', email: 'owner@example.com' })
      });

    const { handlePayPalCallback } = await import('../../../server/services/payments/PayPalOAuthService.js');
    const result = await handlePayPalCallback('valid-code', 'valid_state');

    expect(result.merchantId).toBe('PAYPALMERCHANT');
    expect(mockEncrypt).toHaveBeenCalledWith('paypal_at');
    expect(mockPrisma.payment_processor_credentials.upsert).toHaveBeenCalled();
    expect(mockRedis.del).toHaveBeenCalledWith('paypal_oauth_state:valid_state');
  });
});
