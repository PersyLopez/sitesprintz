/**
 * Allow only same-origin relative paths (e.g. /claim/abc).
 */
export function getSafeRedirect(value) {
  if (!value || typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//') || path.includes('\\')) return null;
  if (path.includes('://')) return null;
  return path;
}

const OAUTH_REDIRECT_KEY = 'oauthRedirect';

/** Stash a post-Google return path (claim links, etc.). */
export function stashOAuthRedirect(value) {
  if (typeof sessionStorage === 'undefined') return;
  const path = getSafeRedirect(value);
  if (path) {
    sessionStorage.setItem(OAUTH_REDIRECT_KEY, path);
  } else {
    sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
  }
}

/** Read and clear the stashed post-Google return path. */
export function takeOAuthRedirect() {
  if (typeof sessionStorage === 'undefined') return null;
  const path = getSafeRedirect(sessionStorage.getItem(OAUTH_REDIRECT_KEY));
  sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
  return path;
}
