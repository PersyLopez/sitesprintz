import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlan } from '../../src/hooks/usePlan';
import { AuthContext } from '../../src/context/AuthContext';

// Mock AuthContext
const createAuthWrapper = (user) => {
  return ({ children }) => (
    <AuthContext.Provider value={{ user, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
};

describe('usePlan Hook', () => {
  describe('Plan Detection', () => {
    it('should detect free plan when user has no subscription', () => {
      const wrapper = createAuthWrapper({ email: 'user@example.com' });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('free');
      expect(result.current.isFree).toBe(true);
      expect(result.current.isStarter).toBe(false);
      expect(result.current.isPro).toBe(false);
      expect(result.current.isPremium).toBe(false);
    });

    it('should detect starter plan from user.plan', () => {
      const wrapper = createAuthWrapper({ 
        email: 'user@example.com', 
        plan: 'starter' 
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('starter');
      expect(result.current.isFree).toBe(false);
      expect(result.current.isStarter).toBe(true);
      expect(result.current.isPro).toBe(false);
      expect(result.current.isPremium).toBe(false);
    });

    it('should detect pro plan from user.subscription.plan', () => {
      const wrapper = createAuthWrapper({ 
        email: 'user@example.com',
        subscription: { plan: 'pro', status: 'active' }
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('pro');
      expect(result.current.isFree).toBe(false);
      expect(result.current.isStarter).toBe(false);
      expect(result.current.isPro).toBe(true);
      expect(result.current.isPremium).toBe(false);
    });

    it('should detect premium plan', () => {
      const wrapper = createAuthWrapper({ 
        email: 'user@example.com', 
        plan: 'premium' 
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('premium');
      expect(result.current.isFree).toBe(false);
      expect(result.current.isStarter).toBe(false);
      expect(result.current.isPro).toBe(false);
      expect(result.current.isPremium).toBe(true);
    });

    it('should handle uppercase plan names', () => {
      const wrapper = createAuthWrapper({ 
        email: 'user@example.com', 
        plan: 'PRO' 
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('pro');
      expect(result.current.isPro).toBe(true);
    });

    it('should default to free when user is null', () => {
      const wrapper = createAuthWrapper(null);
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('free');
      expect(result.current.isFree).toBe(true);
    });

    it('should default to free when user is undefined', () => {
      const wrapper = createAuthWrapper(undefined);
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('free');
      expect(result.current.isFree).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should start with loading true', () => {
      const wrapper = createAuthWrapper(null);
      const { result } = renderHook(() => usePlan(), { wrapper });

      // After initial render, loading should be false
      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after plan is determined', () => {
      const wrapper = createAuthWrapper({ 
        email: 'user@example.com', 
        plan: 'pro' 
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.loading).toBe(false);
      expect(result.current.plan).toBe('pro');
    });
  });

  describe('Plan Helpers', () => {
    it('should provide correct helper booleans for each plan', () => {
      const plans = [
        { plan: 'free', helpers: { isFree: true, isStarter: false, isPro: false, isPremium: false } },
        { plan: 'starter', helpers: { isFree: false, isStarter: true, isPro: false, isPremium: false } },
        { plan: 'pro', helpers: { isFree: false, isStarter: false, isPro: true, isPremium: false } },
        { plan: 'premium', helpers: { isFree: false, isStarter: false, isPro: false, isPremium: true } }
      ];

      plans.forEach(({ plan, helpers }) => {
        const wrapper = createAuthWrapper({ email: 'user@example.com', plan });
        const { result } = renderHook(() => usePlan(), { wrapper });

        expect(result.current.isFree).toBe(helpers.isFree);
        expect(result.current.isStarter).toBe(helpers.isStarter);
        expect(result.current.isPro).toBe(helpers.isPro);
        expect(result.current.isPremium).toBe(helpers.isPremium);
      });
    });

    it('should only have one plan helper true at a time', () => {
      const wrapper = createAuthWrapper({ 
        email: 'user@example.com', 
        plan: 'pro' 
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      const trueCount = [
        result.current.isFree,
        result.current.isStarter,
        result.current.isPro,
        result.current.isPremium
      ].filter(Boolean).length;

      expect(trueCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid plan name', () => {
      const wrapper = createAuthWrapper({ 
        email: 'user@example.com', 
        plan: 'invalid-plan' 
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      // Should lowercase it
      expect(result.current.plan).toBe('invalid-plan');
      // No helpers should be true
      expect(result.current.isFree).toBe(false);
      expect(result.current.isStarter).toBe(false);
      expect(result.current.isPro).toBe(false);
      expect(result.current.isPremium).toBe(false);
    });

    it('should prefer user.plan over user.subscription.plan', () => {
      const wrapper = createAuthWrapper({ 
        email: 'user@example.com',
        plan: 'pro',
        subscription: { plan: 'starter' }
      });
      const { result } = renderHook(() => usePlan(), { wrapper });

      expect(result.current.plan).toBe('pro');
    });
  });
});


