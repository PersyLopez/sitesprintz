/**
 * Dual-write JWT cookies alongside JSON bodies.
 * httpOnly cookies are the launch path; JSON tokens stay for current clients.
 */

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };
}

export function getAccessTokenCookieName() {
  return ACCESS_COOKIE;
}

export function getRefreshTokenCookieName() {
  return REFRESH_COOKIE;
}

export function setAuthCookies(res, { accessToken, refreshToken } = {}) {
  if (!res || typeof res.cookie !== 'function') return;

  if (accessToken) {
    res.cookie(ACCESS_COOKIE, accessToken, {
      ...cookieBase(),
      maxAge: ACCESS_MAX_AGE_MS
    });
  }

  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...cookieBase(),
      maxAge: REFRESH_MAX_AGE_MS
    });
  }
}

export function clearAuthCookies(res) {
  if (!res || typeof res.clearCookie !== 'function') return;
  const base = cookieBase();
  res.clearCookie(ACCESS_COOKIE, { path: base.path });
  res.clearCookie(REFRESH_COOKIE, { path: base.path });
}

export function readRefreshToken(req) {
  const fromBody = req?.body?.refreshToken;
  if (typeof fromBody === 'string' && fromBody) return fromBody;
  const fromCookie = req?.cookies?.[REFRESH_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie) return fromCookie;
  return null;
}
