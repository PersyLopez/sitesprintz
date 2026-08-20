/**
 * Closed-beta runtime flags (BETA_MODE=true, NODE_ENV stays production).
 */

function resolveEnv(env) {
  return env || process.env;
}

export function isBetaMode(env = process.env) {
  return resolveEnv(env).BETA_MODE === 'true';
}

export function betaAllowsPublicSignups(env = process.env) {
  if (!isBetaMode(env)) {
    return true;
  }
  return resolveEnv(env).BETA_ALLOW_SIGNUPS !== 'false';
}

/**
 * @param {string | undefined} key
 * @returns {'live' | 'test' | 'missing' | 'invalid'}
 */
export function stripeKeyMode(key) {
  if (!key || typeof key !== 'string') {
    return 'missing';
  }
  if (key.startsWith('sk_live_')) {
    return 'live';
  }
  if (key.startsWith('sk_test_')) {
    return 'test';
  }
  return 'invalid';
}
