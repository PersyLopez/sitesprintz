/**
 * Single source of truth for subscription tier definitions
 * All tier checks, gating, and comparisons flow through this file
 *
 * Official tiers: trial < starter < growth
 * Legacy "pro" / "premium" / "business" normalize to growth
 */

export const TIERS = {
  TRIAL: 'trial',
  STARTER: 'starter',
  GROWTH: 'growth'
};

// Ordered list for tier comparisons
export const TIER_HIERARCHY = [
  TIERS.TRIAL,
  TIERS.STARTER,
  TIERS.GROWTH
];

// Tier aliases for backward compatibility (DB rows, old Stripe plans, UI)
export const TIER_ALIASES = {
  free: TIERS.TRIAL,
  pro: TIERS.GROWTH,
  business: TIERS.GROWTH,
  premium: TIERS.GROWTH,
  enterprise: TIERS.GROWTH,
  checkout: TIERS.GROWTH
};

/**
 * Normalize tier name to canonical tier
 * @param {string} tier - Input tier name (may be legacy)
 * @returns {string} - Canonical tier name
 */
export function normalizeTier(tier) {
  if (!tier) return TIERS.TRIAL;
  const normalized = String(tier).toLowerCase().trim();
  return TIER_ALIASES[normalized] || normalized;
}

/**
 * Check if a tier has access to a feature required at a certain tier level
 * @param {string} userTier - User's subscription tier
 * @param {string} requiredTier - Minimum tier needed for feature
 * @returns {boolean} - True if user can access
 */
export function hasTierAccess(userTier, requiredTier) {
  const normalized = normalizeTier(userTier);
  const required = normalizeTier(requiredTier);

  const userIndex = TIER_HIERARCHY.indexOf(normalized);
  const requiredIndex = TIER_HIERARCHY.indexOf(required);

  if (userIndex === -1) return false;
  if (requiredIndex === -1) return true; // Unknown requirement = allow

  return userIndex >= requiredIndex;
}

/**
 * Tier metadata (for UI display, pricing, etc.)
 */
export const TIER_INFO = {
  trial: {
    name: 'Free Trial',
    displayName: 'Trial',
    price: 0,
    currency: 'USD',
    billingPeriod: 'month',
    description: '7-day free trial when you publish',
    color: '#64748b',
    features: ['Contact forms', 'Service display', 'Basic booking link']
  },
  starter: {
    name: 'Starter',
    displayName: 'Starter',
    price: 10,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'Get found — site, hours, contact',
    color: '#22c55e',
    features: ['Website + templates', 'Contact form & shareable link', 'Hours, menu, photos']
  },
  growth: {
    name: 'Growth',
    displayName: 'Growth',
    price: 35,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'Get booked and paid',
    color: '#f59e0b',
    popular: true,
    features: [
      'Everything in Starter',
      'Booking, cart & Stripe checkout',
      'Custom domain & remove branding'
    ]
  }
};

export default {
  TIERS,
  TIER_HIERARCHY,
  TIER_ALIASES,
  TIER_INFO,
  normalizeTier,
  hasTierAccess
};
