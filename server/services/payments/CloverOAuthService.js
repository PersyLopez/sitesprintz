/**
 * Clover OAuth v2 (high-trust). Merchants authorize the platform app.
 * SiteSprintz stores the expiring access token and never asks for a pasted key.
 */

import crypto from 'crypto';
import { getRedis } from '../../utils/redis.js';
import { recordProcessorConnection } from './processorConnectHelpers.js';
import { cloverConfigured, cloverHosts } from './cloverHosts.js';

export function generateCloverStateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function initiateCloverOAuth(siteId, userId, redirectUri, applyTo = 'site') {
  if (!cloverConfigured()) {
    throw new Error('Clover not configured');
  }
  if (!redirectUri) {
    throw new Error('Clover not configured');
  }

  const state = generateCloverStateToken();
  const redis = getRedis();
  await redis.setex(
    `clover_oauth_state:${state}`,
    600,
    JSON.stringify({ userId, siteId, applyTo })
  );

  const { authorize } = cloverHosts();
  const authorizeUrl = `${authorize}/oauth/v2/authorize?` +
    `client_id=${encodeURIComponent(process.env.CLOVER_APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&state=${state}`;

  return { authorizeUrl, state };
}

/**
 * @param {string} code
 * @param {string} state
 * @param {string} merchantId - Clover appends merchant_id on the callback
 */
export async function handleCloverCallback(code, state, merchantId) {
  if (!code || !state) {
    throw new Error('Authorization code and state required');
  }
  if (!merchantId) {
    throw new Error('Failed to connect Clover account: missing merchant');
  }

  const redis = getRedis();
  const stateData = await redis.get(`clover_oauth_state:${state}`);
  if (!stateData) {
    throw new Error('Invalid or expired state token');
  }

  const { userId, siteId, applyTo } = JSON.parse(stateData);
  const { api } = cloverHosts();

  try {
    const tokenResponse = await fetch(`${api}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.CLOVER_APP_ID,
        client_secret: process.env.CLOVER_APP_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to connect Clover account');
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to connect Clover account');
    }

    await recordProcessorConnection({
      siteId,
      userId,
      processor: 'clover',
      accountId: String(merchantId),
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: unixSecondsToDate(tokenData.access_token_expiration),
      metadata: {
        refresh_token_expiration: tokenData.refresh_token_expiration || null,
      },
      applyTo,
    });

    return { siteId, merchantId: String(merchantId) };
  } finally {
    await redis.del(`clover_oauth_state:${state}`);
  }
}

export function unixSecondsToDate(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

/**
 * Refresh an expiring Clover access token. Caller persists the new pair.
 * @param {string} refreshToken
 */
export async function refreshCloverAccessToken(refreshToken) {
  if (!refreshToken || !cloverConfigured()) {
    throw new Error('Clover not configured');
  }
  const { api } = cloverHosts();
  const response = await fetch(`${api}/oauth/v2/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.CLOVER_APP_ID,
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to refresh Clover token');
  }
  const tokenData = await response.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to refresh Clover token');
  }
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || refreshToken,
    expiresAt: unixSecondsToDate(tokenData.access_token_expiration),
  };
}
