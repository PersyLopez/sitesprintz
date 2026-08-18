import { describe, it, expect, vi } from 'vitest';
import {
  setAuthCookies,
  clearAuthCookies,
  readRefreshToken,
  getAccessTokenCookieName,
  getRefreshTokenCookieName
} from '../../server/utils/authCookies.js';

describe('auth cookies', () => {
  it('sets httpOnly access and refresh cookies', () => {
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn()
    };

    setAuthCookies(res, { accessToken: 'access', refreshToken: 'refresh' });

    expect(res.cookie).toHaveBeenCalledWith(
      getAccessTokenCookieName(),
      'access',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      getRefreshTokenCookieName(),
      'refresh',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    );
  });

  it('reads refresh token from cookie when the body is empty', () => {
    const req = {
      body: {},
      cookies: { [getRefreshTokenCookieName()]: 'cookie-refresh' }
    };
    expect(readRefreshToken(req)).toBe('cookie-refresh');
  });

  it('prefers body refresh token over cookie', () => {
    const req = {
      body: { refreshToken: 'body-refresh' },
      cookies: { [getRefreshTokenCookieName()]: 'cookie-refresh' }
    };
    expect(readRefreshToken(req)).toBe('body-refresh');
  });

  it('clears both auth cookies on logout', () => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    clearAuthCookies(res);
    expect(res.clearCookie).toHaveBeenCalledWith(getAccessTokenCookieName(), { path: '/' });
    expect(res.clearCookie).toHaveBeenCalledWith(getRefreshTokenCookieName(), { path: '/' });
  });
});
