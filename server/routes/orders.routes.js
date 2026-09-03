/**
 * Orders Routes
 * Handles order and product management for Pro sites
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPlanLimits } from '../services/subscriptionService.js';
import { resolveUserPlan, resolvePlanLimits } from '../utils/resolveUserPlan.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';
import { sanitizeString, validateEmail, validatePhone } from '../utils/validators.js';
import { checkoutLimiter, orderLimiter } from '../middleware/rateLimiting.js';
import { isPayOnSiteEnabled, buildPayOnSiteOrderItems, extractSiteCatalog } from '../utils/payOnSite.js';
import { productCatalogService } from '../services/ProductCatalogService.js';
import { emailService } from '../services/emailService.js';
import { resolvePrivateAddressForBuyer } from '../../src/utils/liveSiteContact.js';
import {
  isShowcaseDemoSite,
  isShowcaseDemoSiteData,
  buildDemoOrderId,
} from '../utils/showcaseDemo.js';

const router = express.Router();

/**
 * Helper: Verify site ownership and get site
 */
async function verifySiteOwnership(siteId, userId, userRole) {
  const select = {
    id: true,
    user_id: true,
    subdomain: true,
    users: {
      select: { plan: true, subscription_plan: true }
    }
  };

  let site = await prisma.sites.findUnique({
    where: { id: siteId },
    select
  });

  if (!site) {
    site = await prisma.sites.findFirst({
      where: { subdomain: siteId },
      select
    });
  }

  if (!site) {
    return { authorized: false, error: 'Site not found', status: 404 };
  }

  if (site.user_id !== userId && userRole !== 'admin') {
    return { authorized: false, error: 'Access denied', status: 403 };
  }

  return { authorized: true, site };
}

function parseSiteData(site) {
  if (!site?.site_data) return {};
  if (typeof site.site_data === 'string') {
    try {
      return JSON.parse(site.site_data);
    } catch {
      return {};
    }
  }
  return site.site_data;
}

function parseOrderItems(order) {
  if (Array.isArray(order.items)) return order.items;
  if (typeof order.items === 'string') {
    try {
      const parsed = JSON.parse(order.items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function dollarsToCents(value) {
  const dollars = Number.parseFloat(String(value));
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

function siteIdFilter(site) {
  return { in: Array.from(new Set([site.id, site.subdomain].filter(Boolean))) };
}

function formatOwnerOrder(order) {
  const items = parseOrderItems(order).map((item) => ({
    ...item,
    price: dollarsToCents(item.price)
  }));

  return {
    id: order.id,
    orderId: order.id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    customer: {
      name: order.customer_name || 'Guest',
      email: order.customer_email,
      phone: order.customer_phone
    },
    status: order.status === 'pending' ? 'new' : order.status,
    paymentStatus: order.payment_status,
    fulfillmentType: order.fulfillment_type,
    total: dollarsToCents(order.total_amount),
    items,
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  };
}

async function findPublicSite(siteId) {
  const select = {
    id: true,
    user_id: true,
    subdomain: true,
    status: true,
    is_public: true,
    plan: true,
    site_data: true,
    users: {
      select: { plan: true, subscription_plan: true, email: true }
    }
  };

  const byId = await prisma.sites.findUnique({
    where: { id: siteId },
    select
  });
  if (byId) return byId;

  return prisma.sites.findFirst({
    where: { subdomain: siteId },
    select
  });
}

/**
 * Middleware: Require Growth plan for order management
 */
async function requireOrderManagement(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { plan: true, subscription_plan: true }
    });

    const limits = resolvePlanLimits(user);

    if (!limits.orderManagement) {
      return sendForbidden(res, 'Order management requires Growth plan or higher', 'GROWTH_PLAN_REQUIRED');
    }

    next();
  } catch (error) {
    return sendForbidden(res, 'Error checking plan', 'PLAN_CHECK_ERROR');
  }
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
router.post('/:siteId/products', requireAuth, requireOrderManagement, asyncHandler(async (req, res) => {
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

  // Check plan limits for product creation
  const ownerLimits = resolvePlanLimits(ownership.site.users || { plan: 'trial' });
  
  if (ownerLimits.maxProducts !== -1) { // -1 = unlimited
    const productCount = await prisma.products.count({
      where: { subdomain: ownership.site.subdomain }
    });
    
    if (productCount >= ownerLimits.maxProducts) {
      return sendForbidden(
        res,
        `You have reached the product limit of ${ownerLimits.maxProducts} for your plan`,
        'PLAN_LIMIT_EXCEEDED'
      );
    }
  }

  // Create product (Prisma schema: images JSON + variants JSON — no category/image columns)
  const categoryValue = sanitizeString(category || 'General', 100);
  const imageUrl = image ? sanitizeString(image, 500) : null;
  const product = await prisma.products.create({
    data: {
      subdomain: ownership.site.subdomain,
      name: sanitizeString(name, 200),
      description: sanitizeString(description || '', 1000),
      price: priceNum,
      inventory: parseInt(inventory, 10) || 0,
      images: imageUrl ? [imageUrl] : [],
      variants: { category: categoryValue }
    }
  });

  return sendCreated(res, {
    product: {
      ...product,
      category: categoryValue,
      image: imageUrl
    }
  }, 'Product created successfully');
}));

/**
 * PUT /api/orders/:siteId/products/:productId
 * Update a product
 */
router.put('/:siteId/products/:productId', requireAuth, requireOrderManagement, asyncHandler(async (req, res) => {
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
  const productIdNum = parseInt(productId, 10);
  if (Number.isNaN(productIdNum)) {
    return sendBadRequest(res, 'Invalid product ID', 'INVALID_PRODUCT_ID');
  }

  const existingProduct = await prisma.products.findFirst({
    where: {
      id: productIdNum,
      subdomain: ownership.site.subdomain
    }
  });

  if (!existingProduct) {
    return sendNotFound(res, 'Product', 'PRODUCT_NOT_FOUND');
  }

  // Build update data (map category/image onto variants/images JSON fields)
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
    updateData.inventory = parseInt(inventory, 10) || 0;
  }
  if (category !== undefined) {
    const existingVariants = (existingProduct.variants && typeof existingProduct.variants === 'object' && !Array.isArray(existingProduct.variants))
      ? existingProduct.variants
      : {};
    updateData.variants = { ...existingVariants, category: sanitizeString(category, 100) };
  }
  if (image !== undefined) {
    updateData.images = image ? [sanitizeString(image, 500)] : [];
  }

  const product = await prisma.products.update({
    where: { id: productIdNum },
    data: updateData
  });

  const variants = (product.variants && typeof product.variants === 'object' && !Array.isArray(product.variants))
    ? product.variants
    : {};
  const images = Array.isArray(product.images) ? product.images : [];

  return sendSuccess(res, {
    product: {
      ...product,
      category: variants.category || 'General',
      image: images[0] || null
    }
  }, 'Product updated successfully');
}));

/**
 * DELETE /api/orders/:siteId/products/:productId
 * Delete a product
 */
router.delete('/:siteId/products/:productId', requireAuth, requireOrderManagement, asyncHandler(async (req, res) => {
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
  const productIdNum = parseInt(productId, 10);
  if (Number.isNaN(productIdNum)) {
    return sendBadRequest(res, 'Invalid product ID', 'INVALID_PRODUCT_ID');
  }

  const existingProduct = await prisma.products.findFirst({
    where: {
      id: productIdNum,
      subdomain: ownership.site.subdomain
    }
  });

  if (!existingProduct) {
    return sendNotFound(res, 'Product', 'PRODUCT_NOT_FOUND');
  }

  await prisma.products.delete({
    where: { id: productIdNum }
  });

  return sendSuccess(res, {}, 'Product deleted successfully');
}));

// ==================== ORDERS ENDPOINTS ====================

/**
 * POST /api/orders/:siteId/pay-on-site
 * Public: place an unpaid order when the owner enabled pay on site.
 */
router.post('/:siteId/pay-on-site', checkoutLimiter, orderLimiter, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const site = await findPublicSite(siteId);

  if (!site || site.status !== 'published' || site.is_public === false) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  const limits = resolvePlanLimits(site.users || { plan: site.plan });
  if (!limits.orderManagement) {
    return sendForbidden(res, 'This site cannot accept orders', 'GROWTH_PLAN_REQUIRED');
  }

  const siteData = parseSiteData(site);
  if (!isPayOnSiteEnabled(siteData) || siteData.settings?.allowCheckout !== true) {
    return sendForbidden(res, 'Pay on site is not enabled for this shop', 'PAY_ON_SITE_DISABLED');
  }

  const emailCheck = validateEmail(req.body?.customerEmail);
  if (!emailCheck.valid) {
    return sendBadRequest(res, emailCheck.error, 'INVALID_EMAIL');
  }

  const customerName = sanitizeString(req.body?.customerName, 120);
  if (!customerName) {
    return sendBadRequest(res, 'Name is required', 'MISSING_NAME');
  }

  const phoneCheck = validatePhone(req.body?.customerPhone);
  if (!phoneCheck.valid) {
    return sendBadRequest(res, phoneCheck.error, 'INVALID_PHONE');
  }

  const built = buildPayOnSiteOrderItems(req.body?.items, extractSiteCatalog(siteData));
  if (!built.valid) {
    return sendBadRequest(res, built.error, 'INVALID_ITEMS');
  }

  const notes = req.body?.notes ? sanitizeString(req.body.notes, 500) : null;

  // Gallery demos: validate + confirm UX without writing real orders
  if (isShowcaseDemoSite(site) || isShowcaseDemoSiteData(siteData)) {
    return sendCreated(res, {
      order: {
        id: buildDemoOrderId(),
        status: 'pending',
        paymentStatus: 'unpaid',
        fulfillmentType: 'pay_on_site',
        total: built.total,
        customerName,
        customerEmail: emailCheck.value,
        demo: true,
      }
    }, 'Demo order placed. Pay when you pick up — no real order was saved.');
  }

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.orders.create({
        data: {
          site_id: site.id,
          user_id: site.user_id || undefined,
          customer_email: emailCheck.value,
          customer_name: customerName,
          customer_phone: phoneCheck.value,
          items: built.items,
          total_amount: built.total,
          currency: 'usd',
          payment_status: 'unpaid',
          status: 'pending',
          fulfillment_type: 'pay_on_site',
          notes,
          metadata: {
            paymentMethod: 'pay_on_site'
          }
        }
      });

      await productCatalogService.decrementSiteCatalog(
        site.id,
        built.items.map((item) => ({ productId: item.id, quantity: item.quantity })),
        tx
      );

      return createdOrder;
    });
  } catch (error) {
    if (error?.message?.includes('Insufficient stock')) {
      return sendBadRequest(res, error.message, 'INSUFFICIENT_STOCK');
    }
    throw error;
  }

  const total = Number.parseFloat(String(order.total_amount));
  const amountCents = Math.round((Number.isFinite(total) ? total : built.total) * 100);
  const businessName = siteData.brand?.name || siteData.businessName || site.subdomain || 'Your shop';
  const orderEmailItems = built.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: Math.round(Number(item.price) * Number(item.quantity) * 100),
  }));

  try {
    await emailService.sendEmail({
      to: order.customer_email,
      template: 'orderConfirmation',
      data: {
        orderId: order.id,
        amount: amountCents,
        items: orderEmailItems,
        customerName: order.customer_name,
        businessName,
        businessAddress: resolvePrivateAddressForBuyer(siteData),
        payOnSite: true,
      },
    });
  } catch {
    // Email failure must not roll back a placed order.
  }

  const ownerEmail = site.users?.email;
  if (ownerEmail && ownerEmail.toLowerCase() !== String(order.customer_email).toLowerCase()) {
    try {
      await emailService.sendEmail({
        to: ownerEmail,
        template: 'newOrder',
        data: {
          orderId: order.id,
          amount: amountCents,
          items: orderEmailItems,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone || undefined,
          notes: notes || undefined,
          businessName,
          payOnSite: true,
        },
      });
    } catch {
      // Owner notify failure must not roll back a placed order.
    }
  }

  return sendCreated(res, {
    order: {
      id: order.id,
      status: order.status,
      paymentStatus: order.payment_status,
      fulfillmentType: order.fulfillment_type,
      total: Number.isFinite(total) ? total : built.total,
      customerName: order.customer_name,
      customerEmail: order.customer_email
    }
  }, 'Order placed. Pay when you pick up or visit.');
}));

/**
 * GET /api/orders/:siteId/orders
 * Get all orders for a site
 */
router.get('/:siteId/orders', requireAuth, requireOrderManagement, asyncHandler(async (req, res) => {
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

  const where = { site_id: siteIdFilter(ownership.site) };
  if (status) {
    where.status = status === 'new' ? 'pending' : status;
  }

  const orders = await prisma.orders.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 50, 200)
  });

  const formattedOrders = orders.map(order => formatOwnerOrder(order));

  return sendSuccess(res, { orders: formattedOrders });
}));

/**
 * GET /api/orders/:siteId/orders/:orderId
 * Get single order details
 */
router.get('/:siteId/orders/:orderId', requireAuth, requireOrderManagement, asyncHandler(async (req, res) => {
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
      site_id: siteIdFilter(ownership.site)
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
    order: formatOwnerOrder({
      ...order,
      items: items.length > 0 ? items : order.items
    })
  });
}));

/**
 * PUT /api/orders/:siteId/orders/:orderId/status
 * Update order status with state machine validation
 */
router.put('/:siteId/orders/:orderId/status', requireAuth, asyncHandler(async (req, res) => {
  const { siteId, orderId } = req.params;
  const { status } = req.body;
  const userId = req.user.id || req.user.userId;

  // Import state machine
  const { isValidOrderTransition, ORDER_STATUSES } = await import('../services/orderStateMachine.js');

  const statusAliases = {
    new: ORDER_STATUSES.PENDING,
    completed: ORDER_STATUSES.FULFILLED,
    complete: ORDER_STATUSES.FULFILLED
  };
  const nextStatus = statusAliases[status] || status;
  const validStatuses = Object.values(ORDER_STATUSES);

  if (!nextStatus || !validStatuses.includes(nextStatus)) {
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
      site_id: siteIdFilter(ownership.site)
    }
  });

  if (!existingOrder) {
    return sendNotFound(res, 'Order', 'ORDER_NOT_FOUND');
  }

  const oldStatus = existingOrder.status;

  // Validate state transition
  if (!isValidOrderTransition(oldStatus, nextStatus)) {
    return sendBadRequest(
      res,
      `Cannot transition from '${oldStatus}' to '${nextStatus}'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const paymentUpdate = existingOrder.fulfillment_type === 'pay_on_site' && nextStatus === ORDER_STATUSES.FULFILLED
    ? { payment_status: 'paid' }
    : {};

  const stockHeldStatuses = new Set([
    ORDER_STATUSES.PENDING,
    ORDER_STATUSES.PROCESSING,
    ORDER_STATUSES.FULFILLED,
    ORDER_STATUSES.SHIPPED,
    ORDER_STATUSES.DELIVERED
  ]);

  const order = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.orders.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        updated_at: new Date(),
        ...paymentUpdate
      }
    });

    if (
      nextStatus === ORDER_STATUSES.CANCELLED &&
      stockHeldStatuses.has(oldStatus)
    ) {
      const restockItems = productCatalogService.extractSiteCatalogItemsFromOrder(existingOrder);
      if (restockItems.length > 0) {
        await productCatalogService.restockSiteCatalog(ownership.site.id, restockItems, tx);
      }
    }

    return updatedOrder;
  });

  // Send email notification if status changed
  if (oldStatus !== nextStatus && order.customer_email) {
    try {
      const TrackingService = (await import('../services/trackingService.js')).default;
      const BookingNotificationService = (await import('../services/bookingNotificationService.js')).default;
      
      const trackingService = new TrackingService();
      const notificationService = new BookingNotificationService();
      
      // Get or create tracking token
      const trackingToken = await trackingService.createOrGetOrderToken(orderId, order.customer_email);
      const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
      const trackingUrl = `${SITE_URL}/track/order/${trackingToken.token}`;
      
      // Send status update email
      await notificationService.sendOrderStatusUpdateEmail({
        order: {
          ...order,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          total: order.total
        },
        oldStatus,
        newStatus: nextStatus,
        trackingUrl
      });
    } catch (err) {
      console.error('Error sending order status update email:', err);
      // Don't fail the request if email fails
    }
  }

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

  // Get order statistics (schema uses total_amount; terminal statuses are fulfilled/delivered)
  const [totalOrders, pendingOrders, completedOrders, totalRevenue] = await Promise.all([
    prisma.orders.count({ where: { site_id: siteId } }),
    prisma.orders.count({ where: { site_id: siteId, status: 'pending' } }),
    prisma.orders.count({
      where: { site_id: siteId, status: { in: ['fulfilled', 'delivered', 'shipped'] } }
    }),
    prisma.orders.aggregate({
      where: { site_id: siteId, status: { in: ['fulfilled', 'delivered', 'shipped'] } },
      _sum: { total_amount: true }
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
      totalRevenue: totalRevenue._sum.total_amount || 0,
      productCount
    }
  });
}));

/**
 * GET /api/orders/pending-count
 * Get total pending orders count for authenticated user's sites
 */
router.get('/pending-count', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;

  // Get all sites owned by user
  const userSites = await prisma.sites.findMany({
    where: { user_id: userId },
    select: { id: true }
  });

  const siteIds = userSites.map(site => site.id);

  // Count pending orders across all user's sites
  let pendingCount = 0;
  try {
    if (siteIds.length > 0 && prisma.orders) {
      pendingCount = await prisma.orders.count({
        where: {
          site_id: { in: siteIds },
          status: 'pending'
        }
      });
    }
  } catch (error) {
    console.warn('[Orders] Could not fetch pending count (table might be missing):', error.message);
  }

  return sendSuccess(res, { count: pendingCount });
}));

export default router;
