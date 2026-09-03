import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductCatalogService } from '../../server/services/ProductCatalogService.js';
import { prisma } from '../../database/db.js';

vi.mock('../../database/db.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    sites: {
      update: vi.fn()
    }
  }
}));

describe('ProductCatalogService site catalog stock', () => {
  let service;
  let tx;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductCatalogService();
    tx = {
      $queryRaw: vi.fn(),
      sites: {
        update: vi.fn().mockResolvedValue({ id: 'site-1' })
      }
    };
  });

  it('skips unlimited stock when decrementing', async () => {
    tx.$queryRaw.mockResolvedValue([{
      id: 'site-1',
      site_data: {
        products: [{ id: 'soup', name: 'Soup', price: 8 }]
      }
    }]);

    await service.decrementSiteCatalog('site-1', [{ productId: 'soup', quantity: 2 }], tx);

    expect(tx.sites.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'site-1' },
      data: expect.objectContaining({
        site_data: {
          products: [{ id: 'soup', name: 'Soup', price: 8 }]
        }
      })
    }));
  });

  it('decrements the last unit from 1 to 0', async () => {
    tx.$queryRaw.mockResolvedValue([{
      id: 'site-1',
      site_data: {
        products: [{ id: 'bread', name: 'Bread', price: 3, stock: 1 }]
      }
    }]);

    await service.decrementSiteCatalog('site-1', [{ productId: 'bread', quantity: 1 }], tx);

    expect(tx.sites.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        site_data: {
          products: [{ id: 'bread', name: 'Bread', price: 3, stock: 0 }]
        }
      })
    }));
  });

  it('throws when stock is insufficient', async () => {
    tx.$queryRaw.mockResolvedValue([{
      id: 'site-1',
      site_data: {
        products: [{ id: 'muffin', name: 'Muffin', price: 4, stock: 1 }]
      }
    }]);

    await expect(
      service.decrementSiteCatalog('site-1', [{ productId: 'muffin', quantity: 2 }], tx)
    ).rejects.toThrow('Insufficient stock for Muffin. Available: 1, Requested: 2');

    expect(tx.sites.update).not.toHaveBeenCalled();
  });

  it('restocks limited products', async () => {
    tx.$queryRaw.mockResolvedValue([{
      id: 'site-1',
      site_data: {
        products: [{ id: 'tea', name: 'Tea', price: 2, stock: 0 }]
      }
    }]);

    await service.restockSiteCatalog('site-1', [{ id: 'tea', quantity: 3 }], tx);

    expect(tx.sites.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        site_data: {
          products: [{ id: 'tea', name: 'Tea', price: 2, stock: 3 }]
        }
      })
    }));
  });

  it('matches pay-on-site synthetic ids when site_data products have no id', async () => {
    tx.$queryRaw.mockResolvedValue([{
      id: 'plants-and-threads',
      site_data: {
        products: [{ name: 'Hanging basket', price: '$25' }]
      }
    }]);

    await service.decrementSiteCatalog(
      'plants-and-threads',
      [{ productId: 'hanging-basket-0', quantity: 1 }],
      tx
    );

    expect(tx.sites.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        site_data: {
          products: [{ name: 'Hanging basket', price: '$25' }]
        }
      })
    }));
  });

  it('uses prisma.$transaction when tx is not provided', async () => {
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    tx.$queryRaw.mockResolvedValue([{
      id: 'site-1',
      site_data: { products: [{ id: 'soup', name: 'Soup', price: 8, stock: 5 }] }
    }]);

    await service.decrementSiteCatalog('site-1', [{ productId: 'soup', quantity: 1 }]);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.sites.update).toHaveBeenCalled();
  });

  it('prefers denormalized order.items string productId over null order_items.product_id', () => {
    const items = service.extractSiteCatalogItemsFromOrder({
      order_items: [{ product_id: null, quantity: 2 }],
      items: JSON.stringify([{ productId: 'bread', quantity: 2 }])
    });
    expect(items).toEqual([{ productId: 'bread', quantity: 2 }]);
  });
});
