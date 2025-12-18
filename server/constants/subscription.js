/**
 * Subscription Constants
 * 
 * Centralized configuration for subscription tiers and features.
 * Single source of truth for tier names and feature availability.
 */

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  GROWTH: 'growth',
  PRO: 'pro',
  PREMIUM: 'premium'
};

/**
 * Tiers that have access to service request forms
 */
export const SERVICE_REQUEST_ENABLED_TIERS = [
  SUBSCRIPTION_TIERS.GROWTH,
  SUBSCRIPTION_TIERS.PRO,
  SUBSCRIPTION_TIERS.PREMIUM
];

/**
 * Check if a tier has service request feature
 * @param {string} tier - Subscription tier
 * @returns {boolean} Whether tier has access to service requests
 */
export function hasServiceRequestFeature(tier) {
  return SERVICE_REQUEST_ENABLED_TIERS.includes(tier?.toLowerCase());
}

/**
 * Tier hierarchy (for feature comparison)
 */
export const TIER_HIERARCHY = {
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.STARTER]: 1,
  [SUBSCRIPTION_TIERS.GROWTH]: 2,
  [SUBSCRIPTION_TIERS.PRO]: 3,
  [SUBSCRIPTION_TIERS.PREMIUM]: 4
};

/**
 * Check if tier A is higher than or equal to tier B
 * @param {string} tierA - First tier to compare
 * @param {string} tierB - Tier to compare against
 * @returns {boolean} Whether tierA >= tierB
 */
export function isTierHigherOrEqual(tierA, tierB) {
  const levelA = TIER_HIERARCHY[tierA?.toLowerCase()] ?? -1;
  const levelB = TIER_HIERARCHY[tierB?.toLowerCase()] ?? -1;
  return levelA >= levelB;
}

export default {
  SUBSCRIPTION_TIERS,
  SERVICE_REQUEST_ENABLED_TIERS,
  hasServiceRequestFeature,
  TIER_HIERARCHY,
  isTierHigherOrEqual
};

