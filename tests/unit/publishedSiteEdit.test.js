import { describe, it, expect } from 'vitest';
import { canEditPublishedSite } from '../../server/services/publishedSiteEdit.js';

describe('canEditPublishedSite', () => {
  const site = { user_id: 'owner-1' };

  it('allows the site owner', () => {
    expect(canEditPublishedSite(site, { id: 'owner-1' })).toBe(true);
  });

  it('allows admin who is not the owner', () => {
    expect(canEditPublishedSite(site, { id: 'admin-1', role: 'admin' })).toBe(true);
  });

  it('denies a different signed-in user', () => {
    expect(canEditPublishedSite(site, { id: 'other-1', role: 'user' })).toBe(false);
  });

  it('denies when user is missing', () => {
    expect(canEditPublishedSite(site, null)).toBe(false);
    expect(canEditPublishedSite(site, {})).toBe(false);
  });

  it('denies when site is missing', () => {
    expect(canEditPublishedSite(null, { id: 'owner-1' })).toBe(false);
  });
});
