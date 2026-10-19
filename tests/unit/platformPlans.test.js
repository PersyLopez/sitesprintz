import { describe, it, expect } from 'vitest';
import {
  LIVE_TRIAL_DAYS,
  STRIPE_TRIAL_DAYS,
  liveTrialExpiresAt,
  publicSiteBlockedByLiveTrial,
  liveTrialPublicWhere,
  applyLiveTrialPublicWhere,
  publishedCrawlerDocumentHidden,
  CLAIM_PLAN,
  PLATFORM_PLAN_DETAILS,
  LABOR_SKUS,
  CUSTOMER_LABOR_SKUS,
  normalizePaidPlan,
  normalizeCustomerLaborSku,
  laborCheckoutMode,
  laborIdempotencyKey,
  isCustomerLaborSkuConfigured,
  platformCollectsPayments,
  BILLING_NOT_OPEN_MESSAGE,
  stripeSubscriptionLineItem,
  stripeLaborLineItem,
} from '../../server/config/platformPlans.js';

describe('platformPlans', () => {
  it('keeps monthly amounts at $10, $35, and $75', () => {
    expect(LIVE_TRIAL_DAYS).toBe(15);
    expect(STRIPE_TRIAL_DAYS).toBe(7);
    expect(CLAIM_PLAN).toBe('growth');
    expect(PLATFORM_PLAN_DETAILS.starter.amount).toBe(1000);
    expect(PLATFORM_PLAN_DETAILS.growth.amount).toBe(3500);
    expect(PLATFORM_PLAN_DETAILS.growth_managed.amount).toBe(7500);
  });

  it('computes live trial expiry from LIVE_TRIAL_DAYS', () => {
    const start = new Date('2026-08-30T12:00:00Z');
    const expires = liveTrialExpiresAt(start);
    expect(expires.getTime() - start.getTime()).toBe(LIVE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  });

  it('hides a lapsed no-card trial only while billing is open', () => {
    const past = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-10-19T00:00:00Z');
    const lapsed = { collectsPayments: true, plan: 'trial', expiresAt: past, now };
    expect(publicSiteBlockedByLiveTrial(lapsed)).toBe(true);
    expect(publicSiteBlockedByLiveTrial({ ...lapsed, collectsPayments: false })).toBe(false);
    expect(publicSiteBlockedByLiveTrial({ ...lapsed, plan: 'growth' })).toBe(false);
    expect(publicSiteBlockedByLiveTrial({ ...lapsed, plan: null })).toBe(true);
    expect(publicSiteBlockedByLiveTrial({
      ...lapsed,
      stripeSubscriptionId: 'sub_123',
      subscriptionStatus: 'active',
    })).toBe(false);
    expect(publicSiteBlockedByLiveTrial({
      collectsPayments: true,
      plan: 'trial',
      expiresAt: new Date('2026-12-01T00:00:00Z'),
      now,
    })).toBe(false);
  });

  it('keeps lapsed trials in list queries while billing is closed', () => {
    const now = new Date('2026-10-19T00:00:00Z');
    const previous = process.env.PLATFORM_COLLECT_PAYMENTS;
    process.env.PLATFORM_COLLECT_PAYMENTS = 'false';
    try {
      expect(liveTrialPublicWhere(now)).toBeNull();
      expect(applyLiveTrialPublicWhere({ status: 'published' }, now)).toEqual({ status: 'published' });
    } finally {
      if (previous === undefined) delete process.env.PLATFORM_COLLECT_PAYMENTS;
      else process.env.PLATFORM_COLLECT_PAYMENTS = previous;
    }
  });

  it('excludes a lapsed trial from list queries while billing is open', () => {
    const now = new Date('2026-10-19T00:00:00Z');
    const previous = process.env.PLATFORM_COLLECT_PAYMENTS;
    process.env.PLATFORM_COLLECT_PAYMENTS = 'true';
    try {
      const clause = liveTrialPublicWhere(now);
      expect(clause.OR).toEqual(expect.arrayContaining([
        { expires_at: null },
        { expires_at: { gte: now } },
      ]));
      const where = applyLiveTrialPublicWhere({ status: 'published', is_public: true }, now);
      expect(where.AND).toEqual([clause]);
      expect(where.status).toBe('published');
    } finally {
      if (previous === undefined) delete process.env.PLATFORM_COLLECT_PAYMENTS;
      else process.env.PLATFORM_COLLECT_PAYMENTS = previous;
    }
  });

  it('keeps crawler HTML off unpublished shops', () => {
    const previous = process.env.PLATFORM_COLLECT_PAYMENTS;
    process.env.PLATFORM_COLLECT_PAYMENTS = 'true';
    const now = new Date('2026-10-19T00:00:00Z');
    try {
      expect(publishedCrawlerDocumentHidden(null, now)).toBe(true);
      expect(publishedCrawlerDocumentHidden({ status: 'draft', plan: 'growth' }, now)).toBe(true);
      expect(publishedCrawlerDocumentHidden({ status: 'expired', plan: 'trial' }, now)).toBe(true);
      expect(publishedCrawlerDocumentHidden({
        status: 'published',
        plan: 'growth',
        expires_at: new Date('2020-01-01T00:00:00Z'),
      }, now)).toBe(false);
      expect(publishedCrawlerDocumentHidden({
        status: 'published',
        plan: 'trial',
        expires_at: new Date('2020-01-01T00:00:00Z'),
      }, now)).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.PLATFORM_COLLECT_PAYMENTS;
      else process.env.PLATFORM_COLLECT_PAYMENTS = previous;
    }
  });

  it('normalizes legacy paid plans', () => {
    expect(normalizePaidPlan('pro')).toBe('growth');
    expect(normalizePaidPlan('premium')).toBe('growth');
    expect(normalizePaidPlan('starter')).toBe('starter');
    expect(normalizePaidPlan('managed')).toBe('growth_managed');
    expect(normalizePaidPlan('growth_managed')).toBe('growth_managed');
    expect(normalizePaidPlan('invalid')).toBeNull();
  });

  it('uses inline price_data when Price IDs are unset', () => {
    const item = stripeSubscriptionLineItem('growth', {});
    expect(item.price_data.unit_amount).toBe(3500);
    expect(item.price_data.product_data.description).toMatch(/hosting/i);
  });

  it('uses inline price_data for Growth Managed when Price IDs are unset', () => {
    const item = stripeSubscriptionLineItem('growth_managed', {});
    expect(item.price_data.unit_amount).toBe(7500);
  });

  it('prefers Dashboard Price IDs', () => {
    const item = stripeSubscriptionLineItem('starter', {
      STRIPE_PRICE_STARTER: 'price_starter_abc',
    });
    expect(item).toEqual({ price: 'price_starter_abc', quantity: 1 });
  });

  it('requires a Dashboard Price ID for labor SKUs', () => {
    expect(() => stripeLaborLineItem('claim_setup', {})).toThrow(/STRIPE_PRICE_CLAIM_SETUP/);
    expect(stripeLaborLineItem('managed_edit', {
      STRIPE_PRICE_MANAGED_EDIT: 'price_edit_abc',
    })).toEqual({ price: 'price_edit_abc', quantity: 1 });
    expect(LABOR_SKUS.unique_look.envPriceKey).toBe('STRIPE_PRICE_UNIQUE_LOOK');
    expect(LABOR_SKUS.managed_care.metadataType).toBe('managed_care');
  });

  it('keeps claim_setup and managed_care off the customer extras list', () => {
    expect(CUSTOMER_LABOR_SKUS).not.toContain('claim_setup');
    expect(CUSTOMER_LABOR_SKUS).not.toContain('managed_care');
    expect(normalizeCustomerLaborSku('claim_setup')).toBeNull();
    expect(normalizeCustomerLaborSku('managed_care')).toBeNull();
    expect(normalizeCustomerLaborSku('brand_match')).toBe('brand_match');
    expect(laborCheckoutMode('managed_care')).toBe('subscription');
    expect(laborCheckoutMode('unique_look')).toBe('payment');
    expect(laborIdempotencyKey('user-1', 'brand_match', new Date('2026-08-25T12:00:00Z')))
      .toBe('labor:user-1:brand_match:2026-08-25');
    expect(isCustomerLaborSkuConfigured('brand_match', {})).toBe(false);
    expect(isCustomerLaborSkuConfigured('brand_match', {
      STRIPE_PRICE_BRAND_MATCH: 'price_brand_ok',
    })).toBe(true);
  });

  describe('platformCollectsPayments', () => {
    it('respects explicit env and defaults for runtime', () => {
      expect(platformCollectsPayments({ PLATFORM_COLLECT_PAYMENTS: 'true', NODE_ENV: 'production' })).toBe(true);
      expect(platformCollectsPayments({ PLATFORM_COLLECT_PAYMENTS: 'false', NODE_ENV: 'production' })).toBe(false);
      expect(platformCollectsPayments({ NODE_ENV: 'production' })).toBe(false);
      expect(platformCollectsPayments({ NODE_ENV: 'development' })).toBe(false);
      expect(platformCollectsPayments({ NODE_ENV: 'test' })).toBe(true);
    });

    it('exposes a client-safe billing paused message', () => {
      expect(BILLING_NOT_OPEN_MESSAGE).toMatch(/support@rightsitelight\.com/);
      expect(BILLING_NOT_OPEN_MESSAGE).toMatch(/no-card trial/i);
    });
  });
});
