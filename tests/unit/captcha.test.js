import { describe, it, expect } from 'vitest';
import { getTurnstileSiteKey } from '../../server/utils/captcha.js';

describe('getTurnstileSiteKey', () => {
  it('prefers the Vite-prefixed public key', () => {
    expect(getTurnstileSiteKey({
      VITE_TURNSTILE_SITE_KEY: ' 0xvite ',
      TURNSTILE_SITE_KEY: '0xother',
    })).toBe('0xvite');
  });

  it('returns null when unset', () => {
    expect(getTurnstileSiteKey({})).toBeNull();
  });
});
