/**
 * Safe redaction utilities for sensitive data in logs and debug output.
 *
 * Every value redacted:
 *   - shorter than or equal to 8 chars: replace completely with [REDACTED]
 *   - longer than 8 chars: show first 4 + … + last 4 prefix/suffix
 *
 * Sensitive object keys are matched case-insensitively:
 *   token, secret, password, key, session, auth, cookie, csrf, jwt, refresh
 */

const SENSITIVE_KEY_PATTERN =
  /(^|[-_.]|\b)(auth(orization)?|cookie|token|secret|pass(word|wd)|pwd|key|session|csrf|jwt|refresh)(\b|[-_.]|[A-Z])/i;

/** Redact a single value. */
export function redactValue(value) {
  if (value === null || value === undefined) return value;

  // Ensure we redact strings only
  const text = typeof value === 'string' ? value : String(value);

  if (text.length <= 8) {
    return '[REDACTED]';
  }

  return `${text.slice(0, 4)}\u2026${text.slice(-4)} [REDACTED]`;
}

/** Recursively redact sensitive keys in a plain object. */
export function redactObject(input) {
  if (!input || typeof input !== 'object') return input;

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return [key, redactValue(value)];
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return [key, redactObject(value)];
      }
      return [key, value];
    })
  );
}
