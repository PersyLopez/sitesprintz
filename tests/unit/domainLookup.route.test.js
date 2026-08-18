import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const lookupByHost = vi.hoisted(() => vi.fn());

vi.mock('../../database/db.js', () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    sites: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../../server/services/domainService.js', () => ({
  domainService: { lookupByHost },
  DomainService: class {},
}));

import { domainPublicRouter } from '../../server/routes/domain.routes.js';

function createApp() {
  const app = express();
  app.use('/api/domain', domainPublicRouter);
  return app;
}

describe('GET /api/domain/lookup', () => {
  beforeEach(() => {
    lookupByHost.mockReset();
  });

  it('returns the published site subdomain for a connected host', async () => {
    lookupByHost.mockResolvedValue({
      subdomain: 'maria-stand',
      custom_domain: 'my-shop.com',
      custom_domain_status: 'verified',
    });

    const response = await request(createApp()).get('/api/domain/lookup').query({ host: 'www.my-shop.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.subdomain).toBe('maria-stand');
    expect(response.body.domain).toBe('my-shop.com');
    expect(lookupByHost).toHaveBeenCalledWith('www.my-shop.com');
  });

  it('returns 404 when the host is not connected to a published site', async () => {
    lookupByHost.mockResolvedValue(null);

    const response = await request(createApp()).get('/api/domain/lookup').query({ host: 'unknown.test' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
