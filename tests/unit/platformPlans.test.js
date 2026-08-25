import { describe, it, expect } from 'vitest';
import {
  STRIPE_TRIAL_DAYS,
  CLAIM_PLAN,
  PLATFORM_PLAN_DETAILS,
  LABOR_SKUS,
  CUSTOMER_LABOR_SKUS,
  normalizePaidPlan,
  normalizeCustomerLaborSku,
  laborCheckoutMode,
  laborIdempotencyKey,
  isCustomerLaborSkuConfigured,
  stripeSubscriptionLineItem,
  stripeLaborLineItem,
} from '../../server/config/platformPlans.js';

describe('platformPlans', () => {
  it('keeps monthly amounts at $10 and $35', () => {
    expect(STRIPE_TRIAL_DAYS).toBe(7);
    expect(CLAIM_PLAN).toBe('growth');
    expect(PLATFORM_PLAN_DETAILS.starter.amount).toBe(1000);
    expect(PLATFORM_PLAN_DETAILS.growth.amount).toBe(3500);
  });

  it('normalizes legacy paid plans', () => {
    expect(normalizePaidPlan('pro')).toBe('growth');
    expect(normalizePaidPlan('premium')).toBe('growth');
    expect(normalizePaidPlan('starter')).toBe('starter');
    expect(normalizePaidPlan('invalid')).toBeNull();
  });

  it('uses inline price_data when Price IDs are unset', () => {
    const item = stripeSubscriptionLineItem('growth', {});
    expect(item.price_data.unit_amount).toBe(3500);
    expect(item.price_data.product_data.description).toMatch(/hosting/i);
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

  it('keeps claim_setup off the customer extras list', () => {
    expect(CUSTOMER_LABOR_SKUS).not.toContain('claim_setup');
    expect(normalizeCustomerLaborSku('claim_setup')).toBeNull();
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
});
