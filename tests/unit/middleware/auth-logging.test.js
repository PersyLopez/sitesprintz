import { describe, it, expect, vi, afterEach } from 'vitest';
import { requireAuth } from '../../../server/middleware/auth.js';

describe('auth middleware logging', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not log raw bearer tokens on auth errors', async () => {
    const rawToken = 'raw.jwt.token-value-that-must-not-appear';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = {
      headers: { authorization: `Bearer ${rawToken}` },
      get: vi.fn()
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    // Check that the raw token does not appear in any error log
    for (const call of errorSpy.mock.calls) {
      const logged = JSON.stringify(call);
      expect(logged).not.toContain(rawToken);
    }
  });
});