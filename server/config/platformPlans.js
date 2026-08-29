/**
 * Canonical SiteSprintz SaaS catalog for Stripe Checkout.
 * Monthly amounts match src/config/tiers.js TIER_INFO (cents).
 *
 * Monthly Starter / Growth / Growth Managed is hosting + monitoring (software
 * access still gated by plan). Labor SKUs use Dashboard Price IDs only — never client cents.
 *
 * Two clocks (do not conflate):
 * - STRIPE_TRIAL_DAYS: self-serve publish Checkout only (not claimables we prepared)
 * - CLAIM_TTL_DAYS in claimTokenService.js: claim-link window (14 days)
 */

export const STRIPE_TRIAL_DAYS = 7;

/** Targeted claimables default to DIY Growth. Starter is self-serve only. */
export const CLAIM_PLAN = 'growth';
export const CLAIM_PLANS = ['growth', 'growth_managed'];

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
  growth_managed: {
    id: 'growth_managed',
    name: 'SiteSprintz Growth Managed',
    amount: 7500,
    description: 'Same software as Growth; we take the list (two catalog batches a month)',
    envPriceKey: 'STRIPE_PRICE_GROWTH_MANAGED',
  },
};

/** Labor extras. Amounts are in src/config/pricing.config.js; Stripe Price IDs here. */
export const LABOR_SKUS = {
  claim_setup: {
    id: 'claim_setup',
    name: 'Claimable site setup',
    description: 'Inbound greenfield only — never charged on targeted claimable sites',
    envPriceKey: 'STRIPE_PRICE_CLAIM_SETUP',
    metadataType: 'claim_setup',
  },
  managed_care: {
    id: 'managed_care',
    name: 'Managed care (legacy add-on)',
    description: 'Superseded by the Growth Managed plan — keep for webhook/ledger rows only',
    envPriceKey: 'STRIPE_PRICE_MANAGED_CARE',
    metadataType: 'managed_care',
  },
  managed_edit: {
    id: 'managed_edit',
    name: 'Extra catalog batch',
    description: 'One extra product/service/price batch beyond monthly care',
    envPriceKey: 'STRIPE_PRICE_MANAGED_EDIT',
    metadataType: 'managed_edit',
  },
  brand_match: {
    id: 'brand_match',
    name: 'Brand match',
    description: 'Logo and colors on a locked palette',
    envPriceKey: 'STRIPE_PRICE_BRAND_MATCH',
    metadataType: 'brand_match',
  },
  unique_look: {
    id: 'unique_look',
    name: 'Unique look',
    description: 'Site-specific paper, type, and accent on this layout',
    envPriceKey: 'STRIPE_PRICE_UNIQUE_LOOK',
    metadataType: 'unique_look',
  },
};

/**
 * @param {string} [rawPlan]
 * @returns {'starter'|'growth'|'growth_managed'|null}
 */
export function normalizePaidPlan(rawPlan) {
  if (rawPlan == null || rawPlan === '') return null;
  let plan = String(rawPlan).toLowerCase().trim();
  if (plan === 'pro' || plan === 'premium') plan = 'growth';
  if (plan === 'managed') plan = 'growth_managed';
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
 * @param {'starter'|'growth'|'growth_managed'} plan
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

/** Customer-facing extras. Care is the Growth Managed plan, not a labor SKU. */
export const CUSTOMER_LABOR_SKUS = [
  'managed_edit',
  'brand_match',
  'unique_look',
];

/**
 * @param {string} [rawSku]
 * @returns {typeof CUSTOMER_LABOR_SKUS[number]|null}
 */
export function normalizeCustomerLaborSku(rawSku) {
  const sku = typeof rawSku === 'string' ? rawSku.trim() : '';
  return CUSTOMER_LABOR_SKUS.includes(sku) ? sku : null;
}

/**
 * @param {typeof CUSTOMER_LABOR_SKUS[number]} skuId
 * @returns {'subscription'|'payment'}
 */
export function laborCheckoutMode(skuId) {
  return skuId === 'managed_care' ? 'subscription' : 'payment';
}

/**
 * @param {string} userId
 * @param {string} skuId
 * @param {Date} [now]
 */
export function laborIdempotencyKey(userId, skuId, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return `labor:${userId}:${skuId}:${day}`;
}

/**
 * @param {string} skuId
 * @param {NodeJS.ProcessEnv} [env]
 */
export function isCustomerLaborSkuConfigured(skuId, env = process.env) {
  if (!CUSTOMER_LABOR_SKUS.includes(skuId)) {
    return false;
  }
  const sku = LABOR_SKUS[skuId];
  return Boolean(configuredStripePriceId(env[sku.envPriceKey]));
}
