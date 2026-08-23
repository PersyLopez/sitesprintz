import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildCorsOptions } from '../../../server/config/cors.js';

describe('CORS configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...process.env };
    delete process.env.NODE_ENV;
    delete process.env.CORS_ORIGINS;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.CLIENT_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.SITE_URL;
    delete process.env.BASE_URL;
    delete process.env.RAILWAY_PUBLIC_DOMAIN;
    delete process.env.RAILWAY_STATIC_URL;
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

    it('allows SITE_URL even when CORS_ORIGINS is stale', () => {
      process.env.CORS_ORIGINS = 'https://web-production-85d41.up.railway.app';
      process.env.SITE_URL = 'https://sitesprintz-production.up.railway.app';
      const opts = buildCorsOptions(process.env);
      const callback = opts.origin;

      callback('https://sitesprintz-production.up.railway.app', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });

    it('allows the Railway public hostname without a scheme', () => {
      process.env.CORS_ORIGINS = 'https://sitesprintz-production.up.railway.app';
      process.env.RAILWAY_PUBLIC_DOMAIN = 'sitesprintz.com';
      const opts = buildCorsOptions(process.env);
      const callback = opts.origin;

      callback('https://sitesprintz.com', (err, allowed) => {
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