import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLaborCheckout } from '../../server/services/labor/laborCheckoutService.js';

describe('createLaborCheckout', () => {
  const stripe = {
    customers: {
      retrieve: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  };
  const prismaClient = {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const resolveOwnedSiteId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    prismaClient.users.findUnique.mockResolvedValue({ stripe_customer_id: 'cus_1' });
    stripe.customers.retrieve.mockResolvedValue({ id: 'cus_1' });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_labor',
      url: 'https://checkout.stripe.test/cs_labor',
    });
  });

  it('uses env Price IDs and ignores client amount', async () => {
    const result = await createLaborCheckout({
      user: { id: 'user-1', email: 'owner@example.com' },
      sku: 'brand_match',
      siteId: undefined,
      req: { headers: { origin: 'http://localhost:5173' } },
      stripe,
      prisma: prismaClient,
      resolveOwnedSiteId,
      now: new Date('2026-08-25T15:00:00Z'),
      env: { STRIPE_PRICE_BRAND_MATCH: 'price_brand_env' },
    });

    expect(result.sku).toBe('brand_match');
    expect(result.mode).toBe('payment');
    const [params, requestOpts] = stripe.checkout.sessions.create.mock.calls[0];
    expect(params.line_items).toEqual([{ price: 'price_brand_env', quantity: 1 }]);
    expect(params.line_items[0].price_data).toBeUndefined();
    expect(params.metadata).toEqual({
      source: 'labor_extra',
      type: 'brand_match',
      userId: 'user-1',
    });
    expect(params.metadata).not.toHaveProperty('claimToken');
    expect(requestOpts.idempotencyKey).toBe('labor:user-1:brand_match:2026-08-25');
    expect(resolveOwnedSiteId).not.toHaveBeenCalled();
  });

  it('rejects claim_setup and unknown SKUs', async () => {
    await expect(createLaborCheckout({
      user: { id: 'user-1', email: 'owner@example.com' },
      sku: 'claim_setup',
      stripe,
      prisma: prismaClient,
      resolveOwnedSiteId,
      env: { STRIPE_PRICE_CLAIM_SETUP: 'price_setup' },
    })).rejects.toMatchObject({ code: 'INVALID_LABOR_SKU' });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('creates a subscription session for managed care', async () => {
    await createLaborCheckout({
      user: { id: 'user-1', email: 'owner@example.com' },
      sku: 'managed_care',
      stripe,
      prisma: prismaClient,
      resolveOwnedSiteId,
      env: { STRIPE_PRICE_MANAGED_CARE: 'price_care_env' },
    });
    const [params] = stripe.checkout.sessions.create.mock.calls[0];
    expect(params.mode).toBe('subscription');
    expect(params.subscription_data.metadata.source).toBe('labor_extra');
    expect(params.subscription_data.metadata).not.toHaveProperty('plan');
  });

  it('attaches siteId only when the user owns the site', async () => {
    resolveOwnedSiteId.mockResolvedValue(null);
    await expect(createLaborCheckout({
      user: { id: 'user-1', email: 'owner@example.com' },
      sku: 'unique_look',
      siteId: 'someone-elses-site',
      stripe,
      prisma: prismaClient,
      resolveOwnedSiteId,
      env: { STRIPE_PRICE_UNIQUE_LOOK: 'price_look_env' },
    })).rejects.toMatchObject({ code: 'SITE_NOT_OWNED' });
  });

  it('returns 503-style error when Price ID is missing', async () => {
    await expect(createLaborCheckout({
      user: { id: 'user-1', email: 'owner@example.com' },
      sku: 'brand_match',
      stripe,
      prisma: prismaClient,
      resolveOwnedSiteId,
      env: {},
    })).rejects.toMatchObject({ code: 'LABOR_PRICE_NOT_CONFIGURED' });
  });
});
