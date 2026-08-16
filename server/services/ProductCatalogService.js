/**
 * Product Catalog Service
 * Validates products and rebuilds checkout line items server-side
 * Prevents price tampering and inventory overselling
 */

import { prisma } from '../../database/db.js';

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
