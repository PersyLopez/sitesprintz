import { describe, it, expect, vi } from 'vitest';
import { csrfProtection } from '../../../server/middleware/csrf.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe('CSRF public visitor skip', () => {
  it('allows POST /api/submissions/contact without session or token', () => {
    const req = {
      method: 'POST',
      path: '/api/submissions/contact',
      cookies: {},
      headers: {},
    };
    const res = mockRes();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows POST /api/booking/tenants/:userId/appointments without session or token', () => {
    const req = {
      method: 'POST',
      path: '/api/booking/tenants/ca7f2960-bcf7-451c-95de-d2eba3cdb2e4/appointments',
      cookies: {},
      headers: {},
    };
    const res = mockRes();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('still rejects other POSTs without session', () => {
    const req = {
      method: 'POST',
      path: '/api/drafts',
      cookies: {},
      headers: {},
    };
    const res = mockRes();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CSRF_INVALID' })
    );
  });
});
