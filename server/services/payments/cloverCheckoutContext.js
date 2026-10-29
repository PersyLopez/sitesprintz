/**
 * Cart and booking payloads for a Clover Hosted Checkout session.
 * Clover does not echo our metadata on the payment, so fulfillment reads this.
 * Sessions expire in 15 minutes; keep the payload a day so a late webhook can fulfill.
 */

import { getRedis } from '../../utils/redis.js';

const TTL_SECONDS = 60 * 60 * 24;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

export function isCloverSessionId(sessionId) {
  return typeof sessionId === 'string' && SESSION_ID_PATTERN.test(sessionId);
}

function contextKey(sessionId) {
  return `clover_checkout:${sessionId}`;
}

function claimKey(sessionId) {
  return `clover_fulfill:${sessionId}`;
}

export async function saveCloverCheckoutContext(sessionId, payload) {
  if (!isCloverSessionId(sessionId)) return;
  const redis = getRedis();
  await redis.setex(contextKey(sessionId), TTL_SECONDS, JSON.stringify(payload));
}

/**
 * One fulfillment per checkout session. Returns true only for the caller that claimed it.
 * Fail closed when the store cannot express an atomic create.
 */
export async function claimCloverFulfillment(sessionId) {
  if (!isCloverSessionId(sessionId)) return false;
  const redis = getRedis();
  const key = claimKey(sessionId);
  if (typeof redis.setnx !== 'function') return false;
  const created = await redis.setnx(key, '1');
  if (!created) return false;
  if (typeof redis.expire === 'function') {
    await redis.expire(key, TTL_SECONDS);
  }
  return true;
}

export async function releaseCloverFulfillment(sessionId) {
  if (!isCloverSessionId(sessionId)) return;
  const redis = getRedis();
  await redis.del(claimKey(sessionId));
}

export async function loadCloverCheckoutContext(sessionId) {
  if (!isCloverSessionId(sessionId)) return null;
  const redis = getRedis();
  const raw = await redis.get(contextKey(sessionId));
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}
