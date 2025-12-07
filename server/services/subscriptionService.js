/**
 * Subscription Service
 * Handles subscription status management with caching and conflict resolution
 * 
 * Following TDD - implementation created to pass the comprehensive test suite
 */

import { prisma } from '../../database/db.js';
import { SimpleCache } from '../utils/cache.js';

// Plan feature limits (imported from existing subscriptionVerification.js)
export const PLAN_LIMITS = {
  free: {
    templates: ['starter-1', 'starter-2', 'starter-3'],
    maxSites: 1,
    customDomain: false,
    analytics: false,
    support: 'community',
    stripeFee: 0.05
  },
  pro: {
    templates: ['*'], // All templates
    maxSites: 10,
    customDomain: true,
    analytics: true,
    support: 'email',
    stripeFee: 0
  },
  enterprise: {
    templates: ['*'],
    maxSites: -1, // Unlimited
    customDomain: true,
    analytics: true,
    support: 'priority',
    stripeFee: 0
  }
};

export class SubscriptionService {
  constructor(db = null, stripe = null, cache = null) {
    this.db = db || prisma;
    this.stripe = stripe;
    this.cache = cache || new SimpleCache();
    this.cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10); // 5 minutes default
  }

  /**
   * Get subscription status for a user with caching and conflict resolution
   * @param {string} userId - User ID
   * @returns {Promise<{plan: string, status: string, currentPeriodEnd: Date|null, source: string}>}
   */
  async getSubscriptionStatus(userId) {
    try {
      // Check cache first
      const cacheKey = `subscription:${userId}`;
      const cached = this.cache.get(cacheKey);

      if (cached) {
        return { ...cached, source: 'cache' };
      }

      // Query database
      const user = await this.db.users.findUnique({
        where: { id: userId },
        select: {
          plan: true,
          subscription_status: true,
          stripe_subscription_id: true,
          stripe_customer_id: true,
          current_period_end: true
        }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      let subscriptionData = {
        plan: user.plan || 'free',
        status: user.subscription_status || 'inactive',
        currentPeriodEnd: user.current_period_end ? new Date(user.current_period_end) : null,
        source: 'database'
      };

      // If user has Stripe subscription, verify with Stripe
      if (user.stripe_subscription_id && this.stripe) {
        try {
          const stripeSubscription = await this.stripe.subscriptions.retrieve(
            user.stripe_subscription_id
          );

          const stripeStatus = stripeSubscription.status;
          const stripePeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

          // Detect conflict
          if (stripeStatus !== user.subscription_status) {
            console.log(`Subscription conflict detected for user ${userId}: DB=${user.subscription_status}, Stripe=${stripeStatus}`);

            // Update database to match Stripe
            await this.db.users.update({
              where: { id: userId },
              data: {
                subscription_status: stripeStatus,
                current_period_end: stripePeriodEnd,
                updated_at: new Date()
              }
            });
          }

          // Use Stripe data
          subscriptionData = {
            plan: user.plan || 'free',
            status: stripeStatus,
            currentPeriodEnd: stripePeriodEnd,
            source: 'stripe'
          };
        } catch (stripeError) {
          console.error('Stripe API error, using database fallback:', stripeError.message);
          subscriptionData.source = 'database_fallback';
        }
      }

      // Cache the result
      this.cache.set(cacheKey, subscriptionData, this.cacheTTL);

      return subscriptionData;
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  }

  /**
   * Check if user can access a specific template
   * @param {string} userId - User ID
   * @param {string} templateId - Template ID
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async canAccessTemplate(userId, templateId) {
    try {
      // Validate template ID format (prevent path traversal)
      if (!templateId || !/^[a-z0-9-]+$/i.test(templateId)) {
        return {
          allowed: false,
          reason: 'Invalid template ID format'
        };
      }

      const subscription = await this.getSubscriptionStatus(userId);

      // Check if subscription is active or trialing
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        return {
          allowed: false,
          reason: 'Subscription not active'
        };
      }

      const plan = subscription.plan || 'free';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

      // Check template access
      if (limits.templates.includes('*')) {
        return { allowed: true };
      }

      // Check if template is in allowed list
      if (limits.templates.includes(templateId)) {
        return { allowed: true };
      }

      // Check if it's a starter template (legacy support)
      if (templateId.startsWith('starter-')) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `Template ${templateId} requires Pro or Enterprise plan`
      };
    } catch (error) {
      console.error('Error checking template access:', error);
      throw error;
    }
  }

  /**
   * Check if user can create another site
   * @param {string} userId - User ID
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async canCreateSite(userId) {
    try {
      const subscription = await this.getSubscriptionStatus(userId);
      const plan = subscription.plan || 'free';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

      // Unlimited sites for enterprise
      if (limits.maxSites === -1) {
        return { allowed: true };
      }

      // Count existing sites (excluding deleted)
      const siteCount = await this.db.sites.count({
        where: {
          user_id: userId,
          status: { not: 'deleted' }
        }
      });

      if (siteCount < limits.maxSites) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `You have reached your site limit of ${limits.maxSites} for the ${plan} plan.`
      };
    } catch (error) {
      console.error('Error checking site creation permission:', error);
      throw error;
    }
  }

  /**
   * Update subscription status in database and invalidate cache
   * @param {string} userId - User ID
   * @param {string} status - New status
   */
  async updateSubscriptionStatus(userId, status) {
    try {
      await this.db.users.update({
        where: { id: userId },
        data: {
          subscription_status: status,
          updated_at: new Date()
        }
      });

      // Invalidate cache
      this.cache.invalidate(`subscription:${userId}`);
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  }

  /**
   * Update user plan in database and invalidate cache
   * @param {string} userId - User ID
   * @param {string} plan - New plan
   */
  async updateUserPlan(userId, plan) {
    try {
      await this.db.users.update({
        where: { id: userId },
        data: {
          plan: plan,
          updated_at: new Date()
        }
      });

      // Invalidate cache
      this.cache.invalidate(`subscription:${userId}`);
    } catch (error) {
      console.error('Error updating user plan:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();


