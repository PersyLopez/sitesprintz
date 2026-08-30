/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { validatePlan, sanitizeBusinessData } from '../../server/utils/validators.js';
import { resolveUserPlan, syncedPlanUpdate } from '../../server/utils/resolveUserPlan.js';
import { getPlanLimits, canOccupyPublishedSiteSlot, countPaidSlotsFromSubscriptions } from '../../server/services/subscriptionService.js';

describe('Plan resolution and validation', () => {
  it('accepts growth and normalizes legacy pro', () => {
    expect(validatePlan('growth').value).toBe('growth');
    expect(validatePlan('growth_managed').value).toBe('growth_managed');
    expect(validatePlan('managed').value).toBe('growth_managed');
    expect(validatePlan('pro').value).toBe('growth');
    expect(validatePlan('premium').value).toBe('growth');
    expect(validatePlan('starter').value).toBe('starter');
  });

  it('resolves dual plan fields with legacy aliases', () => {
    expect(resolveUserPlan({ plan: 'growth' })).toBe('growth');
    expect(resolveUserPlan({ subscription_plan: 'pro' })).toBe('growth');
    expect(resolveUserPlan({ plan: 'starter', subscription_plan: null })).toBe('starter');
    expect(resolveUserPlan({ plan: 'starter', subscription_plan: 'growth' })).toBe('growth');
    expect(resolveUserPlan({})).toBe('trial');
  });

  it('keeps plan fields synced on update payload', () => {
    expect(syncedPlanUpdate('pro')).toEqual({
      plan: 'growth',
      subscription_plan: 'growth'
    });
  });

  it('gives every plan custom domain; Growth also gets payments', () => {
    expect(getPlanLimits('trial').customDomain).toBe(true);
    expect(getPlanLimits('starter').customDomain).toBe(true);
    const limits = getPlanLimits('pro');
    expect(limits.customDomain).toBe(true);
    expect(limits.payments).toBe(true);
    expect(limits.booking).toBe(true);
    expect(limits.orderManagement).toBe(true);
  });

  it('covers one live site per plan (trial, starter, growth, growth_managed)', () => {
    expect(getPlanLimits('trial').maxSites).toBe(1);
    expect(getPlanLimits('starter').maxSites).toBe(1);
    expect(getPlanLimits('growth').maxSites).toBe(1);
    expect(getPlanLimits('growth_managed').maxSites).toBe(1);
    expect(getPlanLimits('pro').maxSites).toBe(1);
  });

  it('blocks a second published site on an occupied slot', () => {
    expect(canOccupyPublishedSiteSlot({ publishedCount: 0, maxSites: 1 }).allowed).toBe(true);
    expect(canOccupyPublishedSiteSlot({ publishedCount: 1, maxSites: 1 }).allowed).toBe(false);
    expect(canOccupyPublishedSiteSlot({ publishedCount: 1, maxSites: 1 }).code).toBe('SUBSCRIPTION_REQUIRED');
    expect(canOccupyPublishedSiteSlot({ publishedCount: 5, maxSites: 1, isAdmin: true }).allowed).toBe(true);
  });

  it('counts one paid slot per active Stripe subscription', () => {
    expect(countPaidSlotsFromSubscriptions([], { hasLocalSubscription: true })).toBe(1);
    expect(countPaidSlotsFromSubscriptions([
      { status: 'trialing' },
      { status: 'active' },
    ])).toBe(2);
    expect(countPaidSlotsFromSubscriptions([{ status: 'canceled' }])).toBe(0);
    expect(canOccupyPublishedSiteSlot({ publishedCount: 1, maxSites: 2 }).allowed).toBe(true);
  });

  it('preserves sections through sanitizeBusinessData', () => {
    const sanitized = sanitizeBusinessData({
      businessName: 'Maria Stand',
      sections: [{ type: 'hero', id: '1' }],
      gallery: { images: ['a.jpg'] },
      faq: { items: [{ q: 'Hours?', a: '9-5' }] }
    });
    expect(sanitized.businessName).toBe('Maria Stand');
    expect(sanitized.sections).toHaveLength(1);
    expect(sanitized.gallery.images).toEqual(['a.jpg']);
    expect(sanitized.faq.items).toHaveLength(1);
  });
});
