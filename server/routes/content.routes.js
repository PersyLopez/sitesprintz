/**
 * Content Management API Routes
 * CRUD operations for menu items, services, and products
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import ContentService from '../services/contentService.js';
import { requireAuth } from '../middleware/auth.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendForbidden,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    // Use crypto.randomBytes for secure filename generation
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
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
router.get('/:subdomain/menu', asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { grouped } = req.query;

  const items = await ContentService.getMenuItems(subdomain, grouped === 'true');

  return sendSuccess(res, { 
    items: grouped === 'true' ? items.categories : items 
  });
}));

// POST create menu item
router.post('/:subdomain/menu', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  
  try {
    const item = await ContentService.createMenuItem(subdomain, req.body);
    return sendCreated(res, { item });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('positive')) {
      return sendBadRequest(res, error.message, 'VALIDATION_ERROR');
    }
    throw error;
  }
}));

// PUT update menu item
router.put('/:subdomain/menu/:itemId', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain, itemId } = req.params;
  
  try {
    const item = await ContentService.updateMenuItem(subdomain, itemId, req.body);
    return sendSuccess(res, { item });
  } catch (error) {
    if (error.message === 'Item not found') {
      return sendNotFound(res, 'Menu item', 'ITEM_NOT_FOUND');
    }
    if (error.message.includes('positive') || error.message.includes('number')) {
      return sendBadRequest(res, error.message, 'VALIDATION_ERROR');
    }
    throw error;
  }
}));

// DELETE menu item
router.delete('/:subdomain/menu/:itemId', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain, itemId } = req.params;
  
  try {
    await ContentService.deleteMenuItem(subdomain, itemId);
    return sendSuccess(res, {}, 'Menu item deleted');
  } catch (error) {
    if (error.message === 'Item not found') {
      return sendNotFound(res, 'Menu item', 'ITEM_NOT_FOUND');
    }
    throw error;
  }
}));

// PATCH reorder menu items
router.patch('/:subdomain/menu/reorder', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return sendBadRequest(res, 'Items must be an array', 'INVALID_ITEMS');
  }

  try {
    const result = await ContentService.reorderMenuItems(subdomain, items);
    return sendSuccess(res, result);
  } catch (error) {
    if (error.message.includes('do not belong')) {
      return sendForbidden(res, error.message, 'OWNERSHIP_ERROR');
    }
    throw error;
  }
}));

// POST bulk create menu items
router.post('/:subdomain/menu/bulk', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return sendBadRequest(res, 'Items array is required', 'INVALID_ITEMS');
  }

  const result = await ContentService.bulkCreateMenuItems(subdomain, items);
  
  // Use 207 Multi-Status if some items failed
  const statusCode = result.failed > 0 ? 207 : 200;
  return res.status(statusCode).json({ success: result.failed === 0, ...result });
}));

// DELETE bulk delete menu items
router.delete('/:subdomain/menu/bulk', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return sendBadRequest(res, 'IDs array is required', 'INVALID_IDS');
  }

  const result = await ContentService.bulkDeleteMenuItems(subdomain, ids);
  return sendSuccess(res, result, 'Items deleted');
}));

/**
 * Services Routes
 */

// GET all services
router.get('/:subdomain/services', asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const services = await ContentService.getServices(subdomain);
  return sendSuccess(res, { services });
}));

// POST create service
router.post('/:subdomain/services', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  
  try {
    const service = await ContentService.createService(subdomain, req.body);
    return sendCreated(res, { service });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('positive')) {
      return sendBadRequest(res, error.message, 'VALIDATION_ERROR');
    }
    throw error;
  }
}));

// PUT update service
router.put('/:subdomain/services/:serviceId', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain, serviceId } = req.params;
  
  try {
    const service = await ContentService.updateService(subdomain, serviceId, req.body);
    return sendSuccess(res, { service });
  } catch (error) {
    if (error.message === 'Service not found') {
      return sendNotFound(res, 'Service', 'SERVICE_NOT_FOUND');
    }
    throw error;
  }
}));

// DELETE service
router.delete('/:subdomain/services/:serviceId', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain, serviceId } = req.params;
  
  try {
    await ContentService.deleteService(subdomain, serviceId);
    return sendSuccess(res, {}, 'Service deleted');
  } catch (error) {
    if (error.message === 'Service not found') {
      return sendNotFound(res, 'Service', 'SERVICE_NOT_FOUND');
    }
    throw error;
  }
}));

/**
 * Products Routes
 */

// GET all products
router.get('/:subdomain/products', asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { page, limit } = req.query;

  const result = await ContentService.getProducts(subdomain, {
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 50, 100) // Cap at 100
  });

  return sendSuccess(res, result);
}));

// POST create product
router.post('/:subdomain/products', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  
  try {
    const product = await ContentService.createProduct(subdomain, req.body);
    return sendCreated(res, { product });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('negative')) {
      return sendBadRequest(res, error.message, 'VALIDATION_ERROR');
    }
    throw error;
  }
}));

/**
 * Image Upload Route
 */
router.post('/:subdomain/upload', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.message?.includes('Only images')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Only image files are allowed',
          code: 'INVALID_FILE_TYPE'
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          success: false, 
          error: 'File too large (max 5MB)',
          code: 'FILE_TOO_LARGE'
        });
      }
      console.error('Upload error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Upload failed',
        code: 'UPLOAD_ERROR'
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    res.json({ 
      success: true,
      url: `/uploads/${req.file.filename}`, 
      filename: req.file.filename 
    });
  });
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        success: false,
        error: 'File too large',
        code: 'FILE_TOO_LARGE'
      });
    }
  }
  next(error);
});

export default router;

