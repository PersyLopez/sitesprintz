/**
 * Content Management API Routes
 * CRUD operations for menu items, services, and products
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ContentService from '../services/contentService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

/**
 * Menu Items Routes
 */

// GET all menu items
router.get('/:subdomain/menu', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { grouped } = req.query;

    const items = await ContentService.getMenuItems(subdomain, grouped === 'true');

    res.json({ items: grouped === 'true' ? items.categories : items });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// POST create menu item
router.post('/:subdomain/menu', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const item = await ContentService.createMenuItem(subdomain, req.body);

    res.status(201).json(item);
  } catch (error) {
    console.error('Create menu item error:', error);
    
    if (error.message.includes('required') || error.message.includes('positive')) {
      return res.status(400).json({ errors: [error.message] });
    }
    
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PUT update menu item
router.put('/:subdomain/menu/:itemId', requireAuth, async (req, res) => {
  try {
    const { subdomain, itemId } = req.params;
    const item = await ContentService.updateMenuItem(subdomain, itemId, req.body);

    res.json(item);
  } catch (error) {
    console.error('Update menu item error:', error);
    
    if (error.message === 'Item not found') {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (error.message.includes('positive') || error.message.includes('number')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// DELETE menu item
router.delete('/:subdomain/menu/:itemId', requireAuth, async (req, res) => {
  try {
    const { subdomain, itemId } = req.params;
    const result = await ContentService.deleteMenuItem(subdomain, itemId);

    res.json(result);
  } catch (error) {
    console.error('Delete menu item error:', error);
    
    if (error.message === 'Item not found') {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// PATCH reorder menu items
router.patch('/:subdomain/menu/reorder', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { items } = req.body;

    const result = await ContentService.reorderMenuItems(subdomain, items);

    res.json(result);
  } catch (error) {
    console.error('Reorder error:', error);
    
    if (error.message.includes('do not belong')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

// POST bulk create menu items
router.post('/:subdomain/menu/bulk', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { items } = req.body;

    const result = await ContentService.bulkCreateMenuItems(subdomain, items);

    const status = result.failed > 0 ? 207 : 200;
    res.status(status).json(result);
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: 'Failed to create items' });
  }
});

// DELETE bulk delete menu items
router.delete('/:subdomain/menu/bulk', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { ids } = req.body;

    const result = await ContentService.bulkDeleteMenuItems(subdomain, ids);

    res.json(result);
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete items' });
  }
});

/**
 * Services Routes
 */

// GET all services
router.get('/:subdomain/services', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const services = await ContentService.getServices(subdomain);

    res.json({ services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST create service
router.post('/:subdomain/services', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const service = await ContentService.createService(subdomain, req.body);

    res.status(201).json(service);
  } catch (error) {
    console.error('Create service error:', error);
    
    if (error.message.includes('required') || error.message.includes('positive')) {
      return res.status(400).json({ errors: [error.message] });
    }
    
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PUT update service
router.put('/:subdomain/services/:serviceId', requireAuth, async (req, res) => {
  try {
    const { subdomain, serviceId } = req.params;
    const service = await ContentService.updateService(subdomain, serviceId, req.body);

    res.json(service);
  } catch (error) {
    console.error('Update service error:', error);
    
    if (error.message === 'Service not found') {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE service
router.delete('/:subdomain/services/:serviceId', requireAuth, async (req, res) => {
  try {
    const { subdomain, serviceId } = req.params;
    const result = await ContentService.deleteService(subdomain, serviceId);

    res.json(result);
  } catch (error) {
    console.error('Delete service error:', error);
    
    if (error.message === 'Service not found') {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

/**
 * Products Routes
 */

// GET all products
router.get('/:subdomain/products', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { page, limit } = req.query;

    const result = await ContentService.getProducts(subdomain, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });

    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST create product
router.post('/:subdomain/products', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const product = await ContentService.createProduct(subdomain, req.body);

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.message.includes('required') || error.message.includes('negative')) {
      return res.status(400).json({ errors: [error.message] });
    }
    
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * Image Upload Route
 */

router.post('/:subdomain/upload', requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.message.includes('Only images')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large (max 5MB)' });
    }
    
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
  }
  next(error);
});

export default router;

