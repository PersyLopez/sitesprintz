import { prisma } from '../../../database/db.js';
import { normalizePaidPlan } from '../../config/platformPlans.js';

const BLOCKED_SUBSCRIPTION_STATUSES = new Set([
  'incomplete',
  'incomplete_expired',
  'past_due',
  'canceled',
  'unpaid',
]);

/**
 * Normalize legacy plan names to platform tiers.
 * @param {string|undefined|null} rawPlan
 * @returns {'starter'|'growth'|'growth_managed'|null}
 */
export function normalizePlatformPlan(rawPlan) {
  if (rawPlan == null || rawPlan === '') return null;
  return normalizePaidPlan(String(rawPlan).toLowerCase());
}

/**
 * Map Stripe Price ID to platform plan via env configuration.
 * Unknown IDs return null — never default to growth.
 * @param {string|undefined|null} priceId
 * @returns {'starter'|'growth'|'growth_managed'|null}
 */
export function mapPlanFromPriceId(priceId) {
  if (!priceId || typeof priceId !== 'string') return null;
  const starter = process.env.STRIPE_PRICE_STARTER;
  const growth = process.env.STRIPE_PRICE_GROWTH;
  const growthManaged = process.env.STRIPE_PRICE_GROWTH_MANAGED;
  if (starter && priceId === starter) return 'starter';
  if (growth && priceId === growth) return 'growth';
  if (growthManaged && priceId === growthManaged) return 'growth_managed';
  return null;
}

/**
 * Resolve plan from subscription metadata or first line item price id.
 * @param {import('stripe').Stripe.Subscription} subscription
 * @returns {'starter'|'growth'|'growth_managed'|null}
 */
export function resolvePlanFromSubscription(subscription) {
  const fromMeta = normalizePlatformPlan(subscription?.metadata?.plan);
  if (fromMeta) return fromMeta;

  const item = subscription?.items?.data?.[0];
  const priceId = item?.price?.id || item?.plan?.id;
  return mapPlanFromPriceId(priceId);
}

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {string|null}
 */
export function resolveEmailFromSession(session) {
  return session.metadata?.user_email || null;
}

/**
 * Resolve platform user from checkout session metadata or account email fallback.
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @param {import('@prisma/client').PrismaClient} [db]
 * @returns {Promise<object|null>}
 */
export async function resolveUserForSession(session, db = prisma) {
  const userId = session.metadata?.userId || session.client_reference_id;
  if (userId) {
    const byId = await db.users.findUnique({ where: { id: userId } });
    if (byId) return byId;
  }

  const email = resolveEmailFromSession(session);
  if (email) {
    const byEmail = await db.users.findUnique({ where: { email } });
    if (byEmail) return byEmail;
  }

  return null;
}

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {boolean}
 */
function isSubscriptionSession(session) {
  const hasSubscriptionContext = Boolean(
    session.subscription
    || session.metadata?.plan
    || session.subscription_data?.metadata?.plan,
  );
  return session.mode === 'subscription'
    || (session.mode == null && hasSubscriptionContext);
}

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {boolean}
 */
function isSessionPaid(session) {
  const status = session.payment_status;
  return status === 'paid' || status === 'no_payment_required';
}

/**
 * @param {string} stripeStatus
 * @returns {'active'|'trialing'|null}
 */
function mapFulfillmentStatus(stripeStatus) {
  if (stripeStatus === 'trialing') return 'trialing';
  if (stripeStatus === 'active') return 'active';
  return null;
}

/**
 * Fulfill a platform subscription checkout — updates users only (no subscriptions table).
 * Idempotent: safe to call multiple times for the same paid session.
 *
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @param {{ db?: import('@prisma/client').PrismaClient, stripe?: import('stripe').default }} [options]
 * @returns {Promise<{ fulfilled: boolean, plan?: string, status?: string, userId?: string, reason?: string, idempotent?: boolean }>}
 */
export async function fulfillPlatformSubscription(session, options = {}) {
  const db = options.db || prisma;
  const stripe = options.stripe || null;

  if (!isSubscriptionSession(session)) {
    return { fulfilled: false, reason: 'invalid_session_mode' };
  }

  if (!isSessionPaid(session)) {
    return { fulfilled: false, reason: 'not_paid' };
  }

  const user = await resolveUserForSession(session, db);
  if (!user) {
    return { fulfilled: false, reason: 'user_not_found' };
  }

  const rawPlan = session.metadata?.plan
    || session.subscription_data?.metadata?.plan;
  const plan = normalizePlatformPlan(rawPlan);
  if (!plan) {
    return { fulfilled: false, reason: 'invalid_plan' };
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id || user.stripe_subscription_id;

  let subscriptionStatus = 'active';
  let currentPeriodEnd = null;

  if (stripe && subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (BLOCKED_SUBSCRIPTION_STATUSES.has(sub.status)) {
        return { fulfilled: false, reason: 'subscription_not_active' };
      }
      const mapped = mapFulfillmentStatus(sub.status);
      if (!mapped) {
        return { fulfilled: false, reason: 'subscription_not_active' };
      }
      subscriptionStatus = mapped;
      if (sub.current_period_end) {
        currentPeriodEnd = new Date(sub.current_period_end * 1000);
      }
    } catch {
      // Non-fatal when Stripe is unavailable — rely on session paid state
    }
  }

  if (
    user.stripe_subscription_id
    && subscriptionId
    && user.stripe_subscription_id === subscriptionId
    && user.plan === plan
    && (user.subscription_status === 'active' || user.subscription_status === 'trialing')
    && user.subscription_status === subscriptionStatus
  ) {
    return {
      fulfilled: true,
      plan,
      status: subscriptionStatus,
      userId: user.id,
      idempotent: true,
    };
  }

  if (!currentPeriodEnd && session.current_period_end) {
    currentPeriodEnd = new Date(session.current_period_end * 1000);
  }

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id || user.stripe_customer_id;

  const updateData = {
    plan,
    subscription_plan: plan,
    subscription_status: subscriptionStatus,
  };

  if (customerId) {
    updateData.stripe_customer_id = customerId;
  }
  if (subscriptionId) {
    updateData.stripe_subscription_id = subscriptionId;
  }
  if (currentPeriodEnd) {
    updateData.current_period_end = currentPeriodEnd;
  }

  await db.users.update({
    where: { id: user.id },
    data: updateData,
  });

  return {
    fulfilled: true,
    plan,
    status: subscriptionStatus,
    userId: user.id,
  };
}
