/**
 * Public asset cache headers
 *
 * Vite fingerprints live under /assets/<name>-<hash>.<ext>; the origin tells
 * caches those are immutable. Marketing HTML shells stay revalidated so
 * deploys are picked up. Everything else returns null and keeps the existing
 * default headers.
 */

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const REVALIDATE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

// Vite fingerprint shape: <name>-<hash>.<ext> with a hash of at least 8 chars
// that is not an all-lowercase word (must contain an uppercase letter, a
// digit, or an underscore — e.g. safeRedirect-DoR8ubSF.js, not
// hero-placeholder.jpg).
const FINGERPRINTED_BASENAME = /-([A-Za-z0-9_-]{8,})\.[A-Za-z0-9]+$/;
const HASH_REQUIRED_CHAR = /[A-Z0-9_]/;
const FINGERPRINT_HASH_GROUP = 1;

/**
 * Cache-Control for a static asset URL or filesystem path, or null to keep
 * the existing default headers.
 *
 * Only direct children of an `assets` directory qualify, and the published
 * `/sites/` document family is excluded (it has its own cache headers).
 *
 * @param {string} filePath - URL path or filesystem path of the asset
 * @returns {string|null} Cache-Control value, or null
 */
export function publicAssetCacheHeader(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return null;
  }
  const segments = filePath.split(/[\\/]/);
  if (segments.includes('sites')) {
    return null;
  }
  if (segments.length < 2 || segments[segments.length - 2] !== 'assets') {
    return null;
  }
  const match = FINGERPRINTED_BASENAME.exec(segments[segments.length - 1]);
  if (!match || !HASH_REQUIRED_CHAR.test(match[FINGERPRINT_HASH_GROUP])) {
    return null;
  }
  return IMMUTABLE_CACHE_CONTROL;
}

/**
 * Cache-Control for a marketing HTML shell document, or null to keep the
 * existing default headers. Callers serving a resolved view subdomain keep
 * their own no-store and must not overwrite it with this value.
 *
 * @param {string} shellName - basename of the shell document
 * @returns {string|null} Cache-Control value, or null
 */
export function marketingHtmlCacheHeader(shellName) {
  if (shellName === 'index.html' || shellName === 'view.html') {
    return REVALIDATE_CACHE_CONTROL;
  }
  return null;
}