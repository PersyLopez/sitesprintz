import { describe, it, expect } from 'vitest';
import {
  hostLookupCandidates,
  isPlatformHostname,
  isValidCustomDomain,
  normalizeHostname,
} from '../../src/utils/customDomainHost.js';

describe('customDomainHost', () => {
  it('normalizes urls, www, and case', () => {
    expect(normalizeHostname('https://WWW.Example.COM/path')).toBe('example.com');
    expect(normalizeHostname('example.com.')).toBe('example.com');
    expect(normalizeHostname('example.com:443')).toBe('example.com');
  });

  it('rejects platform and invalid hosts as custom domains', () => {
    expect(isValidCustomDomain('localhost')).toBe(false);
    expect(isValidCustomDomain('not-a-domain')).toBe(false);
    expect(isValidCustomDomain('my-shop.com')).toBe(true);
    expect(isPlatformHostname('localhost')).toBe(true);
    expect(isPlatformHostname('www.sitesprintz.com')).toBe(true);
    expect(isPlatformHostname('my-shop.com')).toBe(false);
  });

  it('builds lookup candidates for www and apex', () => {
    expect(hostLookupCandidates('www.my-shop.com')).toContain('my-shop.com');
    expect(hostLookupCandidates('my-shop.com')).toContain('www.my-shop.com');
  });
});
