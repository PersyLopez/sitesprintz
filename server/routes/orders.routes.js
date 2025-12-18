/**
 * Orders Routes
 * Handles order and product management for Pro sites
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';
import { sanitizeString } from '../utils/validators.js';

const router = express.Router();

/**
 * Helper: Verify site ownership and get site
 */
async function verifySiteOwnership(siteId, userId, userRole) {
  const site = await prisma.sites.findUnique({
    where: { id: siteId },
    select: { id: true, user_id: true, subdomain: true }
  });

  if (!site) {
    return { authorized: false, error: 'Site not found', status: 404 };
  }

  if (site.user_id !== userId && userRole !== 'admin') {
    return { authorized: false, error: 'Access denied', status: 403 };
  }

  return { authorized: true, site };
}

// ==================== PRODUCTS ENDPOINTS ====================

/**
 * GET /api/orders/:siteId/products
 * Get all products for a site
 */
router.get('/:siteId/products', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const products = await prisma.products.findMany({
    where: { subdomain: ownership.site.subdomain },
    orderBy: [
      { display_order: 'asc' },
      { created_at: 'asc' }
    ]
  });

  return sendSuccess(res, { products });
}));

/**
 * POST /api/orders/:siteId/products
 * Create a new product
 */
router.post('/:siteId/products', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const { name, price, description, inventory, category, image } = req.body;
  const userId = req.user.id || req.user.userId;

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return sendBadRequest(res, 'Product name is required', 'MISSING_NAME');
  }

  if (price === undefined || isNaN(parseFloat(price))) {
    return sendBadRequest(res, 'Valid price is required', 'MISSING_PRICE');
  }

  const priceNum = parseFloat(price);
  if (priceNum < 0) {
    return sendBadRequest(res, 'Price cannot be negative', 'INVALID_PRICE');
  }

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Create product
  const product = await prisma.products.create({
    data: {
      subdomain: ownership.site.subdomain,
      name: sanitizeString(name, 200),
      description: sanitizeString(description || '', 1000),
      price: priceNum,
      inventory: parseInt(inventory) || 0,
      category: sanitizeString(category || 'General', 100),
      image: image ? sanitizeString(image, 500) : null
    }
  });

  return sendCreated(res, { product }, 'Product created successfully');
}));

/**
 * PUT /api/orders/:siteId/products/:productId
 * Update a product
 */
router.put('/:siteId/products/:productId', requireAuth, asyncHandler(async (req, res) => {
  const { siteId, productId } = req.params;
  const { name, price, description, inventory, category, image } = req.body;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Verify product belongs to site
  const existingProduct = await prisma.products.findFirst({
    where: {
      id: productId,
      subdomain: ownership.site.subdomain
    }
  });

  if (!existingProduct) {
    return sendNotFound(res, 'Product', 'PRODUCT_NOT_FOUND');
  }

  // Build update data
  const updateData = { updated_at: new Date() };
  
  if (name !== undefined) {
    updateData.name = sanitizeString(name, 200);
  }
  if (price !== undefined) {
    const priceNum = parseFloat(price);
    if (priceNum < 0) {
      return sendBadRequest(res, 'Price cannot be negative', 'INVALID_PRICE');
    }
    updateData.price = priceNum;
  }
  if (description !== undefined) {
    updateData.description = sanitizeString(description, 1000);
  }
  if (inventory !== undefined) {
    updateData.inventory = parseInt(inventory) || 0;
  }
  if (category !== undefined) {
    updateData.category = sanitizeString(category, 100);
  }
  if (image !== undefined) {
    updateData.image = image ? sanitizeString(image, 500) : null;
  }

  const product = await prisma.products.update({
    where: { id: productId },
    data: updateData
  });

  return sendSuccess(res, { product }, 'Product updated successfully');
}));

/**
 * DELETE /api/orders/:siteId/products/:productId
 * Delete a product
 */
router.delete('/:siteId/products/:productId', requireAuth, asyncHandler(async (req, res) => {
  const { siteId, productId } = req.params;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Verify product belongs to site
  const existingProduct = await prisma.products.findFirst({
    where: {
      id: productId,
      subdomain: ownership.site.subdomain
    }
  });

  if (!existingProduct) {
    return sendNotFound(res, 'Product', 'PRODUCT_NOT_FOUND');
  }

  await prisma.products.delete({
    where: { id: productId }
  });

  return sendSuccess(res, {}, 'Product deleted successfully');
}));

// ==================== ORDERS ENDPOINTS ====================

/**
 * GET /api/orders/:siteId/orders
 * Get all orders for a site
 */
router.get('/:siteId/orders', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const { status, limit = 50 } = req.query;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const where = { site_id: siteId };
  if (status) {
    where.status = status;
  }

  const orders = await prisma.orders.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 50, 200)
  });

  const formattedOrders = orders.map(order => ({
    id: order.id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    status: order.status,
    total: order.total,
    items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  }));

  return sendSuccess(res, { orders: formattedOrders });
}));

/**
 * GET /api/orders/:siteId/orders/:orderId
 * Get single order details
 */
router.get('/:siteId/orders/:orderId', requireAuth, asyncHandler(async (req, res) => {
  const { siteId, orderId } = req.params;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const order = await prisma.orders.findFirst({
    where: {
      id: orderId,
      site_id: siteId
    }
  });

  if (!order) {
    return sendNotFound(res, 'Order', 'ORDER_NOT_FOUND');
  }

  // Try to get order items from separate table
  let items = [];
  try {
    items = await prisma.order_items.findMany({
      where: { order_id: orderId }
    });
  } catch (e) {
    // Fallback to JSON items field
    if (order.items) {
      items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    }
  }

  return sendSuccess(res, {
    order: {
      id: order.id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      status: order.status,
      total: order.total,
      items: items.length > 0 ? items : (typeof order.items === 'string' ? JSON.parse(order.items) : order.items),
      shippingAddress: order.shipping_address,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }
  });
}));

/**
 * PUT /api/orders/:siteId/orders/:orderId/status
 * Update order status
 */
router.put('/:siteId/orders/:orderId/status', requireAuth, asyncHandler(async (req, res) => {
  const { siteId, orderId } = req.params;
  const { status } = req.body;
  const userId = req.user.id || req.user.userId;

  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'shipped', 'completed', 'cancelled', 'refunded'];

  if (!status || !validStatuses.includes(status)) {
    return sendBadRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 'INVALID_STATUS');
  }

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Verify order belongs to site
  const existingOrder = await prisma.orders.findFirst({
    where: {
      id: orderId,
      site_id: siteId
    }
  });

  if (!existingOrder) {
    return sendNotFound(res, 'Order', 'ORDER_NOT_FOUND');
  }

  const order = await prisma.orders.update({
    where: { id: orderId },
    data: {
      status,
      updated_at: new Date()
    }
  });

  return sendSuccess(res, { 
    order: {
      id: order.id,
      status: order.status,
      updatedAt: order.updated_at
    }
  }, `Order status updated to ${status}`);
}));

/**
 * GET /api/orders/:siteId/stats
 * Get order statistics for a site
 */
router.get('/:siteId/stats', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Get order statistics
  const [totalOrders, pendingOrders, completedOrders, totalRevenue] = await Promise.all([
    prisma.orders.count({ where: { site_id: siteId } }),
    prisma.orders.count({ where: { site_id: siteId, status: 'pending' } }),
    prisma.orders.count({ where: { site_id: siteId, status: 'completed' } }),
    prisma.orders.aggregate({
      where: { site_id: siteId, status: 'completed' },
      _sum: { total: true }
    })
  ]);

  // Get products count
  const productCount = await prisma.products.count({
    where: { subdomain: ownership.site.subdomain }
  });

  return sendSuccess(res, {
    stats: {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      productCount
    }
  });
}));

export default router;
