/**
 * CORS configuration factory.
 *
 * In production, CORS_ORIGINS (or legacy ALLOWED_ORIGINS) is required and only those origins are allowed.
 * SITE_URL / CLIENT_URL / BASE_URL / Railway public host are also allowed so a stale
 * CORS_ORIGINS list cannot lock the live app out of its own API.
 * In development, localhost ports are allowed even without explicit config.
 * Same-origin (no Origin header) requests are always allowed.
 */

function originFromEnvValue(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('.railway.internal')) return '';
  try {
    if (trimmed.includes('://')) {
      const parsed = new URL(trimmed);
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    return '';
  }
  if (/^[a-z0-9.-]+$/i.test(trimmed) && trimmed.includes('.')) {
    return `https://${trimmed}`;
  }
  return '';
}

export function collectAllowedOrigins(env = process.env) {
  const listed = `${env.CORS_ORIGINS || ''},${env.ALLOWED_ORIGINS || ''}`
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => originFromEnvValue(origin) || origin);

  const implied = [
    env.CLIENT_URL,
    env.FRONTEND_URL,
    env.SITE_URL,
    env.BASE_URL,
    env.RAILWAY_PUBLIC_DOMAIN,
    env.RAILWAY_STATIC_URL,
  ].map(originFromEnvValue);

  return [...new Set([...listed, ...implied].filter(Boolean))];
}

export function buildCorsOptions(env = process.env) {
  const allowedOrigins = collectAllowedOrigins(env);

  if (env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS is required in production');
  }

  return {
    origin(origin, callback) {
      // Allow same-origin (server-to-server, no Origin header)
      if (!origin) return callback(null, true);

      // In development, allow common localhost origins
      if (env.NODE_ENV !== 'production') {
        const isLocal =
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://[::1]:') ||
          origin.includes('.local') ||
          origin.includes('ngrok');
        if (isLocal) return callback(null, true);
      }

      // Check configured origins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Reject
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Draft-Access-Token']
  };
}
