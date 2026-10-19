/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../../database/db.js';
import GalleryService from '../../server/services/galleryService.js';

describe('getPublicSites live trial filter', () => {
  const previousCollect = process.env.PLATFORM_COLLECT_PAYMENTS;

  beforeEach(() => {
    prisma.sites.findMany.mockResolvedValue([]);
    prisma.sites.count = vi.fn().mockResolvedValue(0);
  });

  afterEach(() => {
    if (previousCollect === undefined) delete process.env.PLATFORM_COLLECT_PAYMENTS;
    else process.env.PLATFORM_COLLECT_PAYMENTS = previousCollect;
  });

  it('asks the sitemap query to skip a lapsed trial while billing is open', async () => {
    process.env.PLATFORM_COLLECT_PAYMENTS = 'true';
    const service = new GalleryService();

    await service.getPublicSites({ page: 1, pageSize: 50 });

    const where = prisma.sites.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('published');
    expect(where.is_public).toBe(true);
    expect(where.AND[0].OR).toEqual(expect.arrayContaining([
      { expires_at: null },
    ]));
  });

  it('does not add the trial filter while billing is closed', async () => {
    process.env.PLATFORM_COLLECT_PAYMENTS = 'false';
    const service = new GalleryService();

    await service.getPublicSites({ page: 1, pageSize: 50 });

    const where = prisma.sites.findMany.mock.calls[0][0].where;
    expect(where.AND).toBeUndefined();
  });
});
