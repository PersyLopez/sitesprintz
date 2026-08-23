import { prisma } from '../../../database/db.js';

const VALID_PLANS = new Set(['starter', 'growth']);

/**
 * Normalize legacy plan names to platform tiers.
 * @param {string|undefined|null} rawPlan
 * @returns {'starter'|'growth'}
 */
export function normalizePlatformPlan(rawPlan) {
  const plan = String(rawPlan || 'growth').toLowerCase();
  if (plan === 'pro' || plan === 'premium') return 'growth';
  if (VALID_PLANS.has(plan)) return plan;
  return 'growth';
}

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {string|null}
 */
export function resolveEmailFromSession(session) {
  return (
    session.metadata?.user_email
    || session.customer_details?.email
    || session.customer_email
    || null
  );
}

/**
 * Resolve platform user from checkout session metadata or email fallbacks.
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

  const user = await resolveUserForSession(session, db);
  if (!user) {
    return { fulfilled: false, reason: 'user_not_found' };
  }

  const rawPlan = session.metadata?.plan
    || session.subscription_data?.metadata?.plan;
  const plan = normalizePlatformPlan(rawPlan);

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id || user.stripe_subscription_id;

  if (
    user.stripe_subscription_id
    && subscriptionId
    && user.stripe_subscription_id === subscriptionId
    && user.plan === plan
    && user.subscription_status === 'active'
  ) {
    return {
      fulfilled: true,
      plan,
      status: 'active',
      userId: user.id,
      idempotent: true,
    };
  }

  let currentPeriodEnd = null;
  if (session.current_period_end) {
    currentPeriodEnd = new Date(session.current_period_end * 1000);
  } else if (stripe && subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (sub.current_period_end) {
        currentPeriodEnd = new Date(sub.current_period_end * 1000);
      }
    } catch {
      // Non-fatal — period end is optional
    }
  }

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id || user.stripe_customer_id;

  const updateData = {
    plan,
    subscription_plan: plan,
    subscription_status: 'active',
    updated_at: new Date(),
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
    status: 'active',
    userId: user.id,
  };
}
