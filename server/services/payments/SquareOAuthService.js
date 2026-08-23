/**
 * Square OAuth Service
 * 
 * Handles Square OAuth connection flow with CSRF protection.
 */

import crypto from 'crypto';
import squarePkg from 'square';
const { Client, Environment } = squarePkg;
import { getRedis } from '../../utils/redis.js';
import { recordProcessorConnection } from './processorConnectHelpers.js';

/**
 * Generate cryptographically secure state token for OAuth CSRF protection
 * @returns {string} 64-character hex string (32 bytes)
 */
export function generateStateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Initiate Square OAuth flow
 * @param {string} siteId - Site ID
 * @param {string} userId - User ID
 * @returns {Promise<{authorizeUrl: string, state: string}>}
 */
export async function initiateSquareOAuth(siteId, userId, redirectUri, applyTo = 'site') {
  if (!process.env.SQUARE_APPLICATION_ID || !process.env.SQUARE_APPLICATION_SECRET) {
    throw new Error('Square not configured');
  }

  // Generate state token for CSRF protection
  const state = generateStateToken();
  
  // Store state in Redis with 10-minute expiration
  const redis = getRedis();
  await redis.setex(
    `square_oauth_state:${state}`,
    600, // 10 minutes
    JSON.stringify({
      userId,
      siteId,
      applyTo
    })
  );

  // Build authorize URL
  const scopes = 'PAYMENTS_READ PAYMENTS_WRITE MERCHANT_PROFILE_READ';
  let authorizeUrl = `https://connect.squareup.com/oauth2/authorize?` +
    `client_id=${process.env.SQUARE_APPLICATION_ID}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&session=false` +
    `&state=${state}`;

  const callbackUri = redirectUri || process.env.SQUARE_REDIRECT_URL;
  if (callbackUri) {
    authorizeUrl += `&redirect_uri=${encodeURIComponent(callbackUri)}`;
  }

  return { authorizeUrl, state };
}

/**
 * Handle Square OAuth callback
 * @param {string} code - Authorization code from Square
 * @param {string} state - State token from OAuth flow
 * @returns {Promise<{siteId: string, merchantId: string}>}
 */
export async function handleSquareCallback(code, state) {
  if (!code || !state) {
    throw new Error('Authorization code and state required');
  }

  // Verify state token
  const redis = getRedis();
  const stateData = await redis.get(`square_oauth_state:${state}`);
  
  if (!stateData) {
    throw new Error('Invalid or expired state token');
  }

  const { userId, siteId, applyTo } = JSON.parse(stateData);

  // Exchange authorization code for access token
  const tokenResponse = await fetch('https://connect.squareup.com/oauth2/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18'
    },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_APPLICATION_SECRET,
      code,
      grant_type: 'authorization_code'
    })
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json().catch(() => ({ message: 'Token exchange failed' }));
    throw new Error(`Failed to connect Square account: ${error.message}`);
  }

  const tokenData = await tokenResponse.json();

  try {
    const activeLocations = await listActiveSquareLocations(tokenData.access_token);
    if (activeLocations.length === 0) {
      throw new Error(
        'Square needs an active location. Add one in Square Dashboard, then reconnect.'
      );
    }

    const defaultLocation = activeLocations[0];

    await recordProcessorConnection({
      siteId,
      userId,
      processor: 'square',
      accountId: tokenData.merchant_id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_at,
      metadata: {
        location_id: defaultLocation.id,
        location_ids: activeLocations.map((loc) => ({ id: loc.id, name: loc.name }))
      },
      applyTo
    });

    return {
      siteId,
      merchantId: tokenData.merchant_id
    };
  } finally {
    await redis.del(`square_oauth_state:${state}`);
  }
}

function isActiveSquareLocation(location) {
  if (!location?.id) return false;
  const status = location.status ? String(location.status).toUpperCase() : 'ACTIVE';
  return status === 'ACTIVE';
}

async function listActiveSquareLocations(accessToken) {
  try {
    const squareClient = new Client({
      accessToken,
      environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox
    });

    const locationsResponse = await squareClient.locationsApi.listLocations();
    const locations = locationsResponse.result?.locations || [];
    return locations.filter(isActiveSquareLocation);
  } catch {
    return [];
  }
}

