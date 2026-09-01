import { describe, it, expect } from 'vitest';
import {
  isSafeLaborEmail,
  sanitizeLaborTopic,
  laborDisplayVars,
  laborInquiryMailto,
} from '../../src/utils/laborInquiryMailto.js';
import { PRICING_CONFIG } from '../../src/config/pricing.config.js';

describe('laborInquiryMailto', () => {
  it('accepts the configured contact address', () => {
    expect(isSafeLaborEmail(PRICING_CONFIG.labor.contactEmail)).toBe(true);
  });

  it('rejects javascript and header-injection emails', () => {
    expect(isSafeLaborEmail('javascript:alert(1)')).toBe(false);
    expect(isSafeLaborEmail('hello@sitesprintz.com%0aBcc:x@evil.com')).toBe(false);
    expect(isSafeLaborEmail('')).toBe(false);
  });

  it('allowlists inquiry topics', () => {
    expect(sanitizeLaborTopic('build on request')).toBe('build on request');
    expect(sanitizeLaborTopic('GROWTH MANAGED')).toBe('growth managed');
    expect(sanitizeLaborTopic('UNIQUE LOOK')).toBe('unique look');
    expect(sanitizeLaborTopic('setup offer')).toBe('setup offer');
    expect(sanitizeLaborTopic('http://evil.example/x')).toBe('optional extras');
  });

  it('encodes mailto without the current URL or tokens', () => {
    const href = laborInquiryMailto('unique look');
    expect(href).toMatch(/^mailto:support@rightsitelight\.com\?/);
    expect(href).toContain('unique%20look');
    expect(href).not.toContain('claim');
    expect(href).not.toContain('Bearer');
  });

  it('returns catalog dollars when finite', () => {
    expect(laborDisplayVars()).toEqual({
      care: 75,
      extra: 39,
      brand: 99,
      look: 250,
      batches: 2,
    });
    expect(laborDisplayVars({ managedCare: { price: 'nope' } })).toBeNull();
    expect(laborDisplayVars({
      ...PRICING_CONFIG.labor,
      managedCare: { ...PRICING_CONFIG.labor.managedCare, price: 49 },
    }).care).toBe(75);
  });
});
