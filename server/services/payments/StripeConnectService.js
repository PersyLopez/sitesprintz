/**
 * Stripe Standard Connect — merchants keep their own Stripe account.
 * Express/Custom accounts are not used: Stripe hosts KYC and payouts.
 */

import crypto from 'crypto';
import Stripe from 'stripe';
import { getRedis } from '../../utils/redis.js';
import { prisma } from '../../../database/db.js';
import { recordProcessorConnection } from './processorConnectHelpers.js';

const STATE_TTL_SECONDS = 600;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

export function generateStateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function isStripeOAuthConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CLIENT_ID);
}

export async function initiateStripeOAuth(userId, siteId, redirectUri, applyTo = 'site') {
  if (!isStripeOAuthConfigured()) {
    throw new Error('Stripe OAuth not configured');
  }
  if (!redirectUri) {
    throw new Error('Stripe redirect URI required');
  }

  const state = generateStateToken();
  const redis = getRedis();
  await redis.setex(
    `stripe_oauth_state:${state}`,
    STATE_TTL_SECONDS,
    JSON.stringify({ userId, siteId, redirectUri, applyTo })
  );

  const authorizeUrl =
    `https://connect.stripe.com/oauth/authorize?` +
    `response_type=code` +
    `&client_id=${encodeURIComponent(process.env.STRIPE_CLIENT_ID)}` +
    `&scope=read_write` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  return { authorizeUrl, state };
}

export async function handleStripeOAuthCallback(code, state) {
  if (!code || !state) {
    throw new Error('Authorization code and state required');
  }

  const redis = getRedis();
  const stateData = await redis.get(`stripe_oauth_state:${state}`);
  if (!stateData) {
    throw new Error('Invalid or expired state token');
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const { userId, siteId, applyTo } = JSON.parse(stateData);

  const token = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code
  });

  const accountId = token.stripe_user_id;
  if (!accountId) {
    throw new Error('Failed to connect Stripe account');
  }

  let chargesEnabled = false;
  let payoutsEnabled = false;
  try {
    const account = await stripe.accounts.retrieve(accountId);
    chargesEnabled = account.charges_enabled === true;
    payoutsEnabled = account.payouts_enabled === true;
  } catch {
    chargesEnabled = false;
  }

  await recordProcessorConnection({
    siteId,
    userId,
    processor: 'stripe',
    accountId,
    metadata: {
      connected_via: 'oauth',
      livemode: token.livemode === true
    },
    stripeChargesEnabled: chargesEnabled,
    applyTo
  });

  await redis.del(`stripe_oauth_state:${state}`);

  return { siteId, accountId, chargesEnabled, payoutsEnabled };
}

export async function createStandardAccountLink({ user, origin, siteId, applyTo = 'site' }) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  let accountId = user.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'standard',
      email: user.email,
      metadata: {
        platform_user_id: user.id,
        created_via: 'sitesprintz_standard_connect'
      }
    });
    accountId = account.id;

    await prisma.users.update({
      where: { id: user.id },
      data: {
        stripe_account_id: accountId,
        stripe_connected: false
      }
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/settings/payments?connect=refresh&processor=stripe`,
    return_url: `${origin}/settings/payments?connect=success&processor=stripe`,
    type: 'account_onboarding'
  });

  if (siteId) {
    await recordProcessorConnection({
      siteId,
      userId: user.id,
      processor: 'stripe',
      accountId,
      setDefault: true,
      stripeChargesEnabled: false,
      metadata: { connected_via: 'account_link' },
      applyTo
    });
  }

  return { url: accountLink.url, accountId };
}
