import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { unusableGooglePasswordHash } from '../../auth-google.js';

describe('unusableGooglePasswordHash', () => {
  it('returns a bcrypt hash so Google signup satisfies users.password_hash', async () => {
    const hash = await unusableGooglePasswordHash();

    expect(hash).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    expect(await bcrypt.compare('any-password', hash)).toBe(false);
  });
});
