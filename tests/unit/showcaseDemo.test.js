import { describe, it, expect } from 'vitest';
import {
  isShowcaseExampleSubdomain,
  isShowcaseExampleSite,
  buildShowcaseExampleWhere,
  buildShowcaseKindWhere,
} from '../../server/utils/showcaseDemo.js';

describe('showcaseDemo kind helpers', () => {
  describe('isShowcaseExampleSubdomain', () => {
    it('matches gallery-* subdomains', () => {
      expect(isShowcaseExampleSubdomain('gallery-salon')).toBe(true);
      expect(isShowcaseExampleSubdomain('gallery-restaurant')).toBe(true);
    });

    it('does not match client subdomains', () => {
      expect(isShowcaseExampleSubdomain('my-salon')).toBe(false);
      expect(isShowcaseExampleSubdomain('public-showcase-123')).toBe(false);
    });
  });

  describe('isShowcaseExampleSite', () => {
    it('treats gallery-* as examples even without demoMode', () => {
      expect(isShowcaseExampleSite({ subdomain: 'gallery-gym', site_data: {} })).toBe(true);
    });

    it('treats demoMode true as examples', () => {
      expect(
        isShowcaseExampleSite({
          subdomain: 'real-client',
          site_data: { settings: { demoMode: true } },
        })
      ).toBe(true);
    });

    it('treats normal published clients as non-examples', () => {
      expect(
        isShowcaseExampleSite({
          subdomain: 'real-client',
          site_data: { settings: { demoMode: false } },
        })
      ).toBe(false);
    });
  });

  describe('buildShowcaseKindWhere', () => {
    it('returns empty object for default/all kind', () => {
      expect(buildShowcaseKindWhere()).toEqual({});
      expect(buildShowcaseKindWhere('all')).toEqual({});
      expect(buildShowcaseKindWhere('unknown')).toEqual({});
    });

    it('returns example OR filter for examples', () => {
      expect(buildShowcaseKindWhere('examples')).toEqual(buildShowcaseExampleWhere());
    });

    it('returns NOT example filter for clients', () => {
      expect(buildShowcaseKindWhere('clients')).toEqual({
        NOT: buildShowcaseExampleWhere(),
      });
    });
  });
});
