import { useAuth } from './useAuth';

/**
 * Hook to access user's plan information
 * @returns {Object} Plan information and helper booleans
 */
export function usePlan() {
  const { user } = useAuth();
  
  // Determine plan from user.plan or user.subscription.plan
  const plan = user?.subscription?.plan || user?.plan || 'free';
  
  return {
    plan,
    isFree: plan === 'free',
    isStarter: plan === 'starter',
    isPro: plan === 'pro',
    isPremium: plan === 'premium' || plan === 'pro',
    isEnterprise: plan === 'enterprise',
    
    // Plan features
    features: {
      customDomain: plan !== 'free',
      analytics: plan === 'pro' || plan === 'enterprise',
      support: plan === 'free' ? 'community' : plan === 'pro' ? 'email' : 'priority',
      maxSites: plan === 'free' ? 1 : plan === 'pro' ? 10 : -1,
    },
    
    // Subscription status
    subscriptionStatus: user?.subscription?.status || null,
    isActive: user?.subscription?.status === 'active',
  };
}

export default usePlan;

