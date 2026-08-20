import { describe, it, expect } from 'vitest';
import { isBetaMode, betaAllowsPublicSignups, stripeKeyMode } from '../../server/config/betaMode.js';

describe('betaMode', () => {
  it('isBetaMode is true only when BETA_MODE=true', () => {
    expect(isBetaMode({ BETA_MODE: 'true' })).toBe(true);
    expect(isBetaMode({ BETA_MODE: 'false' })).toBe(false);
    expect(isBetaMode({})).toBe(false);
  });

  it('betaAllowsPublicSignups defaults open in beta', () => {
    expect(betaAllowsPublicSignups({ BETA_MODE: 'true' })).toBe(true);
    expect(betaAllowsPublicSignups({ BETA_MODE: 'true', BETA_ALLOW_SIGNUPS: 'false' })).toBe(false);
  });

  it('betaAllowsPublicSignups is always true outside beta', () => {
    expect(betaAllowsPublicSignups({ BETA_MODE: 'false', BETA_ALLOW_SIGNUPS: 'false' })).toBe(true);
  });

  it('stripeKeyMode classifies keys', () => {
    expect(stripeKeyMode('sk_test_abc')).toBe('test');
    expect(stripeKeyMode('sk_live_abc')).toBe('live');
    expect(stripeKeyMode('')).toBe('missing');
    expect(stripeKeyMode('pk_test_abc')).toBe('invalid');
  });
});
