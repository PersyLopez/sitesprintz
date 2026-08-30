import { describe, it, expect } from 'vitest';
import {
  getSiteDisplayName,
  getSiteNiche,
  getPublishedSiteUrl,
  getSiteWorkspacePaths,
  normalizeSiteRecord,
} from '../../src/utils/siteWorkspace';

describe('siteWorkspace helpers', () => {
  it('normalizes API site payloads', () => {
    const site = normalizeSiteRecord({
      site: {
        id: 'abc',
        templateId: 'salon',
        data: { businessName: 'River Salon', settings: { payOnSite: true } },
      },
    });

    expect(site.id).toBe('abc');
    expect(site.businessName).toBe('River Salon');
    expect(site.templateId).toBe('salon');
    expect(site.payOnSite).toBe(true);
    expect(site.site_data.businessName).toBe('River Salon');
  });

  it('falls back to Untitled Site', () => {
    expect(getSiteDisplayName({ id: '1' })).toBe('Untitled Site');
  });

  it('resolves known niches from template ids', () => {
    expect(getSiteNiche({ templateId: 'restaurant-casual' })).toBe('restaurant');
    expect(getSiteNiche({ template: 'salon' })).toBe('salon');
  });

  it('builds per-site dashboard paths', () => {
    const paths = getSiteWorkspacePaths('site-9', { subdomain: 'river-salon' });
    expect(paths.overview).toBe('/dashboard/sites/site-9');
    expect(paths.orders).toBe('/dashboard/sites/site-9/orders');
    expect(paths.appointments).toBe('/dashboard/sites/site-9/appointments');
    expect(paths.settings).toBe('/dashboard/sites/site-9/settings');
    expect(paths.liveEdit).toBe('/view/river-salon?edit=true');
    expect(paths.edit).toBe('/setup?site=site-9');
  });

  it('builds a same-origin published site path when VITE_API_URL is empty', () => {
    expect(getPublishedSiteUrl(null)).toBeNull();
    expect(getPublishedSiteUrl('river-salon')).toMatch(/\/view\/river-salon$/);
  });
});
