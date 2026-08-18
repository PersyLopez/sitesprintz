/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { validatePlan, sanitizeBusinessData } from '../../server/utils/validators.js';
import { resolveUserPlan, syncedPlanUpdate } from '../../server/utils/resolveUserPlan.js';
import { getPlanLimits } from '../../server/services/subscriptionService.js';

describe('Plan resolution and validation', () => {
  it('accepts growth and normalizes legacy pro', () => {
    expect(validatePlan('growth').value).toBe('growth');
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
