import crypto from 'crypto';

export const CLAIM_TOKEN_BYTES = 32;
export const CLAIM_TTL_DAYS = 14;

export function generateClaimToken() {
  return crypto.randomBytes(CLAIM_TOKEN_BYTES).toString('hex');
}

export function hashClaimToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

export function claimExpiryDate(from = new Date()) {
  return new Date(from.getTime() + CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isClaimExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function isClaimTokenShape(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

/** Raw token from a same-origin /claim/:token path, or null. */
export function claimTokenFromPath(path) {
  if (!path || typeof path !== 'string') return null;
  const pathname = path.trim().split('?')[0];
  const match = pathname.match(/^\/claim\/([a-f0-9]{64})$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Constant-time compare of two hex hashes. Length mismatch returns false
 * after a dummy compare so timing does not leak hash presence.
 */
export function hashesEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (a.length !== b.length) {
    const dummy = Buffer.alloc(a.length || 32);
    crypto.timingSafeEqual(a.length ? a : dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function publicAppOrigin() {
  return process.env.SITE_URL || process.env.BASE_URL || 'http://localhost:5173';
}

export function buildClaimUrl(token) {
  const origin = publicAppOrigin().replace(/\/$/, '');
  return `${origin}/claim/${token}`;
}
