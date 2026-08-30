import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../database/db.js', () => ({
  prisma: {
    sites: { findFirst: vi.fn() },
    users: { findUnique: vi.fn() },
    booking_tenants: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../../database/db.js';
import TenantService from '../../../server/services/booking/TenantService.js';

describe('TenantService adopt after claim', () => {
  const service = new TenantService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('takes over the previous owner tenant instead of seeding My Business', async () => {
    const orphan = {
      id: 'tenant-old',
      user_id: 'admin-1',
      business_name: 'Plants & Threads',
      site_id: 'site-claimed',
      status: 'active',
    };
    const adopted = { ...orphan, user_id: 'user-1' };

    prisma.booking_tenants.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(orphan);
    prisma.sites.findFirst.mockResolvedValueOnce({ id: 'site-claimed' });
    prisma.booking_tenants.update.mockResolvedValueOnce(adopted);

    const result = await service.getOrCreateTenant('user-1', 'site-claimed');

    expect(result).toEqual(adopted);
    expect(prisma.booking_tenants.update).toHaveBeenCalledWith({
      where: { id: 'tenant-old' },
      data: { user_id: 'user-1' },
    });
    expect(prisma.booking_tenants.create).not.toHaveBeenCalled();
  });
});
