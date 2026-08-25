import { describe, it, expect } from 'vitest';
import { isTrialingStatus, paidPlanFromQuery, isPaidHostingPlan } from '../../src/config/tiers.js';

describe('isTrialingStatus', () => {
  it('treats local trial and Stripe trialing as in-progress', () => {
    expect(isTrialingStatus('trial')).toBe(true);
    expect(isTrialingStatus('trialing')).toBe(true);
    expect(isTrialingStatus('active')).toBe(false);
    expect(isTrialingStatus(null)).toBe(false);
  });
});

describe('paidPlanFromQuery', () => {
  it('accepts Starter, Growth, and Growth Managed', () => {
    expect(paidPlanFromQuery('starter')).toBe('starter');
    expect(paidPlanFromQuery('growth')).toBe('growth');
    expect(paidPlanFromQuery('growth_managed')).toBe('growth_managed');
    expect(paidPlanFromQuery('managed')).toBe('growth_managed');
  });

  it('rejects trial and unknown values', () => {
    expect(paidPlanFromQuery(null)).toBeNull();
    expect(paidPlanFromQuery('trial')).toBeNull();
    expect(paidPlanFromQuery('garbage')).toBeNull();
    expect(isPaidHostingPlan('growth_managed')).toBe(true);
    expect(isPaidHostingPlan('managed')).toBe(true);
    expect(isPaidHostingPlan('trial')).toBe(false);
  });
});
