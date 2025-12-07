/**
 * Orders Routes
 * Handles order management for Pro sites
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';

const router = express.Router();

// GET /api/sites/:siteId/products
router.get('/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;

    // Verify site ownership
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: { user_id: true, subdomain: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get products
    const products = await prisma.products.findMany({
      where: { subdomain: site.subdomain },
      orderBy: [
        { display_order: 'asc' },
        { created_at: 'asc' }
      ]
    });

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/sites/:siteId/products
router.post('/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { name, price, description, inventory } = req.body;

    // Validation
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Price must be positive' });
    }

    // Verify site ownership
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: { user_id: true, subdomain: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Insert product
    const product = await prisma.products.create({
      data: {
        subdomain: site.subdomain,
        name,
        description: description || '',
        price,
        inventory: inventory || 0
      }
    });

    res.status(201).json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/sites/:siteId/products/:productId
router.put('/:siteId/products/:productId', requireAuth, async (req, res) => {
  try {
    const { siteId, productId } = req.params;
    const { name, price, description, inventory } = req.body;

    // Verify site ownership
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: { user_id: true, subdomain: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify product belongs to site (subdomain)
    const existingProduct = await prisma.products.findFirst({
      where: {
        id: productId, // Assuming ID is unique enough, but checking subdomain is safer
        subdomain: site.subdomain
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update product
    const product = await prisma.products.update({
      where: { id: productId },
      data: {
        name: name !== undefined ? name : undefined,
        price: price !== undefined ? price : undefined,
        description: description !== undefined ? description : undefined,
        inventory: inventory !== undefined ? inventory : undefined,
        updated_at: new Date()
      }
    });

    res.json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/sites/:siteId/products/:productId
router.delete('/:siteId/products/:productId', requireAuth, async (req, res) => {
  try {
    const { siteId, productId } = req.params;

    // Verify site ownership
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: { user_id: true, subdomain: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify product belongs to site
    const existingProduct = await prisma.products.findFirst({
      where: {
        id: productId,
        subdomain: site.subdomain
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product
    await prisma.products.delete({
      where: { id: productId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET /api/sites/:siteId/orders
router.get('/:siteId/orders', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status } = req.query;

    // Verify site ownership
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: { user_id: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get orders
    // Using site_id instead of subdomain as orders table has site_id
    const orders = await prisma.orders.findMany({
      where: {
        site_id: siteId,
        ...(status ? { status } : {})
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/sites/:siteId/orders/:orderId
router.get('/:siteId/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const { siteId, orderId } = req.params;

    // Verify site ownership
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: { user_id: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order with items
    // Try to include order_items if relation exists, otherwise fetch separately
    // Assuming order_items table exists and has order_id

    const order = await prisma.orders.findFirst({
      where: {
        id: orderId,
        site_id: siteId
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Try to fetch order items from order_items table
    // If table doesn't exist or is empty, we might rely on order.items (JSON)
    let items = [];
    try {
      items = await prisma.order_items.findMany({
        where: { order_id: orderId }
      });
    } catch (e) {
      // Table might not exist or other error
      // Fallback to parsing JSON items if available
      if (order.items && typeof order.items === 'string') {
        try {
          items = JSON.parse(order.items);
        } catch (parseErr) {
          items = [];
        }
      }
    }

    res.json({
      order: {
        ...order,
        items: items.length > 0 ? items : (typeof order.items === 'string' ? JSON.parse(order.items) : order.items)
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/sites/:siteId/orders/:orderId/status
router.put('/:siteId/orders/:orderId/status', requireAuth, async (req, res) => {
  try {
    const { siteId, orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify site ownership
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: { user_id: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update order status
    const order = await prisma.orders.update({
      where: { id: orderId },
      data: {
        status,
        updated_at: new Date()
      }
    });

    res.json({ order });
  } catch (error) {
    console.error('Update order status error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }
});

export default router;

