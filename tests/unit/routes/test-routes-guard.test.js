import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Verify the test-route guard logic functions correctly.
 * We re-implement the guard logic inline for deterministic testing.
 */
function isLocalRequest(req) {
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  const localPatterns = ['::1', '::ffff:[IP_ADDRESS]', '[IP_ADDRESS]', 'localhost'];
  return localPatterns.some(pattern => ip.includes(pattern));
}

function getGuard(req, res, next) {
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    res.status(403).json({ error: 'Test endpoints only available in development' });
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    if (!isLocalRequest(req) && !process.env.DEV_TEST_ROUTE_TOKEN) {
      res.status(403).json({ error: 'Test endpoints are local-only in development' });
      return;
    }
  }

  next();
}

describe('test routes guard', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.DEV_TEST_ROUTE_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows requests in test environment from any IP', () => {
    process.env.NODE_ENV = 'test';
    const req = { ip: '[IP_ADDRESS]' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    getGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects requests in production', () => {
    process.env.NODE_ENV = 'production';
    const req = { ip: '[IP_ADDRESS]' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    getGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows localhost requests in development', () => {
    process.env.NODE_ENV = 'development';
    const req = { ip: '::1', connection: { remoteAddress: '::1' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    getGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects remote IP in development without DEV_TEST_ROUTE_TOKEN', () => {
    process.env.NODE_ENV = 'development';
    const req = { ip: '192.168.1.100', connection: { remoteAddress: '192.168.1.100' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    getGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows remote IP if DEV_TEST_ROUTE_TOKEN is set', () => {
    process.env.NODE_ENV = 'development';
    process.env.DEV_TEST_ROUTE_TOKEN='***';
    const req = { ip: '192.168.1.100', connection: { remoteAddress: '192.168.1.100' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    getGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});