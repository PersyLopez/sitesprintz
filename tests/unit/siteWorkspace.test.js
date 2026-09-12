import { describe, it, expect } from 'vitest';
import {
  getSiteDisplayName,
  getSiteNiche,
  getPublishedSiteUrl,
  getAbsolutePublishedSiteUrl,
  getSiteWorkspacePaths,
  readLastWorkspaceSite,
  rememberLastWorkspaceSite,
  normalizeSiteRecord,
  resolveOwnerPostLoginPath,
  withShareTracking,
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

  it('keeps the platform absolute URL without customDomain', () => {
    expect(getAbsolutePublishedSiteUrl('river-salon')).toMatch(/\/view\/river-salon$/);
  });

  it('prefers a valid custom domain host for the absolute live URL', () => {
    expect(getAbsolutePublishedSiteUrl('river-salon', { customDomain: 'Shop.Example.com' }))
      .toBe('https://shop.example.com');
  });

  it('ignores an invalid custom domain and keeps the platform URL', () => {
    expect(getAbsolutePublishedSiteUrl('river-salon', { customDomain: 'not-a-domain' }))
      .toMatch(/\/view\/river-salon$/);
  });

  it('adds print QR tracking params', () => {
    const tracked = withShareTracking('https://shop.example.com', { source: 'qr', medium: 'print' });
    const parsed = new URL(tracked);
    expect(parsed.searchParams.get('utm_source')).toBe('qr');
    expect(parsed.searchParams.get('utm_medium')).toBe('print');
  });

  it('remembers the last workspace site per user', () => {
    rememberLastWorkspaceSite('user-1', 'site-9');
    expect(readLastWorkspaceSite('user-1')).toBe('site-9');
    expect(readLastWorkspaceSite('user-2')).toBeNull();
  });

  it.each([
    [{ sites: [] }, '/dashboard'],
    [{ sites: [{ id: 'site-1' }] }, '/dashboard/sites/site-1'],
    [
      { sites: [{ id: 'site-1' }, { id: 'site-2' }], lastSiteId: 'site-2' },
      '/dashboard/sites/site-2',
    ],
    [{ sites: [{ id: 'site-1' }, { id: 'site-2' }] }, '/dashboard'],
    [{ sites: [{ id: 'site-1' }], role: 'admin' }, '/admin'],
    [{ sites: [{ id: 'site-1' }], safeRedirect: '/settings?tab=profile' }, '/settings?tab=profile'],
    [{ sites: [{ id: 'site-1' }], safeRedirect: 'https://example.com' }, '/dashboard/sites/site-1'],
  ])('resolves owner post-login paths: %s', (input, expected) => {
    expect(resolveOwnerPostLoginPath(input)).toBe(expected);
  });
});
