import Stripe from 'stripe';
import { prisma } from '../../database/db.js';
import { getFrontendOrigin } from './payments/processorConnectHelpers.js';

const PLAN_DETAILS = {
  starter: {
    name: 'SiteSprintz Starter',
    amount: 1000,
    description: 'Professional website — get found',
  },
  growth: {
    name: 'SiteSprintz Growth',
    amount: 3500,
    description: 'Booking and checkout',
  },
};

export function normalizeClaimPlan(rawPlan) {
  const plan = rawPlan === 'pro' || rawPlan === 'premium' ? 'growth' : rawPlan;
  if (!['starter', 'growth'].includes(plan)) {
    return null;
  }
  return plan;
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

  const selectedPlan = PLAN_DETAILS[plan];
  const origin = getFrontendOrigin(req);
  const customer = await getOrCreateStripeCustomer(stripe, user.email, user.id);

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_collection: 'always',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: selectedPlan.name,
            description: selectedPlan.description,
          },
          unit_amount: selectedPlan.amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 7,
    },
    success_url: `${origin}/claim/${claimToken}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/claim/${claimToken}`,
    metadata: {
      userId: user.id,
      plan,
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

  const plan = normalizeClaimPlan(metadata.plan) || metadata.plan;
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

  return { ready: true, subscriptionStatus: subscription.status };
}
