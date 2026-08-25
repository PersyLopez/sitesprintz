import { describe, it, expect } from 'vitest';
import { AGENT_TESTERS, TEST_USERS, getTestUser } from '../fixtures/test-credentials.js';

describe('agent tester accounts', () => {
  it('includes gallery, owner, and admin logins agents already use', () => {
    const emails = AGENT_TESTERS.map((user) => user.email);
    expect(emails).toEqual(expect.arrayContaining([
      'gallery@sitesprintz.com',
      'test@example.com',
      'admin@example.com',
      'growth@example.com',
      'starter@example.com',
    ]));
  });

  it('uses passwords that meet signup rules', () => {
    for (const user of AGENT_TESTERS) {
      expect(user.password.length).toBeGreaterThanOrEqual(12);
      expect(user.password).toMatch(/[A-Z]/);
      expect(user.password).toMatch(/[a-z]/);
      expect(user.password).toMatch(/\d/);
      expect(user.password).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('exposes gallery credentials for mantest login', () => {
    expect(getTestUser('GALLERY')).toEqual(TEST_USERS.GALLERY);
    expect(TEST_USERS.GALLERY.password).toBe('GalleryDemo123!');
  });
});
