import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  CLAIM_TTL_DAYS,
  claimExpiryDate,
  generateClaimToken,
  hashClaimToken,
  hashesEqual,
  isClaimExpired,
  isClaimTokenShape,
  claimTokenFromPath,
} from '../../server/services/claimTokenService.js';

describe('claim token', () => {
  it('generates a 32-byte hex token and hashes with sha256', () => {
    const token = generateClaimToken();
    expect(token).toHaveLength(64);
    expect(isClaimTokenShape(token)).toBe(true);
    expect(hashClaimToken(token)).toBe(
      crypto.createHash('sha256').update(token, 'utf8').digest('hex')
    );
    expect(hashClaimToken(token)).not.toBe(token);
  });

  it('compares hashes in constant time', () => {
    const hash = hashClaimToken('a'.repeat(64));
    expect(hashesEqual(hash, hash)).toBe(true);
    expect(hashesEqual(hash, hashClaimToken('b'.repeat(64)))).toBe(false);
    expect(hashesEqual(hash, 'short')).toBe(false);
  });

  it('expires after 14 days', () => {
    const now = new Date('2026-08-17T12:00:00.000Z');
    const expires = claimExpiryDate(now);
    expect(CLAIM_TTL_DAYS).toBe(14);
    expect(expires.getTime() - now.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
    expect(isClaimExpired(expires, now)).toBe(false);
    expect(isClaimExpired(expires, new Date(expires.getTime() + 1))).toBe(true);
    expect(isClaimExpired(null, now)).toBe(true);
  });

  it('reads a live claim token from a redirect path', () => {
    const token = 'ab'.repeat(32);
    expect(claimTokenFromPath(`/claim/${token}`)).toBe(token);
    expect(claimTokenFromPath(`/claim/${token}?x=1`)).toBe(token);
    expect(claimTokenFromPath('/dashboard')).toBeNull();
  });
});
