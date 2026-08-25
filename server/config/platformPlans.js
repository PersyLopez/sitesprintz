/**
 * Canonical SiteSprintz SaaS catalog for Stripe Checkout.
 * Monthly amounts match src/config/tiers.js TIER_INFO (cents).
 *
 * Monthly Starter/Growth is hosting + monitoring (software access still
 * gated by plan). Labor is separate one-time SKUs — create Dashboard
 * prices and set STRIPE_PRICE_CLAIM_SETUP / STRIPE_PRICE_MANAGED_EDIT.
 *
 * Two clocks (do not conflate):
 * - STRIPE_TRIAL_DAYS: card-required Checkout trial
 * - CLAIM_TTL_DAYS in claimTokenService.js: claim-link window (14 days)
 */

export const STRIPE_TRIAL_DAYS = 7;

export const PLATFORM_PLAN_DETAILS = {
  starter: {
    id: 'starter',
    name: 'SiteSprintz Starter',
    amount: 1000,
    description: 'Hosting and monitoring for a brochure site',
    envPriceKey: 'STRIPE_PRICE_STARTER',
  },
  growth: {
    id: 'growth',
    name: 'SiteSprintz Growth',
    amount: 3500,
    description: 'Hosting and monitoring plus booking and checkout',
    envPriceKey: 'STRIPE_PRICE_GROWTH',
  },
};

/** One-time labor. Amounts live in Stripe Dashboard, not here. */
export const LABOR_SKUS = {
  claim_setup: {
    id: 'claim_setup',
    name: 'Claimable site setup',
    description: 'One-time research, fill, and publish of a prospect site',
    envPriceKey: 'STRIPE_PRICE_CLAIM_SETUP',
    metadataType: 'claim_setup',
  },
  managed_edit: {
    id: 'managed_edit',
    name: 'Done-for-you site change',
    description: 'One billed change when the owner does not edit the site themselves',
    envPriceKey: 'STRIPE_PRICE_MANAGED_EDIT',
    metadataType: 'managed_edit',
  },
};

/**
 * @param {string} [rawPlan]
 * @returns {'starter'|'growth'|null}
 */
export function normalizePaidPlan(rawPlan) {
  const plan = rawPlan === 'pro' || rawPlan === 'premium' ? 'growth' : rawPlan;
  if (!Object.prototype.hasOwnProperty.call(PLATFORM_PLAN_DETAILS, plan)) {
    return null;
  }
  return plan;
}

/**
 * @param {string|undefined} envPriceId
 * @returns {string|null}
 */
export function configuredStripePriceId(envPriceId) {
  return typeof envPriceId === 'string'
    && envPriceId.startsWith('price_')
    && envPriceId.length > 6
    ? envPriceId
    : null;
}

/**
 * Prefer Dashboard Price IDs when set; otherwise inline price_data.
 * @param {'starter'|'growth'} plan
 * @param {NodeJS.ProcessEnv} [env]
 */
export function stripeSubscriptionLineItem(plan, env = process.env) {
  const details = PLATFORM_PLAN_DETAILS[plan];
  const configuredPriceId = configuredStripePriceId(env[details.envPriceKey]);

  if (configuredPriceId) {
    return { price: configuredPriceId, quantity: 1 };
  }

  return {
    price_data: {
      currency: 'usd',
      product_data: {
        name: details.name,
        description: details.description,
      },
      unit_amount: details.amount,
      recurring: { interval: 'month' },
    },
    quantity: 1,
  };
}

/**
 * One-time labor line item. Requires a Dashboard Price ID — no inline cents
 * until the business picks an amount.
 * @param {keyof typeof LABOR_SKUS} skuId
 * @param {NodeJS.ProcessEnv} [env]
 */
export function stripeLaborLineItem(skuId, env = process.env) {
  const sku = LABOR_SKUS[skuId];
  if (!sku) {
    const error = new Error(`Unknown labor SKU: ${skuId}`);
    error.code = 'UNKNOWN_LABOR_SKU';
    throw error;
  }

  const configuredPriceId = configuredStripePriceId(env[sku.envPriceKey]);
  if (!configuredPriceId) {
    const error = new Error(`${sku.envPriceKey} is not set`);
    error.code = 'LABOR_PRICE_NOT_CONFIGURED';
    throw error;
  }

  return { price: configuredPriceId, quantity: 1 };
}
