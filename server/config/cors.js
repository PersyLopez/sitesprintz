/**
 * CORS configuration factory.
 *
 * In production, CORS_ORIGINS (or legacy ALLOWED_ORIGINS) is required and only those origins are allowed.
 * In development, localhost ports are allowed even without explicit config.
 * Same-origin (no Origin header) requests are always allowed.
 */

export function buildCorsOptions(env = process.env) {
  const configuredOrigins = `${env.CORS_ORIGINS || ''},${env.ALLOWED_ORIGINS || ''}`
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  const allowedOrigins = env.NODE_ENV === 'production'
    ? configuredOrigins
    : configuredOrigins;

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
