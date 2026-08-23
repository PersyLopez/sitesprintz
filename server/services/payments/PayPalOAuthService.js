/**
 * PayPal OAuth — merchants connect their own PayPal account.
 * SiteSprintz never collects PayPal passwords, client secrets, or KYC documents.
 */

import crypto from 'crypto';
import { getRedis } from '../../utils/redis.js';
import { recordProcessorConnection } from './processorConnectHelpers.js';

const STATE_TTL_SECONDS = 600;
const PAYPAL_BUSINESS_TYPES = new Set(['BUSINESS', 'PREMIER', 'BUSINESS_ACCOUNT']);
export const PAYPAL_NOT_BUSINESS_MESSAGE =
  'PayPal checkout needs a Business account. Upgrade to PayPal Business, then reconnect.';

function paypalAccountType(profile) {
  const raw = profile?.account_type
    || profile?.accountType
    || profile?.payer?.account_type
    || profile?.['https://uri.paypal.com/webapps/auth/schema/payer/account_type'];
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

export function isPayPalBusinessAccount(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const type = paypalAccountType(profile);
  if (!type) return false;
  return PAYPAL_BUSINESS_TYPES.has(type);
}

function paypalAuthBase() {
  return process.env.NODE_ENV === 'production'
    ? 'https://www.paypal.com'
    : 'https://www.sandbox.paypal.com';
}

function paypalApiBase() {
  return process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export function generateStateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function isPayPalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export async function initiatePayPalOAuth(siteId, userId, redirectUri, applyTo = 'site') {
  if (!isPayPalConfigured()) {
    throw new Error('PayPal not configured');
  }
  if (!redirectUri) {
    throw new Error('PayPal redirect URI required');
  }

  const state = generateStateToken();
  const redis = getRedis();
  await redis.setex(
    `paypal_oauth_state:${state}`,
    STATE_TTL_SECONDS,
    JSON.stringify({ userId, siteId, redirectUri, applyTo })
  );

  const scopes = [
    'openid',
    'email',
    'https://uri.paypal.com/services/paypalattributes'
  ].join(' ');

  const authorizeUrl =
    `${paypalAuthBase()}/signin/authorize?` +
    `client_id=${encodeURIComponent(process.env.PAYPAL_CLIENT_ID)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  return { authorizeUrl, state };
}

export async function handlePayPalCallback(code, state) {
  if (!code || !state) {
    throw new Error('Authorization code and state required');
  }

  const redis = getRedis();
  const stateData = await redis.get(`paypal_oauth_state:${state}`);
  if (!stateData) {
    throw new Error('Invalid or expired state token');
  }

  const { userId, siteId, redirectUri, applyTo } = JSON.parse(stateData);

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const tokenResponse = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }).toString()
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to connect PayPal account');
  }

  const tokenData = await tokenResponse.json();

  try {
    const userInfoResponse = await fetch(
      `${paypalApiBase()}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error(PAYPAL_NOT_BUSINESS_MESSAGE);
    }

    const profile = await userInfoResponse.json();
    if (!isPayPalBusinessAccount(profile)) {
      throw new Error(PAYPAL_NOT_BUSINESS_MESSAGE);
    }

    const merchantId = profile.payer_id || profile.user_id || tokenData.payer_id;
    if (!merchantId) {
      throw new Error(PAYPAL_NOT_BUSINESS_MESSAGE);
    }

    const email = profile.email || profile.emails?.[0]?.value || null;

    await recordProcessorConnection({
      siteId,
      userId,
      processor: 'paypal',
      accountId: merchantId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
      metadata: {
        email,
        account_type: paypalAccountType(profile),
        token_type: tokenData.token_type || 'Bearer'
      },
      applyTo
    });

    return { siteId, merchantId };
  } finally {
    await redis.del(`paypal_oauth_state:${state}`);
  }
}
