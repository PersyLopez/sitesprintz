import { describe, it, expect } from 'vitest';
import { 
  getPlanFeatures,
  getPlanInfo,
  hasFeature,
  hasAnyFeature,
  hasAllFeatures,
  getRequiredPlan,
  isPlanHigherThan,
  getUpgradeOptions,
  FEATURES,
  PLAN_FEATURES
} from '../../src/utils/planFeatures';

describe('planFeatures Utility', () => {
  // Get Plan Features (3 tests)
  describe('getPlanFeatures', () => {
    it('should return features for starter plan', () => {
      const features = getPlanFeatures('starter');
      
      expect(features).toBeDefined();
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should return features for pro plan', () => {
      const features = getPlanFeatures('pro');
      
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(getPlanFeatures('starter').length);
    });

    it('should return features for premium plan', () => {
      const features = getPlanFeatures('premium');
      
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(getPlanFeatures('pro').length);
    });
  });

  // Feature Access (4 tests)
  describe('hasFeature', () => {
    it('should allow basic features for starter plan', () => {
      expect(hasFeature('starter', FEATURES.CONTACT_FORMS)).toBe(true);
    });

    it('should deny pro features for starter plan', () => {
      expect(hasFeature('starter', FEATURES.STRIPE_CHECKOUT)).toBe(false);
    });

    it('should allow pro features for pro plan', () => {
      expect(hasFeature('pro', FEATURES.STRIPE_CHECKOUT)).toBe(true);
      expect(hasFeature('pro', FEATURES.SHOPPING_CART)).toBe(true);
    });

    it('should allow all features for premium plan', () => {
      expect(hasFeature('premium', FEATURES.STRIPE_CHECKOUT)).toBe(true);
      expect(hasFeature('premium', FEATURES.CUSTOM_DOMAIN)).toBe(true);
      expect(hasFeature('premium', FEATURES.LIVE_CHAT)).toBe(true);
    });
  });

  // Required Plan (2 tests)
  describe('getRequiredPlan', () => {
    it('should return correct plan for basic feature', () => {
      const plan = getRequiredPlan(FEATURES.CONTACT_FORMS);
      
      expect(['free', 'starter']).toContain(plan);
    });

    it('should return correct plan for premium feature', () => {
      const plan = getRequiredPlan(FEATURES.CUSTOM_DOMAIN);
      
      expect(plan).toBe('premium');
    });
  });

  // Plan Comparison (2 tests)
  describe('isPlanHigherThan', () => {
    it('should return false for lower plans', () => {
      expect(isPlanHigherThan('starter', 'pro')).toBe(false);
      expect(isPlanHigherThan('free', 'starter')).toBe(false);
    });

    it('should return true for higher plans', () => {
      expect(isPlanHigherThan('pro', 'starter')).toBe(true);
      expect(isPlanHigherThan('premium', 'pro')).toBe(true);
    });
  });

  // Upgrade Options (2 tests)
  describe('getUpgradeOptions', () => {
    it('should return upgrade options for starter', () => {
      const options = getUpgradeOptions('starter');
      
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].plan).toBe('pro');
    });

    it('should return empty array for highest tier', () => {
      const options = getUpgradeOptions('premium');
      
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(0);
    });
  });

  // Plan Info (2 tests)
  describe('getPlanInfo', () => {
    it('should return plan metadata', () => {
      const info = getPlanInfo('pro');
      
      expect(info).toBeDefined();
      expect(info.name).toBe('Pro');
      expect(info.price).toBe(25);
    });

    it('should return free plan for invalid input', () => {
      const info = getPlanInfo('invalid');
      
      expect(info).toBeDefined();
      expect(info.name).toBe('Free Trial');
    });
  });
});
