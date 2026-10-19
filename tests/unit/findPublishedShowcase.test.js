/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../../database/db.js';
import { findPublishedShowcase } from '../../server/routes/showcase.routes.js';

function publishedRow(overrides = {}) {
  return {
    id: 'site-1',
    subdomain: 'oak-anchor',
    template_id: 'salon',
    status: 'published',
    plan: 'trial',
    expires_at: new Date('2026-01-01T00:00:00Z'),
    site_data: { brand: { name: 'Oak & Anchor' } },
    user_id: 'user-1',
    created_at: new Date('2025-12-01T00:00:00Z'),
    users: {
      stripe_connected: false,
      stripe_account_id: null,
      stripe_subscription_id: null,
      subscription_status: null,
    },
    ...overrides,
  };
}

describe('findPublishedShowcase live trial', () => {
  const previousCollect = process.env.PLATFORM_COLLECT_PAYMENTS;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (previousCollect === undefined) delete process.env.PLATFORM_COLLECT_PAYMENTS;
    else process.env.PLATFORM_COLLECT_PAYMENTS = previousCollect;
  });

  it('does not serve a lapsed trial while billing is open', async () => {
    process.env.PLATFORM_COLLECT_PAYMENTS = 'true';
    prisma.sites.findFirst.mockResolvedValue(publishedRow());

    await expect(findPublishedShowcase('oak-anchor')).resolves.toBeNull();
  });

  it('keeps a lapsed trial public while billing is closed', async () => {
    process.env.PLATFORM_COLLECT_PAYMENTS = 'false';
    prisma.sites.findFirst.mockResolvedValue(publishedRow());

    const site = await findPublishedShowcase('oak-anchor');

    expect(site?.subdomain).toBe('oak-anchor');
    expect(site?.name).toBe('Oak & Anchor');
  });

  it('keeps a paid shop public after the trial date', async () => {
    process.env.PLATFORM_COLLECT_PAYMENTS = 'true';
    prisma.sites.findFirst.mockResolvedValue(publishedRow({ plan: 'growth' }));

    const site = await findPublishedShowcase('oak-anchor');

    expect(site?.plan).toBe('growth');
  });
});
