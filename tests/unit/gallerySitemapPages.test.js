/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import GalleryService from '../../server/services/galleryService.js';
import { showcaseSitemapService } from '../../server/services/showcaseSitemapService.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listAllPublicSites', () => {
  it('keeps reading after the gallery page cap', async () => {
    const service = new GalleryService();
    const full = Array.from({ length: 50 }, (_, index) => ({ subdomain: `a${index}` }));
    const tail = [{ subdomain: 'tail' }];
    vi.spyOn(service, 'getPublicSites')
      .mockResolvedValueOnce({ sites: full, total: 51, pageSize: 50 })
      .mockResolvedValueOnce({ sites: tail, total: 51, pageSize: 50 });

    const sites = await service.listAllPublicSites();

    expect(sites.map((site) => site.subdomain)).toEqual([...full.map((site) => site.subdomain), 'tail']);
    expect(service.getPublicSites).toHaveBeenCalledTimes(2);
    expect(service.getPublicSites.mock.calls[0][0]).toEqual(expect.objectContaining({
      page: 1,
      pageSize: 50,
    }));
    expect(service.getPublicSites.mock.calls[1][0].page).toBe(2);
  });

  it('stops when the first page is short', async () => {
    const service = new GalleryService();
    vi.spyOn(service, 'getPublicSites').mockResolvedValue({
      sites: [{ subdomain: 'only' }],
      total: 1,
      pageSize: 50,
    });

    const sites = await service.listAllPublicSites();

    expect(sites).toHaveLength(1);
    expect(service.getPublicSites).toHaveBeenCalledTimes(1);
  });
});

describe('generateSitemapEntries', () => {
  it('includes a public shop past the first gallery page', async () => {
    const shops = [
      ...Array.from({ length: 50 }, (_, index) => ({
        subdomain: `shop-${index}`,
        updated_at: '2026-10-01T00:00:00.000Z',
        site_data: {},
      })),
      {
        subdomain: 'shop-50',
        updated_at: '2026-10-01T00:00:00.000Z',
        site_data: {},
      },
    ];
    vi.spyOn(GalleryService.prototype, 'listAllPublicSites').mockResolvedValue(shops);

    const entries = await showcaseSitemapService.generateSitemapEntries('https://rightsitelight.com');

    expect(entries[0].url).toBe('https://rightsitelight.com/showcase');
    expect(entries.some((entry) => entry.url === 'https://rightsitelight.com/showcase/shop-50')).toBe(true);
    expect(entries).toHaveLength(52);
  });
});
