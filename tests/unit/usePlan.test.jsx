import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlan } from '../../src/hooks/usePlan';
import { AuthContext } from '../../src/context/AuthContext';

const createAuthWrapper = (user) => {
  return ({ children }) => (
    <AuthContext.Provider value={{ user, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
};

describe('usePlan Hook', () => {
  describe('Plan Detection', () => {
    it('should detect trial when user has no subscription', () => {
      const wrapper = createAuthWrapper({ email: 'user@example.com' });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('trial');
      expect(result.current.isFree).toBe(true);
      expect(result.current.isTrial).toBe(true);
      expect(result.current.isStarter).toBe(false);
      expect(result.current.isGrowth).toBe(false);
    });

    it('should detect starter plan from user.plan', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        plan: 'starter'
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('starter');
      expect(result.current.isStarter).toBe(true);
      expect(result.current.isGrowth).toBe(false);
    });

    it('should map legacy pro subscription to growth', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        subscription: { plan: 'pro', status: 'active' }
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('growth');
      expect(result.current.isGrowth).toBe(true);
      expect(result.current.isPro).toBe(true); // legacy alias
    });

    it('should map premium to growth', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        plan: 'premium'
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('growth');
      expect(result.current.isGrowth).toBe(true);
    });

    it('should handle uppercase plan names', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        plan: 'GROWTH'
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('growth');
      expect(result.current.isGrowth).toBe(true);
    });

    it('should default to trial when user is null', () => {
      const wrapper = createAuthWrapper(null);
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('trial');
      expect(result.current.isFree).toBe(true);
    });
  });

  describe('Plan Helpers', () => {
    it('should provide correct helper booleans for each plan', () => {
      const cases = [
        { plan: 'trial', isTrial: true, isStarter: false, isGrowth: false },
        { plan: 'starter', isTrial: false, isStarter: true, isGrowth: false },
        { plan: 'growth', isTrial: false, isStarter: false, isGrowth: true }
      ];

      cases.forEach(({ plan, isTrial, isStarter, isGrowth }) => {
        const wrapper = createAuthWrapper({ email: 'user@example.com', plan });
        const { result } = renderHook(() => usePlan(), { wrapper });

        expect(result.current.isTrial).toBe(isTrial);
        expect(result.current.isStarter).toBe(isStarter);
        expect(result.current.isGrowth).toBe(isGrowth);
      });
    });

    it('should only have one canonical plan helper true at a time', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        plan: 'growth'
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      const trueCount = [
        result.current.isTrial,
        result.current.isStarter,
        result.current.isGrowth
      ].filter(Boolean).length;

      expect(trueCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should prefer subscriptionPlan from auth payload', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        plan: 'starter',
        subscriptionPlan: 'growth'
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('growth');
    });

    it('should prefer subscription.plan over user.plan', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        plan: 'starter',
        subscription: { plan: 'growth' }
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('growth');
    });

    it('should expose Growth payments and domain features', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        plan: 'growth'
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.features.payments).toBe(true);
      expect(result.current.features.customDomain).toBe(true);
      expect(result.current.features.removeBranding).toBe(false);
    });

    it('should expose custom domain on Starter', () => {
      const wrapper = createAuthWrapper({
        email: 'user@example.com',
        plan: 'starter'
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.features.customDomain).toBe(true);
      expect(result.current.features.payments).toBe(false);
    });
  });
});
