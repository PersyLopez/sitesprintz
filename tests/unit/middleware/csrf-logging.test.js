import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { csrfProtection } from '../../../server/middleware/csrf.js';

describe('CSRF middleware logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('does not write cookies to debug log', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const req = {
      method: 'POST',
      path: '/api/drafts',
      cookies: { sessionId: 'abc123', csrfToken: 'super-secret-csrf' },
      headers: {
        'x-csrf-token': 'should-not-leak',
        'cookie': 'sessionId=abc123',
        'authorization': 'Bearer some-jwt-token'
      },
      get: vi.fn()
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    csrfProtection(req, res, next);

    // The function should not crash even without CSRF_DEBUG env
    // This is the default path - cookies/headers should not appear in console
    for (const spy of [warnSpy, logSpy, console.error]) {
      for (const call of spy.mock.calls) {
        const text = JSON.stringify(call);
        expect(text).not.toContain('sessionId=abc123');
        expect(text).not.toContain('super-secret-csrf');
        expect(text).not.toContain('some-jwt-token');
      }
    }
  });
});