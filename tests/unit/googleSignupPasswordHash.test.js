import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { googleSignupUserData, unusableGooglePasswordHash } from '../../auth-google.js';

describe('unusableGooglePasswordHash', () => {
  it('returns a bcrypt hash so Google signup satisfies users.password_hash', async () => {
    const hash = await unusableGooglePasswordHash();

    expect(hash).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    expect(await bcrypt.compare('any-password', hash)).toBe(false);
  });
});

describe('googleSignupUserData', () => {
  it('only uses columns that exist on prisma users', async () => {
    const data = await googleSignupUserData({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'google-user@example.com',
      googleId: 'gid-1',
      picture: 'https://example.com/p.png'
    });

    expect(data).toEqual(expect.objectContaining({
      email: 'google-user@example.com',
      google_id: 'gid-1',
      picture: 'https://example.com/p.png',
      role: 'user',
      status: 'active',
      email_verified: true
    }));
    expect(data.password_hash).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    expect(data).not.toHaveProperty('name');
    expect(data).not.toHaveProperty('auth_provider');
    expect(data).not.toHaveProperty('trial_expires_at');
  });
});
