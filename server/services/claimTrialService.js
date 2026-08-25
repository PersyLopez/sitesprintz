import Stripe from 'stripe';
import { prisma } from '../../database/db.js';
import { getFrontendOrigin } from './payments/processorConnectHelpers.js';
import {
  CLAIM_PLAN,
  CLAIM_PLANS,
  STRIPE_TRIAL_DAYS,
  normalizePaidPlan,
  stripeSubscriptionLineItem,
} from '../config/platformPlans.js';

export { CLAIM_PLAN, CLAIM_PLANS };

/**
 * Claim Checkout is Growth or Growth Managed. Empty body defaults to DIY Growth; Starter is rejected.
 * @param {string} [rawPlan]
 * @returns {'growth'|'growth_managed'|null}
 */
export function normalizeClaimPlan(rawPlan) {
  const plan =
    rawPlan == null || rawPlan === '' ? CLAIM_PLAN : normalizePaidPlan(rawPlan);
  return CLAIM_PLANS.includes(plan) ? plan : null;
}

export function hasClaimableGrowthSubscription(user) {
  const status = user?.subscriptionStatus || user?.subscription_status;
  if (!isSubscribedStatus(status)) {
    return false;
  }
  const raw = user?.subscriptionPlan || user?.subscription_plan || user?.plan;
  const plan = normalizePaidPlan(raw);
  return CLAIM_PLANS.includes(plan);
}

export function isSubscribedStatus(status) {
  return status === 'trialing' || status === 'active';
}

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key ? new Stripe(key, { apiVersion: '2024-06-20' }) : null;
}

export async function validateClaimOwnership(site, claimant, prismaClient = prisma) {
  const owner = site.user_id
    ? await prismaClient.users.findUnique({
        where: { id: site.user_id },
        select: { id: true, role: true },
      })
    : null;

  if (owner && owner.role !== 'admin' && owner.id !== claimant.id) {
    return { status: 403, body: { error: 'Site already owned' } };
  }

  if (claimant.role === 'admin' && owner && owner.id !== claimant.id) {
    return { status: 403, body: { error: 'Not allowed' } };
  }

  return null;
}

async function getOrCreateStripeCustomer(stripe, userEmail, userId) {
  const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
  let customer;
  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0];
  } else {
    customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        source: 'sitesprintz',
        signupDate: new Date().toISOString(),
      },
    });
  }

  await prisma.users.update({
    where: { id: userId },
    data: { stripe_customer_id: customer.id },
  });

  return customer;
}

export async function createClaimTrialCheckout({
  user,
  site,
  plan,
  claimToken,
  req,
  stripe = getStripeClient(),
}) {
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }
  const claimPlan = plan ? normalizeClaimPlan(plan) : CLAIM_PLAN;
  if (!claimPlan) {
    const error = new Error('Claim trial must be Growth or Growth Managed');
    error.code = 'INVALID_PLAN';
    throw error;
  }

  const origin = getFrontendOrigin(req);
  const customer = await getOrCreateStripeCustomer(stripe, user.email, user.id);

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_collection: 'always',
    payment_method_types: ['card'],
    line_items: [stripeSubscriptionLineItem(claimPlan)],
    subscription_data: {
      trial_period_days: STRIPE_TRIAL_DAYS,
      metadata: {
        plan: claimPlan,
        userId: user.id,
      },
    },
    success_url: `${origin}/claim/${claimToken}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/claim/${claimToken}`,
    metadata: {
      userId: user.id,
      plan: claimPlan,
      siteId: site.id,
      source: 'claim_trial',
    },
  });

  return { url: session.url };
}

export async function completeClaimTrialCheckout({
  user,
  site,
  sessionId,
  stripe = getStripeClient(),
}) {
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.status !== 'complete') {
    const error = new Error('Checkout session is not complete');
    error.code = 'SESSION_INCOMPLETE';
    throw error;
  }

  const metadata = session.metadata || {};
  if (metadata.userId !== user.id) {
    const error = new Error('Session does not belong to this user');
    error.code = 'SESSION_USER_MISMATCH';
    throw error;
  }
  if (metadata.source !== 'claim_trial') {
    const error = new Error('Invalid checkout source');
    error.code = 'INVALID_SOURCE';
    throw error;
  }
  if (metadata.siteId !== site.id) {
    const error = new Error('Session does not match this site');
    error.code = 'SESSION_SITE_MISMATCH';
    throw error;
  }

  const subscription =
    typeof session.subscription === 'object' ? session.subscription : null;
  if (!subscription) {
    const error = new Error('Subscription not found on session');
    error.code = 'MISSING_SUBSCRIPTION';
    throw error;
  }

  if (!isSubscribedStatus(subscription.status)) {
    const error = new Error('Subscription is not active or trialing');
    error.code = 'INVALID_SUBSCRIPTION_STATUS';
    throw error;
  }

  const plan = normalizeClaimPlan(metadata.plan);
  if (!plan) {
    const error = new Error('Claim trial must be Growth or Growth Managed');
    error.code = 'INVALID_PLAN';
    throw error;
  }
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;

  await prisma.users.update({
    where: { id: user.id },
    data: {
      stripe_customer_id: customerId || undefined,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      plan,
      subscription_plan: plan,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
    },
  });

  return { ready: true, subscriptionStatus: subscription.status, plan };
}
