/**
 * Sites Routes
 * 
 * Handles site management, products, and file uploads.
 * All site data is stored in the database (sites.site_data JSONB column).
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import multer from 'multer';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';
import { sanitizeSiteDataForStorage } from '../utils/siteDataSanitizer.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');
const uploadsDir = path.join(publicDir, 'uploads');
const templatesDir = path.join(publicDir, 'data', 'templates');

// Ensure uploads directory exists
fs.mkdir(uploadsDir, { recursive: true }).catch(() => { });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Use crypto.randomBytes for secure filename generation
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed'));
    }
  }
});

/**
 * Helper: Verify site ownership
 */
async function verifySiteOwnership(siteId, userId, userRole) {
  const site = await prisma.sites.findUnique({
    where: { id: siteId },
    select: { id: true, user_id: true, site_data: true, status: true }
  });

  if (!site) {
    return { authorized: false, error: 'Site not found', status: 404 };
  }

  if (site.user_id !== userId && userRole !== 'admin') {
    return { authorized: false, error: 'Access denied', status: 403 };
  }

  return { authorized: true, site };
}

/**
 * Helper: Parse site_data from database
 */
function parseSiteData(site) {
  if (!site.site_data) return {};
  if (typeof site.site_data === 'string') {
    try {
      return JSON.parse(site.site_data);
    } catch (e) {
      return {};
    }
  }
  return site.site_data;
}

// ==================== UPLOAD ENDPOINTS ====================

/**
 * POST /api/sites/upload
 * Upload an image file
 */
router.post('/upload', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Upload failed',
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

/**
 * DELETE /api/sites/uploads/:filename
 * Delete an uploaded image
 */
router.delete('/uploads/:filename', requireAuth, asyncHandler(async (req, res) => {
  const { filename } = req.params;

  // Validate filename to prevent directory traversal
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return sendBadRequest(res, 'Invalid filename', 'INVALID_FILENAME');
  }

  try {
    await fs.unlink(path.join(uploadsDir, filename));
    return sendSuccess(res, {}, 'File deleted successfully');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return sendNotFound(res, 'File', 'FILE_NOT_FOUND');
    }
    throw err;
  }
}));

// ==================== SITE DATA ENDPOINTS ====================

/**
 * GET /api/sites/:siteId
 * Get site data by ID
 */
router.get('/:siteId', asyncHandler(async (req, res) => {
  const { siteId } = req.params;

  const site = await prisma.sites.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      subdomain: true,
      template_id: true,
      status: true,
      plan: true,
      site_data: true,
      created_at: true,
      updated_at: true,
      published_at: true,
      expires_at: true,
      is_public: true
    }
  });

  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  const siteData = parseSiteData(site);

  return sendSuccess(res, {
    site: {
      id: site.id,
      subdomain: site.subdomain,
      templateId: site.template_id,
      status: site.status,
      plan: site.plan,
      isPublic: site.is_public,
      createdAt: site.created_at,
      updatedAt: site.updated_at,
      publishedAt: site.published_at,
      expiresAt: site.expires_at,
      data: siteData
    }
  });
}));

/**
 * PUT /api/sites/:siteId
 * Update site data
 */
router.put('/:siteId', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const userId = req.user.id || req.user.userId;
  const { data, siteData } = req.body;

  // Verify ownership
  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Get new site data (support both 'data' and 'siteData' keys)
  const newData = data || siteData;
  if (!newData || typeof newData !== 'object') {
    return sendBadRequest(res, 'Site data is required', 'INVALID_DATA');
  }

  // Merge with existing data
  const existingData = parseSiteData(ownership.site);
  const mergedData = { ...existingData, ...newData };

  // Sanitize and save
  const sanitizedData = sanitizeSiteDataForStorage(mergedData);

  await prisma.sites.update({
    where: { id: siteId },
    data: {
      site_data: sanitizedData,
      updated_at: new Date()
    }
  });

  return sendSuccess(res, {
    site: {
      id: siteId,
      data: sanitizedData
    }
  }, 'Site updated successfully');
}));

// ==================== PRODUCTS ENDPOINTS ====================

/**
 * GET /api/sites/:siteId/products
 * Get products for a site
 */
router.get('/:siteId/products', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const userId = req.user.id || req.user.userId;

  // Verify ownership
  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const siteData = parseSiteData(ownership.site);

  // Normalize products/services structure
  let products = [];
  if (Array.isArray(siteData.products)) {
    products = siteData.products.map((p, index) => ({
      id: p.id || `product-${index}`,
      name: p.name || '',
      description: p.description || '',
      price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
      image: p.image || null,
      category: p.category || 'General',
      stock: p.stock || null,
      sku: p.sku || null
    }));
  } else if (siteData.services?.items && Array.isArray(siteData.services.items)) {
    // Convert services to products format
    products = siteData.services.items.map((s, index) => ({
      id: s.id || `service-${index}`,
      name: s.title || s.name || '',
      description: s.description || '',
      price: typeof s.price === 'number' ? s.price : parseFloat(s.price) || 0,
      image: s.image || null,
      category: 'Service'
    }));
  }

  return sendSuccess(res, { products });
}));

/**
 * PUT /api/sites/:siteId/products
 * Update products for a site
 */
router.put('/:siteId/products', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const userId = req.user.id || req.user.userId;
  const { products } = req.body;

  // Validate products array
  if (!Array.isArray(products)) {
    return sendBadRequest(res, 'Products must be an array', 'INVALID_PRODUCTS');
  }

  // Verify ownership
  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Validate and sanitize products
  const sanitizedProducts = products.slice(0, 100).map((p, index) => ({
    id: p.id || `product-${Date.now()}-${index}`,
    name: String(p.name || '').substring(0, 200),
    description: String(p.description || '').substring(0, 1000),
    price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
    image: p.image ? String(p.image).substring(0, 500) : null,
    category: String(p.category || 'General').substring(0, 100),
    stock: typeof p.stock === 'number' ? p.stock : null,
    sku: p.sku ? String(p.sku).substring(0, 50) : null
  }));

  // Get existing data and update products
  const existingData = parseSiteData(ownership.site);
  existingData.products = sanitizedProducts;

  // Also update services if they exist (for templates that use services)
  if (existingData.services?.items) {
    existingData.services.items = sanitizedProducts.map(p => ({
      id: p.id,
      title: p.name,
      description: p.description,
      price: p.price,
      image: p.image
    }));
  }

  // Save to database
  await prisma.sites.update({
    where: { id: siteId },
    data: {
      site_data: existingData,
      updated_at: new Date()
    }
  });

  return sendSuccess(res, { products: sanitizedProducts }, 'Products updated successfully');
}));

// ==================== VISIBILITY ENDPOINTS ====================

/**
 * PUT /api/sites/:siteId/public
 * Toggle site public visibility (for showcase)
 */
router.put('/:siteId/public', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const { isPublic } = req.body;
  const userId = req.user.id || req.user.userId;

  if (typeof isPublic !== 'boolean') {
    return sendBadRequest(res, 'isPublic must be a boolean', 'INVALID_VALUE');
  }

  // Verify ownership
  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Check if site is published
  if (ownership.site.status !== 'published') {
    return sendBadRequest(res, 'Only published sites can be made public', 'NOT_PUBLISHED');
  }

  const updated = await prisma.sites.update({
    where: { id: siteId },
    data: { is_public: isPublic }
  });

  return sendSuccess(res, { isPublic: updated.is_public }, 
    isPublic ? 'Site is now public' : 'Site is now private');
}));

// ==================== USER'S SITES LIST ====================

/**
 * GET /api/sites
 * Get all sites for the authenticated user
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { status } = req.query;

  const where = { user_id: userId };
  if (status) {
    where.status = status;
  }

  const sites = await prisma.sites.findMany({
    where,
    select: {
      id: true,
      subdomain: true,
      template_id: true,
      status: true,
      plan: true,
      is_public: true,
      created_at: true,
      updated_at: true,
      published_at: true,
      expires_at: true,
      site_data: true
    },
    orderBy: { created_at: 'desc' }
  });

  const formattedSites = sites.map(site => {
    const siteData = parseSiteData(site);
    return {
      id: site.id,
      subdomain: site.subdomain,
      templateId: site.template_id,
      status: site.status,
      plan: site.plan,
      isPublic: site.is_public,
      businessName: siteData.brand?.name || siteData.businessName || null,
      createdAt: site.created_at,
      updatedAt: site.updated_at,
      publishedAt: site.published_at,
      expiresAt: site.expires_at
    };
  });

  return sendSuccess(res, { sites: formattedSites });
}));

/**
 * DELETE /api/sites/:siteId
 * Delete a site
 */
router.delete('/:siteId', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const userId = req.user.id || req.user.userId;

  // Verify ownership
  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Delete related data first (submissions, analytics)
  await prisma.submissions.deleteMany({ where: { site_id: siteId } });
  await prisma.analytics_events.deleteMany({ where: { site_id: siteId } });

  // Delete the site
  await prisma.sites.delete({ where: { id: siteId } });

  // Try to delete site files (non-blocking)
  const siteDir = path.join(publicDir, 'sites', siteId);
  fs.rm(siteDir, { recursive: true, force: true }).catch(() => { });

  return sendSuccess(res, {}, 'Site deleted successfully');
}));

// ==================== TEMPLATE LOADING ====================

/**
 * GET /api/sites/templates/:templateId
 * Get template data
 */
router.get('/templates/:templateId', asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  // Validate template ID
  if (!templateId || !/^[a-z0-9-]+$/.test(templateId)) {
    return sendBadRequest(res, 'Invalid template ID', 'INVALID_TEMPLATE');
  }

  try {
    const templateFile = path.join(templatesDir, `${templateId}.json`);
    const templateRaw = await fs.readFile(templateFile, 'utf-8');
    const template = JSON.parse(templateRaw);

    return sendSuccess(res, { template });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return sendNotFound(res, 'Template', 'TEMPLATE_NOT_FOUND');
    }
    throw err;
  }
}));

export default router;
