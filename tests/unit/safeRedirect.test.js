/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getSafeRedirect, stashOAuthRedirect, takeOAuthRedirect } from '../../src/utils/safeRedirect.js';

describe('safeRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('accepts same-origin claim paths', () => {
    expect(getSafeRedirect('/claim/abc')).toBe('/claim/abc');
    expect(getSafeRedirect('https://evil.example/claim')).toBeNull();
  });

  it('stashes and consumes a Google return path once', () => {
    stashOAuthRedirect('/claim/token');
    expect(takeOAuthRedirect()).toBe('/claim/token');
    expect(takeOAuthRedirect()).toBeNull();
  });
});
