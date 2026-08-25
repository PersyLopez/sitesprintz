const CLAIM_PATH = /\/claim\/[a-f0-9]{32,}/gi;
const JWT_SHAPE = /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;

/**
 * Strip secrets before any labor email or ops log. Claim links are secrets.
 * @param {string} [text]
 * @returns {string}
 */
export function redactLaborSecrets(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return '';
  }
  return text
    .replace(CLAIM_PATH, '/claim/[redacted]')
    .replace(JWT_SHAPE, '[redacted-token]')
    .replace(BEARER, 'Bearer [redacted]')
    .slice(0, 4000);
}
