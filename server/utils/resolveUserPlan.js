/**
 * Resolve a user's effective subscription plan.
 * Handles dual fields (plan vs subscription_plan) and legacy aliases.
 */

import { normalizeTierName, getPlanLimits } from '../services/subscriptionService.js';

/**
 * @param {{ plan?: string|null, subscription_plan?: string|null, subscriptionPlan?: string|null }|null|undefined} userOrFields
 * @returns {string} Canonical plan: trial | starter | growth
 */
export function resolveUserPlan(userOrFields) {
  if (!userOrFields) return 'trial';
  const raw =
    userOrFields.subscription_plan ||
    userOrFields.subscriptionPlan ||
    userOrFields.plan ||
    'trial';
  return normalizeTierName(raw);
}

/**
 * @param {{ plan?: string|null, subscription_plan?: string|null }|null|undefined} userOrFields
 * @returns {object} PLAN_LIMITS entry
 */
export function resolvePlanLimits(userOrFields) {
  return getPlanLimits(resolveUserPlan(userOrFields));
}

/**
 * Payload to keep plan and subscription_plan in sync when updating a user.
 * @param {string} plan
 * @param {object} [extra]
 */
export function syncedPlanUpdate(plan, extra = {}) {
  const normalized = normalizeTierName(plan);
  return {
    plan: normalized,
    subscription_plan: normalized,
    ...extra
  };
}

export default {
  resolveUserPlan,
  resolvePlanLimits,
  syncedPlanUpdate
};
