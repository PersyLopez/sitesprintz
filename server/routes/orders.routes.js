/**
 * Orders Routes
 * Handles order management for Pro sites
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query as dbQuery } from '../../database/db.js';

const router = express.Router();

// GET /api/sites/:siteId/products
router.get('/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // Verify site ownership
    const siteCheck = await dbQuery(
      'SELECT user_id FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (siteCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get products
    const result = await dbQuery(
      `SELECT * FROM products 
       WHERE subdomain = (SELECT subdomain FROM sites WHERE id = $1)
       ORDER BY display_order, created_at`,
      [siteId]
    );
    
    res.json({ products: result.rows });
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
    const siteCheck = await dbQuery(
      'SELECT user_id, subdomain FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (siteCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const subdomain = siteCheck.rows[0].subdomain;
    
    // Insert product
    const result = await dbQuery(
      `INSERT INTO products (subdomain, name, description, price, inventory)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [subdomain, name, description || '', price, inventory || 0]
    );
    
    res.status(201).json({ product: result.rows[0] });
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
    const siteCheck = await dbQuery(
      'SELECT user_id, subdomain FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (siteCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const subdomain = siteCheck.rows[0].subdomain;
    
    // Update product
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (inventory !== undefined) {
      updates.push(`inventory = $${paramCount++}`);
      values.push(inventory);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(subdomain, productId);
    
    const result = await dbQuery(
      `UPDATE products 
       SET ${updates.join(', ')}
       WHERE subdomain = $${paramCount++} AND id = $${paramCount}
       RETURNING *`,
      values
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ product: result.rows[0] });
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
    const siteCheck = await dbQuery(
      'SELECT user_id, subdomain FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (siteCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const subdomain = siteCheck.rows[0].subdomain;
    
    // Delete product
    const result = await dbQuery(
      'DELETE FROM products WHERE subdomain = $1 AND id = $2',
      [subdomain, productId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
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
    const siteCheck = await dbQuery(
      'SELECT user_id, subdomain FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (siteCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const subdomain = siteCheck.rows[0].subdomain;
    
    // Get orders
    let query = 'SELECT * FROM orders WHERE subdomain = $1';
    const params = [subdomain];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await dbQuery(query, params);
    
    res.json({ orders: result.rows });
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
    const siteCheck = await dbQuery(
      'SELECT user_id, subdomain FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (siteCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const subdomain = siteCheck.rows[0].subdomain;
    
    // Get order with items
    const orderResult = await dbQuery(
      'SELECT * FROM orders WHERE subdomain = $1 AND id = $2',
      [subdomain, orderId]
    );
    
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const itemsResult = await dbQuery(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );
    
    const order = {
      ...orderResult.rows[0],
      items: itemsResult.rows
    };
    
    res.json({ order });
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
    const siteCheck = await dbQuery(
      'SELECT user_id, subdomain FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (siteCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const subdomain = siteCheck.rows[0].subdomain;
    
    // Update order status
    const result = await dbQuery(
      `UPDATE orders 
       SET status = $1, updated_at = NOW()
       WHERE subdomain = $2 AND id = $3
       RETURNING *`,
      [status, subdomain, orderId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;

