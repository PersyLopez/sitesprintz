/**
 * Google OAuth CSRF state: random nonce stored server-side.
 * Plan and intent stay out of the query string.
 */

import crypto from 'crypto';
import { getRedis } from '../../utils/redis.js';
import { paidPlanFromQuery } from '../../../src/config/tiers.js';

const STATE_TTL_SECONDS = 600;
const KEY_PREFIX = 'google_oauth_state:';

function normalizePlan(plan) {
  if (typeof plan !== 'string') return 'free';
  const paid = paidPlanFromQuery(plan);
  if (paid) return paid;
  const normalized = plan.trim().toLowerCase();
  return normalized === 'free' || normalized === 'trial' ? normalized : 'free';
}

function normalizeIntent(intent) {
  if (typeof intent !== 'string') return null;
  const trimmed = intent.trim().slice(0, 64);
  return trimmed || null;
}

export function generateOAuthNonce() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createGoogleOAuthState({ plan, intent } = {}) {
  const nonce = generateOAuthNonce();
  const payload = {
    plan: normalizePlan(plan),
    intent: normalizeIntent(intent)
  };

  const redis = getRedis();
  if (redis?.setex) {
    await redis.setex(`${KEY_PREFIX}${nonce}`, STATE_TTL_SECONDS, JSON.stringify(payload));
  }

  return nonce;
}

export async function consumeGoogleOAuthState(state) {
  const empty = { plan: 'free', intent: null };
  if (!state || typeof state !== 'string' || state.includes(',') || state.includes(':')) {
    return empty;
  }

  const redis = getRedis();
  if (!redis?.get) return empty;

  const key = `${KEY_PREFIX}${state}`;
  const raw = await redis.get(key);
  if (redis.del) {
    await redis.del(key);
  }

  if (!raw) return empty;

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      plan: normalizePlan(parsed.plan),
      intent: normalizeIntent(parsed.intent)
    };
  } catch {
    return empty;
  }
}
