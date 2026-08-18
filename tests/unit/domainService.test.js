import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainService } from '../../server/services/domainService.js';

function createDb(site) {
  return {
    sites: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    _site: site,
  };
}

describe('DomainService', () => {
  let db;
  const site = {
    id: 'site-1',
    subdomain: 'maria-stand',
    user_id: 'user-1',
    custom_domain: null,
  };

  beforeEach(() => {
    db = createDb(site);
  });

  it('stores a normalized domain for any owner', async () => {
    db.sites.findFirst
      .mockResolvedValueOnce(site)
      .mockResolvedValueOnce(null);
    db.sites.update.mockResolvedValue({
      ...site,
      custom_domain: 'my-shop.com',
      custom_domain_status: 'pending',
    });
    const service = new DomainService(db);

    const result = await service.addCustomDomain('maria-stand', 'https://WWW.My-Shop.com/menu', 'user-1');

    expect(result.domain).toBe('my-shop.com');
    expect(result.hasDomain).toBe(true);
    expect(db.sites.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ custom_domain: 'my-shop.com', custom_domain_status: 'pending' }),
    }));
    expect(result.instructions.cname.value).toBe('maria-stand.sitesprintz.com');
  });

  it('rejects platform hosts and invalid names', async () => {
    const service = new DomainService(db);
    await expect(service.addCustomDomain('maria-stand', 'localhost', 'user-1')).rejects.toThrow('Invalid domain format');
    await expect(service.addCustomDomain('maria-stand', 'sitesprintz.com', 'user-1')).rejects.toThrow('Invalid domain format');
  });

  it('rejects a domain already used by another site', async () => {
    db.sites.findFirst
      .mockResolvedValueOnce(site)
      .mockResolvedValueOnce({ id: 'other', custom_domain: 'my-shop.com' });
    const service = new DomainService(db);
    await expect(service.addCustomDomain('maria-stand', 'my-shop.com', 'user-1'))
      .rejects.toThrow('already in use');
  });

  it('verifies when www CNAME points at the site host', async () => {
    db.sites.findUnique.mockResolvedValue({
      ...site,
      custom_domain: 'my-shop.com',
    });
    db.sites.update.mockResolvedValue({});
    const resolveCname = vi.fn(async (name) => {
      if (name === 'www.my-shop.com') return ['maria-stand.sitesprintz.com.'];
      throw new Error('ENOTFOUND');
    });
    const service = new DomainService(db, { resolveCname, resolve4: vi.fn() });
    const result = await service.verifyDNS('maria-stand');
    expect(result.verified).toBe(true);
    expect(result.cnameVerified).toBe(true);
    expect(result.status).toBe('verified');
  });

  it('stays pending when DNS does not match', async () => {
    db.sites.findUnique.mockResolvedValue({
      ...site,
      custom_domain: 'my-shop.com',
    });
    db.sites.update.mockResolvedValue({});
    const service = new DomainService(db, {
      resolveCname: vi.fn().mockRejectedValue(new Error('ENOTFOUND')),
      resolve4: vi.fn().mockRejectedValue(new Error('ENOTFOUND')),
    });
    const result = await service.verifyDNS('maria-stand');
    expect(result.verified).toBe(false);
    expect(result.status).toBe('pending');
  });

  it('looks up a published public site by Host', async () => {
    db.sites.findFirst.mockResolvedValue({
      id: 'site-1',
      subdomain: 'maria-stand',
      custom_domain: 'my-shop.com',
      custom_domain_status: 'verified',
    });
    const service = new DomainService(db);
    const found = await service.lookupByHost('www.my-shop.com');
    expect(found.subdomain).toBe('maria-stand');
    expect(db.sites.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'published',
        is_public: true,
      }),
    }));
  });

  it('does not resolve platform hosts', async () => {
    const service = new DomainService(db);
    expect(await service.lookupByHost('localhost')).toBeNull();
    expect(await service.lookupByHost('sitesprintz.com')).toBeNull();
    expect(db.sites.findFirst).not.toHaveBeenCalled();
  });
});
