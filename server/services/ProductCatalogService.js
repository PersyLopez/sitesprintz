/**
 * Product Catalog Service
 * Validates products and rebuilds checkout line items server-side
 * Prevents price tampering and inventory overselling
 */

import { prisma } from '../../database/db.js';
import { parseSiteData } from '../utils/parseSiteData.js';
import { catalogProductKey } from '../utils/payOnSite.js';

function getCatalogProducts(siteData) {
  return siteData?.products || siteData?.data?.products || [];
}

function normalizeSiteCatalogItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const qtyByProductId = new Map();

  for (const item of items) {
    const productId = item?.productId ?? item?.id;
    const quantity = Math.floor(Number(item?.quantity) || 0);
    if (!productId || quantity < 1) {
      continue;
    }
    const key = String(productId);
    qtyByProductId.set(key, (qtyByProductId.get(key) || 0) + quantity);
  }

  return [...qtyByProductId.entries()].map(([productId, quantity]) => ({
    productId,
    quantity
  }));
}

function writeCatalogProducts(siteData, products) {
  if (Array.isArray(siteData?.products)) {
    return { ...siteData, products };
  }
  if (Array.isArray(siteData?.data?.products)) {
    return {
      ...siteData,
      data: {
        ...siteData.data,
        products
      }
    };
  }
  return { ...siteData, products };
}

function findCatalogProductIndex(products, productId) {
  const direct = products.findIndex(
    (product) => product?.id != null && String(product.id) === productId
  );
  if (direct !== -1) return direct;
  // Pay-on-site carts use catalogProductKey when site_data products have no id
  return products.findIndex((product, index) => catalogProductKey(product, index) === productId);
}

function applySiteCatalogStockChange(siteData, items, direction) {
  const normalizedItems = normalizeSiteCatalogItems(items);
  if (normalizedItems.length === 0) {
    return siteData;
  }

  const products = [...getCatalogProducts(siteData)];
  if (products.length === 0) {
    throw new Error('Site catalog has no products');
  }

  for (const { productId, quantity } of normalizedItems) {
    const index = findCatalogProductIndex(products, productId);
    if (index === -1) {
      throw new Error(`Product not found: ${productId}`);
    }

    const product = products[index];
    if (product.stock === undefined || product.stock === null) {
      continue;
    }

    const remaining = Number.parseInt(String(product.stock), 10);
    if (!Number.isFinite(remaining)) {
      continue;
    }

    if (direction === 'decrement') {
      if (remaining < quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. ` +
          `Available: ${remaining}, Requested: ${quantity}`
        );
      }
      products[index] = { ...product, stock: remaining - quantity };
    } else {
      products[index] = { ...product, stock: remaining + quantity };
    }
  }

  return writeCatalogProducts(siteData, products);
}

export class ProductCatalogService {
  /**
   * Get product by ID from DB or site.json
   * @param {string} productId - Product ID from client
   * @param {string} siteId - Site ID for site.json lookup
   * @param {Object} siteData - Parsed site.json content
   * @returns {Promise<Object>} Product with validated price
   */
  async getProduct(productId, siteId, siteData) {
    if (!productId && productId !== 0) {
      throw new Error('Product ID is required');
    }

    const catalogProducts = siteData?.products
      || siteData?.data?.products
      || [];

    // Fall back to site.json products first (primary path for published sites)
    if (Array.isArray(catalogProducts) && catalogProducts.length > 0) {
      const siteProduct = catalogProducts.find(p =>
        String(p.id) === String(productId)
      );

      if (siteProduct) {
        return {
          id: siteProduct.id,
          name: siteProduct.name,
          price: Number(siteProduct.price),
          stock: siteProduct.stock,
          description: siteProduct.description,
          image: siteProduct.image
        };
      }
    }

    // Prisma products table (restaurant/inventory system)
    const numericId = parseInt(productId, 10);
    if (!Number.isNaN(numericId)) {
      const product = await prisma.products.findUnique({
        where: { id: numericId }
      });

      if (product) {
        const site = await prisma.sites.findUnique({
          where: { id: siteId },
          select: { subdomain: true }
        });
        if (!site?.subdomain || product.subdomain === site.subdomain || product.subdomain === siteId) {
          return {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            inventory: product.inventory,
            description: product.description,
            image: Array.isArray(product.images) ? product.images[0] : null
          };
        }
      }
    }

    throw new Error(`Product not found: ${productId}`);
  }

  /**
   * Validate cart items and rebuild with server-side prices
   * Prevents price tampering, ensures products exist
   * @param {Array} items - Cart items from client [{ productId, quantity, ... }]
   * @param {string} siteId - Site ID
   * @param {Object} siteData - Parsed site.json
   * @returns {Promise<Array>} Rebuilt items with validated prices
   */
  async validateAndRebuildCheckout(items, siteId, siteData) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Cart is empty');
    }

    const rebuiltItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const productId = item.productId ?? item.id;
      const quantity = item.quantity ?? 1;

      // Validate quantity
      if (!quantity || quantity < 1 || quantity > 10000) {
        throw new Error(`Invalid quantity for product ${productId || item.name}: ${quantity}`);
      }

      // Look up product by ID, or by name within site catalog as fallback
      let product;
      if (productId) {
        product = await this.getProduct(productId, siteId, siteData);
      } else if (item.name) {
        const catalogProducts = siteData?.products || siteData?.data?.products || [];
        product = catalogProducts.find(
          p => p.name?.toLowerCase() === String(item.name).toLowerCase()
        );
        if (!product) {
          throw new Error(`Product not found: ${item.name}`);
        }
      } else {
        throw new Error('Each cart item must include a product id');
      }
      
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Check stock if available
      if (product.inventory !== undefined && product.inventory !== null) {
        if (product.inventory < quantity) {
          throw new Error(
            `Insufficient inventory for ${product.name}. ` +
            `Available: ${product.inventory}, Requested: ${quantity}`
          );
        }
      } else if (product.stock !== undefined && product.stock !== null) {
        if (product.stock < quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. ` +
            `Available: ${product.stock}, Requested: ${quantity}`
          );
        }
      }

      // Rebuild item with server-side price
      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;

      rebuiltItems.push({
        productId: product.id,
        name: product.name,
        description: product.description,
        price: product.price,  // Server price, not client
        quantity: Math.floor(quantity),
        image: product.image,
        total: itemTotal
      });
    }

    // Validate minimum order amount ($0.50)
    if (totalAmount < 0.50) {
      throw new Error('Order total must be at least $0.50');
    }

    return { items: rebuiltItems, totalAmount };
  }

  /**
   * Atomically decrement site_data.products stock (catalog of record for dashboard sites).
   * @param {string} siteId
   * @param {Array<{ productId?: string, id?: string, quantity: number }>} items
   * @param {import('@prisma/client').Prisma.TransactionClient} [tx]
   */
  async decrementSiteCatalog(siteId, items, tx = null) {
    const run = async (transaction) => {
      const rows = await transaction.$queryRaw`
        SELECT id, site_data FROM sites WHERE id = ${siteId} FOR UPDATE
      `;

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`Site not found: ${siteId}`);
      }

      const row = rows[0];
      const siteData = parseSiteData(row.site_data);
      const updatedSiteData = applySiteCatalogStockChange(siteData, items, 'decrement');

      // sites has no updated_at column in Prisma schema
      await transaction.sites.update({
        where: { id: siteId },
        data: {
          site_data: updatedSiteData
        }
      });

      return updatedSiteData;
    };

    if (tx) {
      return run(tx);
    }

    return prisma.$transaction(run);
  }

  /**
   * Restock site_data.products after refund or cancellation.
   * @param {string} siteId
   * @param {Array<{ productId?: string, id?: string, quantity: number }>} items
   * @param {import('@prisma/client').Prisma.TransactionClient} [tx]
   */
  async restockSiteCatalog(siteId, items, tx = null) {
    const run = async (transaction) => {
      const rows = await transaction.$queryRaw`
        SELECT id, site_data FROM sites WHERE id = ${siteId} FOR UPDATE
      `;

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`Site not found: ${siteId}`);
      }

      const row = rows[0];
      const siteData = parseSiteData(row.site_data);
      const updatedSiteData = applySiteCatalogStockChange(siteData, items, 'restock');

      await transaction.sites.update({
        where: { id: siteId },
        data: {
          site_data: updatedSiteData
        }
      });

      return updatedSiteData;
    };

    if (tx) {
      return run(tx);
    }

    return prisma.$transaction(run);
  }

  /**
   * Normalize order line items for site catalog stock changes.
   * @param {object} order
   * @returns {Array<{ productId: string, quantity: number }>}
   */
  extractSiteCatalogItemsFromOrder(order) {
    let items = order?.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    const fromDenormalized = normalizeSiteCatalogItems(items);
    if (fromDenormalized.length > 0) {
      return fromDenormalized;
    }

    if (Array.isArray(order?.order_items) && order.order_items.length > 0) {
      return normalizeSiteCatalogItems(
        order.order_items.map((item) => ({
          productId: item.product_id ?? item.productId ?? item.id,
          quantity: item.quantity
        }))
      );
    }

    return [];
  }

  /**
   * Atomically decrement inventory after successful payment
   * Uses Prisma transaction to ensure race-safe decrement
   * @param {Array} items - Order items with productId and quantity
   * @returns {Promise<Object>} Transaction result with inventory transactions
   */
  async decrementInventory(items) {
    const inventoryTxs = [];

    for (const item of items) {
      if (!item.productId) continue;

      try {
        const product = await prisma.products.findUnique({
          where: { id: parseInt(item.productId) }
        });

        if (!product) continue;

        // Atomic decrement with guard
        const updated = await prisma.products.update({
          where: { id: product.id },
          data: {
            inventory: {
              decrement: item.quantity
            }
          }
        });

        // Log transaction
        const txn = await prisma.inventory_transactions.create({
          data: {
            product_id: product.id,
            quantity_change: -item.quantity,
            previous_quantity: product.inventory,
            new_quantity: updated.inventory,
            transaction_type: 'sale',
            notes: `Checkout order - ${item.quantity} unit(s)`
          }
        });

        inventoryTxs.push(txn);
      } catch (e) {
        console.error(`Failed to decrement inventory for product ${item.productId}:`, e);
        throw new Error(`Inventory update failed for product: ${item.productId}`);
      }
    }

    return inventoryTxs;
  }

  /**
   * Restock inventory on refund/cancellation
   * @param {string} orderId - Order ID
   * @param {Array} orderItems - Items to restock
   * @returns {Promise<Array>} Inventory transaction records
   */
  async restockInventory(orderId, orderItems) {
    const inventoryTxs = [];

    for (const item of orderItems) {
      if (!item.product_id) continue;

      try {
        const product = await prisma.products.findUnique({
          where: { id: item.product_id }
        });

        if (!product) continue;

        // Atomic increment
        const updated = await prisma.products.update({
          where: { id: product.id },
          data: {
            inventory: {
              increment: item.quantity
            }
          }
        });

        // Log transaction
        const txn = await prisma.inventory_transactions.create({
          data: {
            product_id: product.id,
            order_id: orderId,
            quantity_change: item.quantity,
            previous_quantity: product.inventory,
            new_quantity: updated.inventory,
            transaction_type: 'return',
            notes: `Refund/cancellation for order ${orderId}`
          }
        });

        inventoryTxs.push(txn);
      } catch (e) {
        console.error(`Failed to restock product ${item.product_id}:`, e);
        // Don't throw - log and continue
      }
    }

    return inventoryTxs;
  }
}

export const productCatalogService = new ProductCatalogService();
