import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function usePlan() {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Get user's plan from user object or API
      const plan = user.plan || user.subscription?.plan || 'free';
      setUserPlan(plan.toLowerCase());
    } else {
      setUserPlan('free');
    }
    setLoading(false);
  }, [user]);

  return {
    plan: userPlan,
    loading,
    isFree: userPlan === 'free',
    isStarter: userPlan === 'starter',
    isPro: userPlan === 'pro',
    isPremium: userPlan === 'premium'
  };
}

