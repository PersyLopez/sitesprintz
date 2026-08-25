import { describe, it, expect } from 'vitest';
import { isTrialingStatus } from '../../src/config/tiers.js';

describe('isTrialingStatus', () => {
  it('treats local trial and Stripe trialing as in-progress', () => {
    expect(isTrialingStatus('trial')).toBe(true);
    expect(isTrialingStatus('trialing')).toBe(true);
    expect(isTrialingStatus('active')).toBe(false);
    expect(isTrialingStatus(null)).toBe(false);
  });
});
