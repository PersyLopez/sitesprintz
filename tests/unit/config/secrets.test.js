import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRequiredSecret } from '../../../server/config/secrets.js';

describe('getRequiredSecret', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Start with a clean slate for the secrets being tested
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ADMIN_TOKEN;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when a required secret is missing outside test fallback', () => {
    process.env.NODE_ENV = 'production';
    expect(() => getRequiredSecret('JWT_SECRET')).toThrow('JWT_SECRET is required');
  });

  it('allows explicit test fallback only in test environment', () => {
    process.env.NODE_ENV = 'test';
    const result = getRequiredSecret('JWT_SECRET', { allowTestFallback: true });
    expect(result).toContain('test-only');
    expect(result).toContain('jwt');
  });

  it('returns the env value when present', () => {
    process.env.NODE_ENV = 'production';
    process.env.MY_KEY = 'real-value';
    expect(getRequiredSecret('MY_KEY')).toBe('real-value');
  });

  it('does not allow test fallback in production even when flag is set', () => {
    process.env.NODE_ENV = 'production';
    expect(() => getRequiredSecret('JWT_SECRET', { allowTestFallback: true })).toThrow(
      'JWT_SECRET is required'
    );
  });

  it('does not allow fallback by default in test', () => {
    process.env.NODE_ENV = 'test';
    expect(() => getRequiredSecret('JWT_SECRET')).toThrow('JWT_SECRET is required');
  });
});