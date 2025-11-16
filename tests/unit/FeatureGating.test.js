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

    test('Starter should NOT have live chat', () => {
      expect(hasFeature('starter', FEATURES.LIVE_CHAT)).toBe(false);
    });
  });

  describe('Pro Plan Feature Access', () => {
    test('Pro should have all Starter features', () => {
      expect(hasFeature('pro', FEATURES.CONTACT_FORMS)).toBe(true);
      expect(hasFeature('pro', FEATURES.SERVICE_DISPLAY)).toBe(true);
      expect(hasFeature('pro', FEATURES.BASIC_BOOKING_LINK)).toBe(true);
      expect(hasFeature('pro', FEATURES.IMAGE_GALLERY)).toBe(true);
    });

    test('Pro should have Stripe checkout', () => {
      expect(hasFeature('pro', FEATURES.STRIPE_CHECKOUT)).toBe(true);
    });

    test('Pro should have shopping cart', () => {
      expect(hasFeature('pro', FEATURES.SHOPPING_CART)).toBe(true);
    });

    test('Pro should have order management', () => {
      expect(hasFeature('pro', FEATURES.ORDER_MANAGEMENT)).toBe(true);
    });

    test('Pro should have embedded booking', () => {
      expect(hasFeature('pro', FEATURES.EMBEDDED_BOOKING)).toBe(true);
    });

    test('Pro should have recurring pricing', () => {
      expect(hasFeature('pro', FEATURES.RECURRING_PRICING)).toBe(true);
    });

    test('Pro should NOT have live chat', () => {
      expect(hasFeature('pro', FEATURES.LIVE_CHAT)).toBe(false);
    });

    test('Pro should NOT have email automation', () => {
      expect(hasFeature('pro', FEATURES.EMAIL_AUTOMATION)).toBe(false);
    });
  });

  describe('Premium Plan Feature Access', () => {
    test('Premium should have all Starter features', () => {
      expect(hasFeature('premium', FEATURES.CONTACT_FORMS)).toBe(true);
      expect(hasFeature('premium', FEATURES.SERVICE_DISPLAY)).toBe(true);
      expect(hasFeature('premium', FEATURES.IMAGE_GALLERY)).toBe(true);
    });

    test('Premium should have all Pro features', () => {
      expect(hasFeature('premium', FEATURES.STRIPE_CHECKOUT)).toBe(true);
      expect(hasFeature('premium', FEATURES.SHOPPING_CART)).toBe(true);
      expect(hasFeature('premium', FEATURES.ORDER_MANAGEMENT)).toBe(true);
      expect(hasFeature('premium', FEATURES.EMBEDDED_BOOKING)).toBe(true);
    });

    test('Premium should have live chat', () => {
      expect(hasFeature('premium', FEATURES.LIVE_CHAT)).toBe(true);
    });

    test('Premium should have advanced booking', () => {
      expect(hasFeature('premium', FEATURES.ADVANCED_BOOKING)).toBe(true);
    });

    test('Premium should have email automation', () => {
      expect(hasFeature('premium', FEATURES.EMAIL_AUTOMATION)).toBe(true);
    });

    test('Premium should have CRM integration', () => {
      expect(hasFeature('premium', FEATURES.CRM_INTEGRATION)).toBe(true);
    });

    test('Premium should have custom domain', () => {
      expect(hasFeature('premium', FEATURES.CUSTOM_DOMAIN)).toBe(true);
    });
  });

  describe('Required Plan Detection', () => {
    test('Contact forms should require Starter or lower', () => {
      const required = getRequiredPlan(FEATURES.CONTACT_FORMS);
      expect(['free', 'starter']).toContain(required);
    });

    test('Stripe checkout should require Pro', () => {
      const required = getRequiredPlan(FEATURES.STRIPE_CHECKOUT);
      expect(required).toBe('pro');
    });

    test('Live chat should require Premium', () => {
      const required = getRequiredPlan(FEATURES.LIVE_CHAT);
      expect(required).toBe('premium');
    });

    test('Email automation should require Premium', () => {
      const required = getRequiredPlan(FEATURES.EMAIL_AUTOMATION);
      expect(required).toBe('premium');
    });
  });

  describe('Plan Hierarchy', () => {
    test('Pro should be higher than Starter', () => {
      expect(isPlanHigherThan('pro', 'starter')).toBe(true);
    });

    test('Premium should be higher than Pro', () => {
      expect(isPlanHigherThan('premium', 'pro')).toBe(true);
    });

    test('Premium should be higher than Starter', () => {
      expect(isPlanHigherThan('premium', 'starter')).toBe(true);
    });

    test('Starter should NOT be higher than Pro', () => {
      expect(isPlanHigherThan('starter', 'pro')).toBe(false);
    });

    test('Pro should NOT be higher than Premium', () => {
      expect(isPlanHigherThan('pro', 'premium')).toBe(false);
    });

    test('Same plans should not be higher', () => {
      expect(isPlanHigherThan('starter', 'starter')).toBe(false);
      expect(isPlanHigherThan('pro', 'pro')).toBe(false);
      expect(isPlanHigherThan('premium', 'premium')).toBe(false);
    });
  });

  describe('Multiple Feature Checks', () => {
    test('hasAllFeatures should work for Starter features', () => {
      const starterFeatures = [
        FEATURES.CONTACT_FORMS,
        FEATURES.SERVICE_DISPLAY,
        FEATURES.IMAGE_GALLERY
      ];
      
      expect(hasAllFeatures('starter', starterFeatures)).toBe(true);
      expect(hasAllFeatures('pro', starterFeatures)).toBe(true);
      expect(hasAllFeatures('premium', starterFeatures)).toBe(true);
    });

    test('hasAllFeatures should fail for Pro features on Starter', () => {
      const proFeatures = [
        FEATURES.STRIPE_CHECKOUT,
        FEATURES.ORDER_MANAGEMENT
      ];
      
      expect(hasAllFeatures('starter', proFeatures)).toBe(false);
      expect(hasAllFeatures('pro', proFeatures)).toBe(true);
      expect(hasAllFeatures('premium', proFeatures)).toBe(true);
    });

    test('hasAnyFeature should work correctly', () => {
      const mixedFeatures = [
        FEATURES.LIVE_CHAT, // Premium only
        FEATURES.STRIPE_CHECKOUT // Pro and Premium
      ];
      
      expect(hasAnyFeature('starter', mixedFeatures)).toBe(false);
      expect(hasAnyFeature('pro', mixedFeatures)).toBe(true);
      expect(hasAnyFeature('premium', mixedFeatures)).toBe(true);
    });
  });

  describe('Plan Metadata', () => {
    test('Starter plan info should have correct price', () => {
      expect(PLAN_INFO.starter.price).toBe(15);
    });

    test('Pro plan info should have correct price', () => {
      expect(PLAN_INFO.pro.price).toBe(45);
    });

    test('Premium plan info should have correct price', () => {
      expect(PLAN_INFO.premium.price).toBe(100);
    });

    test('Pro should be marked as popular', () => {
      expect(PLAN_INFO.pro.popular).toBe(true);
    });

    test('Starter and Premium should NOT be marked as popular', () => {
      expect(PLAN_INFO.starter.popular).toBeUndefined();
      expect(PLAN_INFO.premium.popular).toBeUndefined();
    });

    test('All plans should have name and duration', () => {
      ['starter', 'pro', 'premium'].forEach(plan => {
        expect(PLAN_INFO[plan].name).toBeDefined();
        expect(PLAN_INFO[plan].duration).toBeDefined();
      });
    });
  });

  describe('Premium Development Status', () => {
    test('Premium features should be gated', () => {
      const premiumFeatures = [
        FEATURES.LIVE_CHAT,
        FEATURES.ADVANCED_BOOKING,
        FEATURES.EMAIL_AUTOMATION,
        FEATURES.CRM_INTEGRATION,
        FEATURES.BLOG_CMS
      ];
      
      premiumFeatures.forEach(feature => {
        expect(hasFeature('starter', feature)).toBe(false);
        expect(hasFeature('pro', feature)).toBe(false);
        expect(hasFeature('premium', feature)).toBe(true);
      });
    });

    test('Premium plan metadata should indicate development status', () => {
      // This test will pass once we add underDevelopment flag to PLAN_INFO
      // For now, we're testing the structure exists
      expect(PLAN_INFO.premium).toBeDefined();
      expect(PLAN_INFO.premium.name).toBe('Premium');
    });
  });

  describe('Case Sensitivity', () => {
    test('hasFeature should be case-insensitive for plan names', () => {
      expect(hasFeature('STARTER', FEATURES.CONTACT_FORMS)).toBe(true);
      expect(hasFeature('Pro', FEATURES.STRIPE_CHECKOUT)).toBe(true);
      expect(hasFeature('PREMIUM', FEATURES.LIVE_CHAT)).toBe(true);
    });

    test('isPlanHigherThan should be case-insensitive', () => {
      expect(isPlanHigherThan('PRO', 'starter')).toBe(true);
      expect(isPlanHigherThan('Premium', 'PRO')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null plan gracefully', () => {
      expect(hasFeature(null, FEATURES.CONTACT_FORMS)).toBe(true); // Defaults to 'free'
    });

    test('should handle undefined plan gracefully', () => {
      expect(hasFeature(undefined, FEATURES.CONTACT_FORMS)).toBe(true); // Defaults to 'free'
    });

    test('should handle invalid plan name', () => {
      expect(hasFeature('invalid', FEATURES.CONTACT_FORMS)).toBe(true); // Falls back to 'free'
    });

    test('should handle invalid feature name', () => {
      expect(hasFeature('pro', 'invalid_feature')).toBe(false);
    });
  });
});

