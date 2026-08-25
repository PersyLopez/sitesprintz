import { useAuth } from './useAuth';
import { normalizeTier, hasTierAccess, TIERS, TIER_HIERARCHY } from '../config/tiers.js';

/**
 * Hook to access user's plan information
 * Official tiers: trial, starter, growth, growth_managed (legacy pro/premium → growth)
 */
export function usePlan() {
  const { user } = useAuth();

  const rawPlan =
    user?.subscriptionPlan ||
    user?.subscription_plan ||
    user?.subscription?.plan ||
    user?.plan ||
    'trial';
  const plan = normalizeTier(rawPlan);

  return {
    plan,

    isTrial: plan === TIERS.TRIAL,
    isFree: plan === TIERS.TRIAL,
    isStarter: plan === TIERS.STARTER,
    isGrowth: hasTierAccess(plan, TIERS.GROWTH),
    isGrowthManaged: plan === TIERS.GROWTH_MANAGED,
    // Legacy aliases — Pro folded into Growth software
    isPro: hasTierAccess(plan, TIERS.GROWTH),
    isPremium: hasTierAccess(plan, TIERS.GROWTH),
    isEnterprise: hasTierAccess(plan, TIERS.GROWTH),

    isAbove: (tier) => hasTierAccess(plan, tier),
    isBelow: (tier) => {
      const planIndex = TIER_HIERARCHY.indexOf(plan);
      const tierIndex = TIER_HIERARCHY.indexOf(normalizeTier(tier));
      return tierIndex >= 0 && planIndex < tierIndex;
    },

    features: {
      customDomain: true,
      analytics: hasTierAccess(plan, TIERS.GROWTH),
      support: plan === TIERS.TRIAL ? 'community' : 'email',
      maxSites: plan === TIERS.TRIAL || plan === TIERS.STARTER ? 1 : 5,
      orderManagement: hasTierAccess(plan, TIERS.GROWTH),
      payments: hasTierAccess(plan, TIERS.GROWTH),
      booking: hasTierAccess(plan, TIERS.GROWTH),
      nativeBooking: hasTierAccess(plan, TIERS.GROWTH),
      premiumModules: hasTierAccess(plan, TIERS.GROWTH),
      removeBranding: false,
    },

    subscriptionStatus: user?.subscription?.status || null,
    isActive: user?.subscription?.status === 'active',
  };
}

export default usePlan;
