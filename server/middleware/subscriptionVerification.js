/**
 * Subscription verification middleware and utilities
 * Handles checking subscription status and enforcing plan limits
 * 
 * REFACTORED: Now uses SubscriptionService with caching and conflict resolution
 */
import { subscriptionService, PLAN_LIMITS } from '../services/subscriptionService.js';

// Re-export PLAN_LIMITS for backward compatibility
export { PLAN_LIMITS };

/**
 * Get user's current subscription status
 * DEPRECATED: Use subscriptionService.getSubscriptionStatus() directly
 * Kept for backward compatibility
 * 
 * @param {string} userId - User ID
 * @returns {Promise<{plan: string, status: string, currentPeriodEnd: Date|null}>}
 */
export async function getSubscriptionStatus(userId) {
  return await subscriptionService.getSubscriptionStatus(userId);
}

/**
 * Check if user can access a specific template based on their plan
 * DEPRECATED: Use subscriptionService.canAccessTemplate() directly
 * Kept for backward compatibility
 * 
 * @param {string} userId - User ID
 * @param {string} templateId - Template ID
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function canAccessTemplate(userId, templateId) {
  return await subscriptionService.canAccessTemplate(userId, templateId);
}

/**
 * Middleware to require active subscription before publishing
 */
export function requireActiveSubscription(req, res, next) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Skip for admins
  if (req.user.role === 'admin') {
    return next();
  }
  
  getSubscriptionStatus(userId)
    .then((subscription) => {
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        return res.status(403).json({
          error: 'Subscription required',
          message: 'An active subscription is required to publish sites.',
          code: 'SUBSCRIPTION_REQUIRED',
          plan: subscription.plan,
          status: subscription.status
        });
      }
      
      // Add subscription info to request
      req.subscription = subscription;
      next();
    })
    .catch((error) => {
      console.error('Subscription check error:', error);
      res.status(500).json({ error: 'Failed to verify subscription' });
    });
}

/**
 * Middleware to check template access before site creation
 */
export function requireTemplateAccess(req, res, next) {
  const userId = req.user?.id;
  const templateId = req.body.templateId || req.body.template_id;
  
  if (!userId || !templateId) {
    return res.status(400).json({ error: 'User ID and template ID required' });
  }
  
  // Skip for admins
  if (req.user.role === 'admin') {
    return next();
  }
  
  canAccessTemplate(userId, templateId)
    .then((access) => {
      if (!access.allowed) {
        return res.status(403).json({
          error: 'Template access denied',
          message: access.reason || 'You do not have access to this template.',
          code: 'TEMPLATE_ACCESS_DENIED',
          templateId
        });
      }
      
      next();
    })
    .catch((error) => {
      console.error('Template access check error:', error);
      res.status(500).json({ error: 'Failed to verify template access' });
    });
}

/**
 * Check if user has reached their site limit
 * @param {string} userId - User ID
 * @returns {Promise<{allowed: boolean, current: number, limit: number}>}
 */
export async function canCreateSite(userId) {
  const subscription = await getSubscriptionStatus(userId);
  const plan = subscription.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  
  // Check if subscription is active
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reason: 'Subscription not active'
    };
  }
  
  // Get current site count
  const result = await dbQuery(`
    SELECT COUNT(*) as site_count
    FROM sites
    WHERE user_id = $1 AND status != 'deleted'
  `, [userId]);
  
  const currentCount = parseInt(result.rows[0].site_count);
  const maxSites = limits.maxSites;
  
  // -1 means unlimited
  if (maxSites === -1) {
    return {
      allowed: true,
      current: currentCount,
      limit: -1
    };
  }
  
  return {
    allowed: currentCount < maxSites,
    current: currentCount,
    limit: maxSites
  };
}

export default {
  PLAN_LIMITS,
  getSubscriptionStatus,
  canAccessTemplate,
  canCreateSite,
  requireActiveSubscription,
  requireTemplateAccess
};

