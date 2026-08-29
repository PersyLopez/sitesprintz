export const CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;
export const VALID_PLANS = ['starter', 'growth', 'growth_managed'];
export const VALID_DURATIONS = ['once', 'repeating', 'forever'];
const STRIPE_TIMEOUT_MS = 15000;

const PLAN_PRICE_ENV = {
  starter: 'STRIPE_PRICE_STARTER',
  growth: 'STRIPE_PRICE_GROWTH',
  growth_managed: 'STRIPE_PRICE_GROWTH_MANAGED',
};

/**
 * @param {string|undefined|null} raw
 * @returns {string|null}
 */
export function normalizeCouponCode(raw) {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return null;
  return code;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeAppliesToPlans(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const plans = raw
    .map((plan) => String(plan).toLowerCase().trim())
    .filter((plan) => VALID_PLANS.includes(plan));
  return [...new Set(plans)];
}

/**
 * @param {object} input
 * @returns {{ ok: true, data: object } | { ok: false, error: string, code: string }}
 */
export function validateCouponCreateInput(input) {
  const code = normalizeCouponCode(input?.code);
  if (!code) {
    return { ok: false, error: 'Invalid code. Use 3-32 chars: A-Z, 0-9, _, -', code: 'INVALID_CODE' };
  }

  const hasPercent = input?.percent != null && input.percent !== '';
  const hasAmount = input?.amount != null && input.amount !== '';
  if (hasPercent === hasAmount) {
    return { ok: false, error: 'Provide exactly one of percent or amount', code: 'DISCOUNT_XOR' };
  }

  let percentOff = null;
  let amountOffCents = null;

  if (hasPercent) {
    const percent = Number(input.percent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      return { ok: false, error: 'percent must be an integer from 1 to 100', code: 'INVALID_PERCENT' };
    }
    percentOff = percent;
  }

  if (hasAmount) {
    const amount = Number(input.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return { ok: false, error: 'amount must be a positive integer (USD cents)', code: 'INVALID_AMOUNT' };
    }
    amountOffCents = amount;
  }

  const duration = String(input?.duration || '').toLowerCase().trim();
  if (!VALID_DURATIONS.includes(duration)) {
    return { ok: false, error: 'duration must be once, repeating, or forever', code: 'INVALID_DURATION' };
  }

  let durationInMonths = null;
  if (duration === 'repeating') {
    const months = Number(input?.durationInMonths);
    if (!Number.isInteger(months) || months < 1 || months > 36) {
      return {
        ok: false,
        error: 'durationInMonths must be an integer from 1 to 36 when duration is repeating',
        code: 'INVALID_DURATION_MONTHS',
      };
    }
    durationInMonths = months;
  } else if (input?.durationInMonths != null && input.durationInMonths !== '') {
    return {
      ok: false,
      error: 'durationInMonths is only allowed when duration is repeating',
      code: 'INVALID_DURATION_MONTHS',
    };
  }

  let maxRedemptions = null;
  if (input?.maxRedemptions != null && input.maxRedemptions !== '') {
    const max = Number(input.maxRedemptions);
    if (!Number.isInteger(max) || max < 1) {
      return { ok: false, error: 'maxRedemptions must be a positive integer', code: 'INVALID_MAX_REDEMPTIONS' };
    }
    maxRedemptions = max;
  }

  let expiresAt = null;
  if (input?.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: 'expiresAt must be a valid date', code: 'INVALID_EXPIRES_AT' };
    }
    expiresAt = parsed;
  }

  const appliesToPlans = normalizeAppliesToPlans(input?.appliesToPlans);

  return {
    ok: true,
    data: {
      code,
      percentOff,
      amountOffCents,
      duration,
      durationInMonths,
      maxRedemptions,
      expiresAt,
      firstTimeOnly: Boolean(input?.firstTimeOnly),
      appliesToPlans,
    },
  };
}

/**
 * @param {import('stripe').default} stripe
 * @param {string[]} plans
 * @returns {Promise<string[]>}
 */
export async function resolveStripeProductIdsForPlans(stripe, plans, stripeCall = defaultStripeCall) {
  const productIds = [];
  for (const plan of plans) {
    const envKey = PLAN_PRICE_ENV[plan];
    const priceId = process.env[envKey];
    if (!priceId) {
      const error = new Error(`Missing Stripe price env for plan ${plan}`);
      error.code = 'MISSING_PLAN_PRICE';
      throw error;
    }
    const price = await stripeCall(() => stripe.prices.retrieve(priceId), `prices.retrieve:${plan}`);
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (!productId) {
      const error = new Error(`Could not resolve Stripe product for plan ${plan}`);
      error.code = 'MISSING_PLAN_PRODUCT';
      throw error;
    }
    productIds.push(productId);
  }
  return [...new Set(productIds)];
}

/**
 * @param {Promise<unknown>} promise
 * @param {string} label
 */
async function defaultStripeCall(promiseFactory, label = 'stripe') {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`${label} timed out after ${STRIPE_TIMEOUT_MS}ms`);
      err.code = 'TIMEOUT';
      reject(err);
    }, STRIPE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promiseFactory(), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function serializeCoupon(row) {
  return {
    id: row.id,
    code: row.code,
    percentOff: row.percent_off,
    amountOffCents: row.amount_off_cents,
    duration: row.duration,
    durationInMonths: row.duration_in_months,
    maxRedemptions: row.max_redemptions,
    expiresAt: row.expires_at,
    firstTimeOnly: row.first_time_only,
    appliesToPlans: Array.isArray(row.applies_to_plans) ? row.applies_to_plans : [],
    stripeCouponId: row.stripe_coupon_id,
    stripePromotionCodeId: row.stripe_promotion_code_id,
    active: row.active,
    timesRedeemed: row.times_redeemed,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * @param {{ prisma: import('@prisma/client').PrismaClient }} deps
 */
export async function listPlatformCoupons(deps) {
  const rows = await deps.prisma.platform_coupons.findMany({
    orderBy: { created_at: 'desc' },
  });
  return rows.map(serializeCoupon);
}

/**
 * @param {object} input
 * @param {{ stripe: import('stripe').default, prisma: import('@prisma/client').PrismaClient, createdBy: string, env?: NodeJS.ProcessEnv, stripeCall?: Function }} deps
 */
export async function createPlatformCoupon(input, deps) {
  const { stripe, prisma, createdBy, env = process.env, stripeCall = defaultStripeCall } = deps;
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }

  const validated = validateCouponCreateInput(input);
  if (!validated.ok) {
    const error = new Error(validated.error);
    error.code = validated.code;
    throw error;
  }

  const data = validated.data;

  const existing = await prisma.platform_coupons.findUnique({ where: { code: data.code } });
  if (existing) {
    const error = new Error('Coupon code already exists');
    error.code = 'CODE_EXISTS';
    throw error;
  }

  /** @type {import('stripe').Stripe.CouponCreateParams} */
  const couponParams = {
    duration: data.duration,
  };

  if (data.percentOff != null) {
    couponParams.percent_off = data.percentOff;
  } else {
    couponParams.amount_off = data.amountOffCents;
    couponParams.currency = 'usd';
  }

  if (data.duration === 'repeating') {
    couponParams.duration_in_months = data.durationInMonths;
  }

  if (data.appliesToPlans.length > 0) {
    const productIds = await resolveStripeProductIdsForPlans(stripe, data.appliesToPlans, stripeCall);
    couponParams.applies_to = { products: productIds };
  }

  const stripeCoupon = await stripeCall(
    () => stripe.coupons.create(couponParams),
    'coupons.create',
  );

  /** @type {import('stripe').Stripe.PromotionCodeCreateParams} */
  const promoParams = {
    coupon: stripeCoupon.id,
    code: data.code,
  };

  if (data.maxRedemptions != null) {
    promoParams.max_redemptions = data.maxRedemptions;
  }
  if (data.expiresAt) {
    promoParams.expires_at = Math.floor(data.expiresAt.getTime() / 1000);
  }
  if (data.firstTimeOnly) {
    promoParams.restrictions = { first_time_transaction: true };
  }
  if (typeof input?.restrictToCustomerId === 'string' && input.restrictToCustomerId.startsWith('cus_')) {
    promoParams.customer = input.restrictToCustomerId;
  }

  const stripePromo = await stripeCall(
    () => stripe.promotionCodes.create(promoParams),
    'promotionCodes.create',
  );

  try {
    const row = await prisma.platform_coupons.create({
      data: {
        code: data.code,
        percent_off: data.percentOff,
        amount_off_cents: data.amountOffCents,
        duration: data.duration,
        duration_in_months: data.durationInMonths,
        max_redemptions: data.maxRedemptions,
        expires_at: data.expiresAt,
        first_time_only: data.firstTimeOnly,
        applies_to_plans: data.appliesToPlans.length > 0 ? data.appliesToPlans : null,
        stripe_coupon_id: stripeCoupon.id,
        stripe_promotion_code_id: stripePromo.id,
        active: true,
        times_redeemed: 0,
        created_by: createdBy,
      },
    });
    return serializeCoupon(row);
  } catch (persistError) {
    try {
      await stripeCall(
        () => stripe.promotionCodes.update(stripePromo.id, { active: false }),
        'promotionCodes.deactivate-rollback',
      );
    } catch {
      // Best-effort rollback; original error is more important
    }
    throw persistError;
  }
}

/**
 * @param {string} couponId
 * @param {{ active: boolean }} patch
 * @param {{ stripe: import('stripe').default, prisma: import('@prisma/client').PrismaClient, stripeCall?: Function }} deps
 */
export async function updatePlatformCouponActive(couponId, patch, deps) {
  const { stripe, prisma, stripeCall = defaultStripeCall } = deps;
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }

  if (typeof patch?.active !== 'boolean') {
    const error = new Error('active must be a boolean');
    error.code = 'INVALID_ACTIVE';
    throw error;
  }

  const existing = await prisma.platform_coupons.findUnique({ where: { id: couponId } });
  if (!existing) {
    const error = new Error('Coupon not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await stripeCall(
    () => stripe.promotionCodes.update(existing.stripe_promotion_code_id, { active: patch.active }),
    'promotionCodes.update',
  );

  const row = await prisma.platform_coupons.update({
    where: { id: couponId },
    data: { active: patch.active },
  });

  return serializeCoupon(row);
}

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {boolean}
 */
export function sessionHasDiscount(session) {
  if ((session.total_details?.amount_discount || 0) > 0) return true;
  if (Array.isArray(session.discounts) && session.discounts.length > 0) return true;
  return false;
}

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {string|null}
 */
export function extractPromotionCodeId(session) {
  if (!Array.isArray(session.discounts)) return null;
  for (const discount of session.discounts) {
    const promo = discount?.promotion_code;
    if (typeof promo === 'string') return promo;
    if (promo && typeof promo === 'object' && promo.id) return promo.id;
  }
  return null;
}

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @param {{ stripe?: import('stripe').default, prisma: import('@prisma/client').PrismaClient, stripeCall?: Function }} deps
 */
export async function recordPlatformCouponRedemption(session, deps) {
  const { prisma, stripe = null, stripeCall = defaultStripeCall } = deps;

  let workingSession = session;
  let promoCodeId = extractPromotionCodeId(workingSession);

  if (!promoCodeId && stripe && session.id) {
    if (!sessionHasDiscount(session)) {
      return { recorded: false, reason: 'no_discount' };
    }
    workingSession = await stripeCall(
      () => stripe.checkout.sessions.retrieve(session.id, {
        expand: ['discounts.promotion_code'],
      }),
      'checkout.sessions.retrieve',
    );
    promoCodeId = extractPromotionCodeId(workingSession);
  }

  if (!promoCodeId) {
    return { recorded: false, reason: 'no_promotion_code' };
  }

  const coupon = await prisma.platform_coupons.findFirst({
    where: { stripe_promotion_code_id: promoCodeId },
  });
  if (!coupon) {
    return { recorded: false, reason: 'unknown_promotion_code' };
  }

  const userId = workingSession.metadata?.userId
    || workingSession.client_reference_id
    || null;
  if (!userId) {
    return { recorded: false, reason: 'missing_user' };
  }

  const existing = await prisma.platform_coupon_redemptions.findUnique({
    where: { stripe_session_id: workingSession.id },
  });
  if (existing) {
    return { recorded: true, idempotent: true, couponId: coupon.id };
  }

  await prisma.$transaction(async (tx) => {
    await tx.platform_coupon_redemptions.create({
      data: {
        coupon_id: coupon.id,
        user_id: userId,
        stripe_session_id: workingSession.id,
      },
    });
    await tx.platform_coupons.update({
      where: { id: coupon.id },
      data: { times_redeemed: { increment: 1 } },
    });
  });

  return { recorded: true, couponId: coupon.id };
}

export default {
  normalizeCouponCode,
  validateCouponCreateInput,
  listPlatformCoupons,
  createPlatformCoupon,
  updatePlatformCouponActive,
  recordPlatformCouponRedemption,
};
