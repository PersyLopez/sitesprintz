/**
 * Subscription Constants
 *
 * Official tiers: trial, starter, growth
 * Legacy "pro" / "premium" normalize to growth
 */

export const SUBSCRIPTION_TIERS = {
  TRIAL: 'trial',
  STARTER: 'starter',
  GROWTH: 'growth'
};

/**
 * Legacy tier names (for backward compatibility)
 */
export const LEGACY_TIER_MAPPING = {
  free: 'trial',
  pro: 'growth',
  premium: 'growth',
  enterprise: 'growth',
  business: 'growth',
  checkout: 'growth'
};

/**
 * Tiers that have access to service request forms
 */
export const SERVICE_REQUEST_ENABLED_TIERS = [
  SUBSCRIPTION_TIERS.GROWTH
];

/**
 * Check if a tier has service request feature
 * @param {string} tier - Subscription tier
 * @returns {boolean} Whether tier has access to service requests
 */
export function hasServiceRequestFeature(tier) {
  const normalized = LEGACY_TIER_MAPPING[tier?.toLowerCase()] || tier?.toLowerCase();
  return (
    SERVICE_REQUEST_ENABLED_TIERS.includes(normalized) ||
    normalized === 'pro' ||
    normalized === 'premium'
  );
}

/**
 * Tier hierarchy (for feature comparison)
 */
export const TIER_HIERARCHY = {
  [SUBSCRIPTION_TIERS.TRIAL]: 0,
  [SUBSCRIPTION_TIERS.STARTER]: 1,
  [SUBSCRIPTION_TIERS.GROWTH]: 2,
  // Legacy keys so old comparisons still work
  pro: 2,
  premium: 2,
  enterprise: 2
};

/**
 * Check if tier A is higher than or equal to tier B
 * @param {string} tierA - First tier to compare
 * @param {string} tierB - Tier to compare against
 * @returns {boolean} Whether tierA >= tierB
 */
export function isTierHigherOrEqual(tierA, tierB) {
  const normalize = (t) => LEGACY_TIER_MAPPING[t?.toLowerCase()] || t?.toLowerCase();
  const levelA = TIER_HIERARCHY[normalize(tierA)] ?? -1;
  const levelB = TIER_HIERARCHY[normalize(tierB)] ?? -1;
  return levelA >= levelB;
}

export default {
  SUBSCRIPTION_TIERS,
  LEGACY_TIER_MAPPING,
  SERVICE_REQUEST_ENABLED_TIERS,
  hasServiceRequestFeature,
  TIER_HIERARCHY,
  isTierHigherOrEqual
};
