/**
 * @vitest-environment node
 */

import { describe, test, expect } from 'vitest';
import {
  hasFeature,
  hasAllFeatures,
  hasAnyFeature,
  getRequiredPlan,
  isPlanHigherThan,
  FEATURES,
  PLAN_INFO
} from '../../src/utils/planFeatures.js';

describe('Feature Access Gating', () => {
  describe('Starter Plan Feature Access', () => {
    test('Starter should have contact forms', () => {
      expect(hasFeature('starter', FEATURES.CONTACT_FORMS)).toBe(true);
    });

    test('Starter should have service display', () => {
      expect(hasFeature('starter', FEATURES.SERVICE_DISPLAY)).toBe(true);
    });

    test('Starter should have basic booking link', () => {
      expect(hasFeature('starter', FEATURES.BASIC_BOOKING_LINK)).toBe(true);
    });

    test('Starter should NOT have Stripe checkout', () => {
      expect(hasFeature('starter', FEATURES.STRIPE_CHECKOUT)).toBe(false);
    });

    test('Starter should NOT have shopping cart', () => {
      expect(hasFeature('starter', FEATURES.SHOPPING_CART)).toBe(false);
    });

    test('Starter should NOT have order management', () => {
      expect(hasFeature('starter', FEATURES.ORDER_MANAGEMENT)).toBe(false);
    });

    test('Starter should have custom domain', () => {
      expect(hasFeature('starter', FEATURES.CUSTOM_DOMAIN)).toBe(true);
      expect(hasFeature('trial', FEATURES.CUSTOM_DOMAIN)).toBe(true);
    });
  });

  describe('Growth Plan Feature Access', () => {
    test('Growth should have all Starter features', () => {
      expect(hasFeature('growth', FEATURES.CONTACT_FORMS)).toBe(true);
      expect(hasFeature('growth', FEATURES.SERVICE_DISPLAY)).toBe(true);
      expect(hasFeature('growth', FEATURES.BASIC_BOOKING_LINK)).toBe(true);
      expect(hasFeature('growth', FEATURES.IMAGE_GALLERY)).toBe(true);
    });

    test('Growth should have Stripe checkout and cart', () => {
      expect(hasFeature('growth', FEATURES.STRIPE_CHECKOUT)).toBe(true);
      expect(hasFeature('growth', FEATURES.SHOPPING_CART)).toBe(true);
    });

    test('Growth should have booking and orders', () => {
      expect(hasFeature('growth', FEATURES.ORDER_MANAGEMENT)).toBe(true);
      expect(hasFeature('growth', FEATURES.EMBEDDED_BOOKING)).toBe(true);
    });

    test('Growth should have custom domain but keep SiteSprintz branding', () => {
      expect(hasFeature('growth', FEATURES.CUSTOM_DOMAIN)).toBe(true);
      expect(hasFeature('growth', FEATURES.REMOVE_BRANDING)).toBe(false);
    });

    test('Legacy pro maps to Growth features', () => {
      expect(hasFeature('pro', FEATURES.STRIPE_CHECKOUT)).toBe(true);
      expect(hasFeature('pro', FEATURES.CUSTOM_DOMAIN)).toBe(true);
    });
  });

  describe('Required Plan', () => {
    test('Contact forms should require trial or starter', () => {
      expect(['trial', 'starter']).toContain(getRequiredPlan(FEATURES.CONTACT_FORMS));
    });

    test('Stripe checkout should require Growth', () => {
      expect(getRequiredPlan(FEATURES.STRIPE_CHECKOUT)).toBe('growth');
    });

    test('Custom domain is available on every plan', () => {
      expect(getRequiredPlan(FEATURES.CUSTOM_DOMAIN)).toBe('trial');
    });
  });

  describe('Plan Hierarchy', () => {
    test('Growth should be higher than Starter', () => {
      expect(isPlanHigherThan('growth', 'starter')).toBe(true);
      expect(isPlanHigherThan('starter', 'growth')).toBe(false);
    });

    test('Legacy pro compares as Growth', () => {
      expect(isPlanHigherThan('pro', 'starter')).toBe(true);
      expect(isPlanHigherThan('pro', 'growth')).toBe(false);
    });
  });

  describe('Helpers', () => {
    test('hasAllFeatures should work for Starter features', () => {
      expect(hasAllFeatures('starter', [FEATURES.CONTACT_FORMS, FEATURES.SERVICE_DISPLAY])).toBe(true);
    });

    test('hasAllFeatures should fail for Growth features on Starter', () => {
      expect(hasAllFeatures('starter', [FEATURES.CONTACT_FORMS, FEATURES.STRIPE_CHECKOUT])).toBe(false);
    });

    test('hasAnyFeature should work correctly', () => {
      expect(hasAnyFeature('starter', [FEATURES.STRIPE_CHECKOUT, FEATURES.CONTACT_FORMS])).toBe(true);
    });
  });

  describe('Plan Info', () => {
    test('Starter plan info should have correct price', () => {
      expect(PLAN_INFO.starter.price).toBe(10);
    });

    test('Growth plan info should have correct price and be popular', () => {
      expect(PLAN_INFO.growth.price).toBe(35);
      expect(PLAN_INFO.growth.popular).toBe(true);
    });

    test('Pro is no longer a sold plan', () => {
      expect(PLAN_INFO.pro).toBeUndefined();
    });
  });
});
