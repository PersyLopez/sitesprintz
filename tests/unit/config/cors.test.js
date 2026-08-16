import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildCorsOptions } from '../../../server/config/cors.js';

describe('CORS configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...process.env };
    delete process.env.NODE_ENV;
    delete process.env.CORS_ORIGINS;
    delete process.env.ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('rejects origins not in CORS_ORIGINS', () => {
      process.env.CORS_ORIGINS = 'https://sitesprintz.com';
      const opts = buildCorsOptions(process.env);
      const callback = opts.origin;

      // Unknown origin should be rejected
      callback('https://evil.com', (err, allowed) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('origin not allowed');
      });
    });

    it('allows origins listed in CORS_ORIGINS', () => {
      process.env.CORS_ORIGINS = 'https://sitesprintz.com,https://www.sitesprintz.com';
      const opts = buildCorsOptions(process.env);
      const callback = opts.origin;

      callback('https://sitesprintz.com', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });

    it('allows origins listed in ALLOWED_ORIGINS when CORS_ORIGINS is unset', () => {
      process.env.ALLOWED_ORIGINS = 'https://sitesprintz.com';
      const opts = buildCorsOptions(process.env);
      const callback = opts.origin;

      callback('https://sitesprintz.com', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });

    it('allows same-origin (no origin header)', () => {
      process.env.CORS_ORIGINS = 'https://sitesprintz.com';
      const opts = buildCorsOptions(process.env);
      const callback = opts.origin;

      callback(null, (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });
  });

  describe('development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('allows localhost origins without CORS_ORIGINS set', () => {
      const opts = buildCorsOptions(process.env);
      const callback = opts.origin;

      callback('http://localhost:5173', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });

    it('rejects non-loopback origins', () => {
      const opts = buildCorsOptions(process.env);
      const callback = opts.origin;

      callback('https://attacker.com', (err, allowed) => {
        expect(err).toBeInstanceOf(Error);
      });
    });
  });
});