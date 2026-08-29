import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn()
};

const mockPrisma = {
  payment_processor_credentials: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn()
  },
  sites: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  site_payment_method: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  users: {
    findUnique: vi.fn(),
    update: vi.fn()
  }
};

vi.mock('../../../server/utils/redis.js', () => ({
  default: mockRedis,
  getRedis: () => mockRedis
}));

vi.mock('../../../server/utils/encryption.js', () => ({
  encrypt: (value) => `encrypted_${value}`,
  decrypt: vi.fn()
}));

vi.mock('../../../database/db.js', () => ({
  prisma: mockPrisma
}));

describe('site-specific processor connections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
  });

  it('keeps Square pending when the owner has no sites yet', async () => {
    const { recordProcessorConnection } = await import('../../../server/services/payments/processorConnectHelpers.js');
    mockPrisma.sites.findMany.mockResolvedValue([]);

    await recordProcessorConnection({
      userId: 'user-1',
      processor: 'square',
      accountId: 'sq_merchant',
      accessToken: 'sq_token'
    });

    expect(mockRedis.setex).toHaveBeenCalledWith(
      'processor_pending:user-1:square',
      expect.any(Number),
      expect.stringContaining('sq_merchant')
    );
    expect(mockPrisma.payment_processor_credentials.upsert).not.toHaveBeenCalled();
  });

  it('writes Square to the selected site only', async () => {
    const { recordProcessorConnection } = await import('../../../server/services/payments/processorConnectHelpers.js');
    mockPrisma.sites.findMany.mockResolvedValue([{ id: 'site-1' }, { id: 'site-2' }]);

    await recordProcessorConnection({
      userId: 'user-1',
      siteId: 'site-1',
      processor: 'square',
      accountId: 'sq_merchant',
      accessToken: 'sq_token',
      applyTo: 'site'
    });

    expect(mockPrisma.payment_processor_credentials.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.payment_processor_credentials.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ site_id: 'site-1', processor: 'square' })
      })
    );
  });

  it('copies a pending Square account onto a newly published site', async () => {
    const { inheritPaymentAccountsForSite } = await import('../../../server/services/payments/processorConnectHelpers.js');
    mockPrisma.payment_processor_credentials.findMany.mockResolvedValue([]);
    mockPrisma.sites.findFirst.mockResolvedValue(null);
    mockPrisma.users.findUnique.mockResolvedValue({ stripe_account_id: null, stripe_connected: false });
    mockRedis.get.mockImplementation(async (key) => {
      if (key === 'processor_pending:user-1:square') {
        return JSON.stringify({
          processor: 'square',
          account_id: 'sq_merchant',
          access_token_encrypted: 'encrypted_sq_token',
          is_active: true
        });
      }
      return null;
    });

    await inheritPaymentAccountsForSite('user-1', 'site-new');

    expect(mockPrisma.payment_processor_credentials.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          site_id: 'site-new',
          processor: 'square',
          account_id: 'sq_merchant'
        })
      })
    );
    expect(mockRedis.del).toHaveBeenCalledWith('processor_pending:user-1:square');
  });

  it('does not copy another site’s processors unless future defaults are enabled', async () => {
    const { inheritPaymentAccountsForSite } = await import('../../../server/services/payments/processorConnectHelpers.js');
    mockRedis.get.mockResolvedValue(null);

    await inheritPaymentAccountsForSite('user-1', 'site-new');

    expect(mockPrisma.payment_processor_credentials.upsert).not.toHaveBeenCalled();
  });

  it('copies the saved source site onto a new site when future defaults are on', async () => {
    const { inheritPaymentAccountsForSite } = await import('../../../server/services/payments/processorConnectHelpers.js');
    mockRedis.get.mockImplementation(async (key) => {
      if (key === 'payment_future_defaults:user-1') {
        return JSON.stringify({ enabled: true, sourceSiteId: 'site-1' });
      }
      return null;
    });
    mockPrisma.payment_processor_credentials.findMany.mockResolvedValue([
      {
        processor: 'square',
        account_id: 'sq_merchant',
        access_token_encrypted: 'encrypted_sq_token',
        is_active: true
      }
    ]);
    mockPrisma.sites.findFirst.mockResolvedValue({ payment_processor: 'square' });

    await inheritPaymentAccountsForSite('user-1', 'site-new');

    expect(mockPrisma.payment_processor_credentials.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { site_id: 'site-1', is_active: true } })
    );
    expect(mockPrisma.payment_processor_credentials.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          site_id: 'site-new',
          processor: 'square'
        })
      })
    );
  });

  it('reports a pending PayPal connection before any site exists', async () => {
    const { getConnectedProcessors } = await import('../../../server/services/payments/processorConnectHelpers.js');
    mockPrisma.users.findUnique.mockResolvedValue({ stripe_account_id: null, stripe_connected: false });
    mockPrisma.payment_processor_credentials.findMany.mockResolvedValue([]);
    mockPrisma.site_payment_method.findUnique.mockResolvedValue(null);
    mockRedis.get.mockImplementation(async (key) => {
      if (key === 'processor_pending:user-1:paypal') {
        return JSON.stringify({ processor: 'paypal', account_id: 'paypal_merchant' });
      }
      return null;
    });

    const connected = await getConnectedProcessors('user-1', null);

    expect(connected.byProcessor.paypal.account_id).toBe('paypal_merchant');
  });

  it('skips site_payment_method when the Prisma client has no model', async () => {
    const { getConnectedProcessors } = await import('../../../server/services/payments/processorConnectHelpers.js');
    const original = mockPrisma.site_payment_method;
    mockPrisma.site_payment_method = undefined;
    mockPrisma.users.findUnique.mockResolvedValue({ stripe_account_id: null, stripe_connected: false });
    mockPrisma.payment_processor_credentials.findMany.mockResolvedValue([]);

    await expect(getConnectedProcessors('user-1', 'site-1')).resolves.toMatchObject({
      byProcessor: {}
    });

    mockPrisma.site_payment_method = original;
  });

  it('returns a disconnected payload when processor lookup throws', async () => {
    const { getPaymentConnectStatus } = await import('../../../server/services/payments/processorConnectHelpers.js');
    mockPrisma.sites.findFirst.mockResolvedValue({ id: 'site-1' });
    mockPrisma.users.findUnique.mockRejectedValue(new Error('db down'));

    const status = await getPaymentConnectStatus('user-1', 'site-1');

    expect(status.connected).toBe(false);
    expect(status.chargesEnabled).toBe(false);
    expect(status.square.connected).toBe(false);
    expect(status.available).toBeDefined();
  });
});

describe('visitor checkout processor gating', () => {
  it('only treats Stripe as a public visitor checkout processor', async () => {
    const {
      PUBLIC_VISITOR_PROCESSORS,
      isVisitorProcessorPublic,
      publicVisitorCheckoutProcessor,
      visitorOnlinePaymentReady,
    } = await import('../../../server/services/payments/processorConnectHelpers.js');

    expect(PUBLIC_VISITOR_PROCESSORS).toEqual(['stripe']);
    expect(isVisitorProcessorPublic('stripe')).toBe(true);
    expect(isVisitorProcessorPublic('square')).toBe(false);
    expect(isVisitorProcessorPublic('paypal')).toBe(false);

    const stripeUser = { stripe_account_id: 'acct_1', stripe_connected: true };
    expect(visitorOnlinePaymentReady({ user: stripeUser })).toBe(true);
    expect(publicVisitorCheckoutProcessor({ user: stripeUser })).toBe('stripe');

    expect(visitorOnlinePaymentReady({
      user: { stripe_connected: false },
      byProcessor: { square: { account_id: 'sq_1' } },
      defaultProcessor: 'square',
    })).toBe(false);
    expect(publicVisitorCheckoutProcessor({
      user: { stripe_connected: false },
      byProcessor: { square: { account_id: 'sq_1' } },
      defaultProcessor: 'square',
    })).toBeNull();
  });
});
