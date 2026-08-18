import { describe, it, expect } from 'vitest';
import {
  getPlanFeatures,
  getPlanInfo,
  hasFeature,
  getRequiredPlan,
  isPlanHigherThan,
  getUpgradeOptions,
  FEATURES
} from '../../src/utils/planFeatures';

describe('planFeatures Utility', () => {
  describe('getPlanFeatures', () => {
    it('should return features for starter plan', () => {
      const features = getPlanFeatures('starter');
      expect(features).toBeDefined();
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should return features for growth plan', () => {
      const features = getPlanFeatures('growth');
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(getPlanFeatures('starter').length);
    });

    it('should map legacy pro/premium to growth features', () => {
      expect(getPlanFeatures('pro')).toEqual(getPlanFeatures('growth'));
      expect(getPlanFeatures('premium')).toEqual(getPlanFeatures('growth'));
    });
  });

  describe('hasFeature', () => {
    it('should allow basic features for starter plan', () => {
      expect(hasFeature('starter', FEATURES.CONTACT_FORMS)).toBe(true);
    });

    it('should deny growth features for starter plan', () => {
      expect(hasFeature('starter', FEATURES.STRIPE_CHECKOUT)).toBe(false);
      expect(hasFeature('starter', FEATURES.CUSTOM_DOMAIN)).toBe(false);
    });

    it('should allow commerce and domain features for growth', () => {
      expect(hasFeature('growth', FEATURES.STRIPE_CHECKOUT)).toBe(true);
      expect(hasFeature('growth', FEATURES.SHOPPING_CART)).toBe(true);
      expect(hasFeature('growth', FEATURES.CUSTOM_DOMAIN)).toBe(true);
      expect(hasFeature('growth', FEATURES.REMOVE_BRANDING)).toBe(false);
    });

    it('should treat legacy pro as growth', () => {
      expect(hasFeature('pro', FEATURES.STRIPE_CHECKOUT)).toBe(true);
      expect(hasFeature('pro', FEATURES.CUSTOM_DOMAIN)).toBe(true);
    });
  });

  describe('getRequiredPlan', () => {
    it('should return trial or starter for basic features', () => {
      const plan = getRequiredPlan(FEATURES.CONTACT_FORMS);
      expect(['trial', 'starter']).toContain(plan);
    });

    it('should return growth for checkout and domain', () => {
      expect(getRequiredPlan(FEATURES.STRIPE_CHECKOUT)).toBe('growth');
      expect(getRequiredPlan(FEATURES.CUSTOM_DOMAIN)).toBe('growth');
    });
  });

  describe('isPlanHigherThan', () => {
    it('should compare starter and growth', () => {
      expect(isPlanHigherThan('starter', 'growth')).toBe(false);
      expect(isPlanHigherThan('growth', 'starter')).toBe(true);
    });

    it('should treat pro as growth level', () => {
      expect(isPlanHigherThan('pro', 'starter')).toBe(true);
      expect(isPlanHigherThan('pro', 'growth')).toBe(false);
    });
  });

  describe('getUpgradeOptions', () => {
    it('should return growth as upgrade from starter', () => {
      const options = getUpgradeOptions('starter');
      expect(options).toHaveLength(1);
      expect(options[0].plan).toBe('growth');
    });

    it('should return empty array for growth (highest paid tier)', () => {
      expect(getUpgradeOptions('growth')).toEqual([]);
      expect(getUpgradeOptions('pro')).toEqual([]);
    });
  });

  describe('getPlanInfo', () => {
    it('should return growth metadata for growth and legacy pro', () => {
      const growth = getPlanInfo('growth');
      expect(growth.name).toBe('Growth');
      expect(growth.price).toBe(35);
      expect(getPlanInfo('pro').name).toBe('Growth');
    });

    it('should return trial plan for invalid input', () => {
      const info = getPlanInfo('invalid');
      expect(info.name).toBe('Free Trial');
    });
  });
});
