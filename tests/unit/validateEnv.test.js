import { describe, it, expect } from 'vitest';
import { collectEnvIssues } from '../../server/config/validateEnv.js';

const baseProductionEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a-secure-production-jwt-secret-value',
  ADMIN_TOKEN: 'secure-admin-token-value',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  GOOGLE_CALLBACK_URL: 'https://sitesprintz.com/auth/google/callback',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_GROWTH: 'price_growth',
  STRIPE_PRICE_STARTER: 'price_starter',
};

describe('collectEnvIssues', () => {
  it('allows sk_test_ in production beta mode', () => {
    const { errors } = collectEnvIssues({
      ...baseProductionEnv,
      BETA_MODE: 'true',
      STRIPE_SECRET_KEY: 'sk_test_abc123',
    });

    expect(errors).toEqual([]);
  });

  it('rejects sk_test_ in production without beta', () => {
    const { errors } = collectEnvIssues({
      ...baseProductionEnv,
      BETA_MODE: 'false',
      STRIPE_SECRET_KEY: 'sk_test_abc123',
    });

    expect(errors.some((e) => e.includes('STRIPE_SECRET_KEY'))).toBe(true);
  });

  it('still errors when JWT_SECRET is missing in beta', () => {
    const { errors } = collectEnvIssues({
      ...baseProductionEnv,
      BETA_MODE: 'true',
      JWT_SECRET: 'dev-secret-key-change-in-production',
      STRIPE_SECRET_KEY: 'sk_test_abc123',
    });

    expect(errors.some((e) => e.includes('JWT_SECRET'))).toBe(true);
  });

  it('warns on live stripe key during beta', () => {
    const { warnings } = collectEnvIssues({
      ...baseProductionEnv,
      BETA_MODE: 'true',
      STRIPE_SECRET_KEY: 'sk_live_abc123',
    });

    expect(warnings.some((w) => w.includes('live key during closed beta'))).toBe(true);
  });
});
