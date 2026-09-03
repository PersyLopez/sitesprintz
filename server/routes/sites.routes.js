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
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';
import { sanitizeSiteDataForStorage } from '../utils/siteDataSanitizer.js';
import { attachSpanishLocale } from '../services/siteTranslationService.js';
import { applyPayOnSiteSetting, mergeSiteDataSettings } from '../utils/payOnSite.js';
import { applyDeliverySetting, getPublicDeliveryConfig, shopHasDeliveryOrigin } from '../utils/delivery.js';
import { toPublicSiteData } from '../../src/utils/liveSiteContact.js';
import { prepareOwnerSiteData } from '../utils/prepareSiteLocation.js';
import { resolvePlanLimits } from '../utils/resolveUserPlan.js';
import {
  canOccupyPublishedSiteSlot,
  countBillablePublishedSites,
  countPaidSiteSlots,
} from '../services/subscriptionService.js';
import { liveTrialExpiresAt } from '../config/platformPlans.js';
import AnalyticsService from '../services/analyticsService.js';
import { validateTemplateId } from '../utils/validators.js';
import {
  PathEscapeError,
  allocateUniqueSubdomain,
  cloneIsolatedSiteData,
  getTemplateFilePath,
  removeIsolatedSiteFiles,
  writeIsolatedSiteFiles
} from '../utils/siteIsolation.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');
const uploadsDir = path.join(publicDir, 'uploads');

// Ensure uploads directory exists
fs.mkdir(uploadsDir, { recursive: true }).catch(() => { });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Prefix with user id so deletes can be ownership-scoped
    const userId = String(req.user?.id || req.user?.userId || 'anon')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 36) || 'anon';
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    cb(null, `${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Ban SVG — can carry script payloads when served inline
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

/**
 * Helper: Verify site ownership
 */
async function verifySiteOwnership(siteId, userId, userRole) {
  let site = await prisma.sites.findUnique({
    where: { id: siteId },
    select: { id: true, user_id: true, site_data: true, status: true, subdomain: true }
  });

  if (!site) {
    site = await prisma.sites.findFirst({
      where: { subdomain: siteId },
      select: { id: true, user_id: true, site_data: true, status: true, subdomain: true }
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
  const userId = req.user.id || req.user.userId;

  // Validate filename to prevent directory traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return sendBadRequest(res, 'Invalid filename', 'INVALID_FILENAME');
  }

  // Ownership: file must be prefixed with the uploader's user id (or admin)
  const ownerPrefix = `${String(userId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36)}-`;
  if (req.user.role !== 'admin' && !filename.startsWith(ownerPrefix)) {
    return sendForbidden(res, 'Not authorized to delete this file', 'ACCESS_DENIED');
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

  try {
    let site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        subdomain: true,
        template_id: true,
        status: true,
        plan: true,
        site_data: true,
        created_at: true,
        published_at: true,
        expires_at: true,
        is_public: true,
        user_id: true
      }
    });

    // If not found by ID, try subdomain
    if (!site) {
      site = await prisma.sites.findUnique({
        where: { subdomain: siteId },
        select: {
          id: true,
          subdomain: true,
          template_id: true,
          status: true,
          plan: true,
          site_data: true,
          created_at: true,
          published_at: true,
          expires_at: true,
          is_public: true,
          user_id: true
        }
      });
    }

    if (!site) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }

    const isPublicPublished = site.status === 'published' && site.is_public !== false;
    const authHeader = req.headers.authorization;
    let isOwner = false;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { default: jwt } = await import('jsonwebtoken');
        const { getRequiredSecret } = await import('../config/secrets.js');
        const decoded = jwt.verify(authHeader.slice(7), getRequiredSecret('JWT_SECRET', { allowTestFallback: true }));
        const userId = decoded.userId || decoded.id;
        isOwner = userId === site.user_id || decoded.role === 'admin';
      } catch {
        isOwner = false;
      }
    }

    if (!isPublicPublished && !isOwner) {
      return sendForbidden(res, 'Site is not publicly available', 'SITE_PRIVATE');
    }

    const rawSiteData = parseSiteData(site);
    const siteData = isOwner ? rawSiteData : toPublicSiteData(rawSiteData);

    return sendSuccess(res, {
      site: {
        id: site.id,
        subdomain: site.subdomain,
        templateId: site.template_id,
        status: site.status,
        plan: site.plan,
        isPublic: site.is_public,
        createdAt: site.created_at,
        publishedAt: site.published_at,
        expiresAt: site.expires_at,
        data: siteData
      }
    });
  } catch (err) {
    console.error(`[GET /api/sites/${siteId}] ERROR:`, err.message);
    return sendServerError(res, err, 'Failed to load site');
  }
}));

/**
 * PUT /api/sites/:siteId/payment-options
 * Enable/disable pay-on-site and/or product delivery on this Neon site row.
 */
router.put('/:siteId/payment-options', requireAuth, asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const userId = req.user.id || req.user.userId;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const hasPayOnSite = Object.prototype.hasOwnProperty.call(body, 'payOnSite');
  const hasDelivery = Object.prototype.hasOwnProperty.call(body, 'delivery');

  if (!hasPayOnSite && !hasDelivery) {
    return sendBadRequest(res, 'Provide payOnSite and/or delivery', 'MISSING_PAYMENT_OPTIONS');
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { plan: true, subscription_plan: true }
  });
  const limits = resolvePlanLimits(user);

  if (!limits.orderManagement) {
    return sendForbidden(res, 'Ordering options require a Growth plan', 'GROWTH_PLAN_REQUIRED');
  }

  const ownership = await verifySiteOwnership(siteId, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  let mergedData = parseSiteData(ownership.site);
  if (hasPayOnSite) {
    mergedData = applyPayOnSiteSetting(mergedData, body.payOnSite === true);
  }
  if (hasDelivery) {
    const deliveryResult = applyDeliverySetting(mergedData, body.delivery);
    if (deliveryResult.error) {
      return sendBadRequest(res, deliveryResult.error, deliveryResult.code || 'INVALID_DELIVERY');
    }
    mergedData = deliveryResult.siteData;
  }

  const sanitizedData = sanitizeSiteDataForStorage(mergedData);

  await prisma.sites.update({
    where: { id: ownership.site.id },
    data: { site_data: sanitizedData }
  });

  const delivery = getPublicDeliveryConfig(sanitizedData);
  return sendSuccess(res, {
    siteId: ownership.site.id,
    payOnSite: sanitizedData.settings?.payOnSite === true,
    delivery,
    deliveryOriginReady: shopHasDeliveryOrigin(sanitizedData),
  }, 'Payment options updated');
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
  const mergedData = mergeSiteDataSettings(existingData, newData);
  let preparedData = mergedData;
  try {
    preparedData = await prepareOwnerSiteData(mergedData, { siteId: ownership.site.id });
  } catch (error) {
    if (error.code === 'AREA_LOCATION_INCOMPLETE') {
      return sendBadRequest(res, error.message, error.code);
    }
    throw error;
  }

  // Sanitize, draft Spanish overlay, and save
  const sanitizedData = await attachSpanishLocale(sanitizeSiteDataForStorage(preparedData));

  await prisma.sites.update({
    where: { id: ownership.site.id },
    data: {
      site_data: sanitizedData
    }
  });

  if (ownership.site.status === 'published' && ownership.site.subdomain) {
    await writeIsolatedSiteFiles(ownership.site.subdomain, sanitizedData);
  }

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
      stock: p.stock ?? null,
      sku: p.sku || null,
      available: p.available !== false
    }));
  } else if (siteData.services?.items && Array.isArray(siteData.services.items)) {
    // Convert services to products format
    products = siteData.services.items.map((s, index) => ({
      id: s.id || `service-${index}`,
      title: s.title || s.name || '',
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
    stock: typeof p.stock === 'number' ? p.stock : (p.stock != null && p.stock !== '' ? parseInt(p.stock, 10) || null : null),
    sku: p.sku ? String(p.sku).substring(0, 50) : null,
    available: p.available !== false && p.available !== 'false' && p.available !== 0 && p.available !== '0'
  }));

  // Get existing data and update products only (never mirror into booking services)
  const existingData = parseSiteData(ownership.site);
  existingData.products = sanitizedProducts;

  // Save to database
  await prisma.sites.update({
    where: { id: ownership.site.id },
    data: {
      site_data: existingData
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
      published_at: true,
      expires_at: true,
      site_data: true
    },
    orderBy: { created_at: 'desc' }
  });

  const formattedSites = sites.map(site => {
    const siteData = parseSiteData(site);
    const delivery = getPublicDeliveryConfig(siteData);
    return {
      id: site.id,
      subdomain: site.subdomain,
      templateId: site.template_id,
      status: site.status,
      plan: site.plan,
      isPublic: site.is_public,
      businessName: siteData.brand?.name || siteData.businessName || null,
      payOnSite: siteData.settings?.payOnSite === true,
      allowCheckout: siteData.settings?.allowCheckout === true,
      delivery,
      deliveryOriginReady: shopHasDeliveryOrigin(siteData),
      createdAt: site.created_at,
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
  // Analytics cleanup is handled by Prisma CASCADE on foreign key
  await AnalyticsService.clearSiteData(siteId);

  // Delete the site
  await prisma.sites.delete({ where: { id: siteId } });

  // Try to delete isolated site files (non-blocking)
  try {
    const siteKey = ownership.site.subdomain || siteId;
    await removeIsolatedSiteFiles(siteKey);
  } catch (err) {
    if (!(err instanceof PathEscapeError)) {
      fs.rm(path.join(publicDir, 'sites', siteId), { recursive: true, force: true }).catch(() => { });
    }
  }

  return sendSuccess(res, {}, 'Site deleted successfully');
}));

/**
 * POST /api/sites/guest-publish
 * Instant publish for new/unauthenticated users
 */
router.post('/guest-publish', asyncHandler(async (req, res) => {
  const { email, data, template } = req.body;

  const emailValidation = email && typeof email === 'string'
    ? email.trim().toLowerCase()
    : '';
  if (!emailValidation) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!data) {
    return res.status(400).json({ error: 'Site data is required' });
  }

  const templateValidation = validateTemplateId(template || 'starter');
  if (!templateValidation.valid) {
    return res.status(400).json({ error: templateValidation.error, code: 'INVALID_TEMPLATE' });
  }

  // Get or create user
  let user = await prisma.users.findUnique({
    where: { email: emailValidation }
  });

  if (!user) {
    // Create a new user with pending status
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await import('bcryptjs').then(m => m.default.hash(tempPassword, 10));

    user = await prisma.users.create({
      data: {
        email: emailValidation,
        password_hash: hashedPassword,
        role: 'user',
        status: 'pending',
        created_at: new Date()
      }
    });
  }

  const publishedCount = await countBillablePublishedSites(user.id);
  const paidSlots = await countPaidSiteSlots(user);
  const alreadyHasSiteOrPlan = publishedCount > 0
    || user.subscription_status === 'active'
    || user.subscription_status === 'trialing';
  if (alreadyHasSiteOrPlan) {
    const slot = canOccupyPublishedSiteSlot({
      publishedCount,
      maxSites: paidSlots,
      isAdmin: user.role === 'admin',
    });
    if (!slot.allowed) {
      return sendBadRequest(res, slot.reason, slot.code);
    }
  }

  const businessName = data.brand?.name || data.businessName || 'my-site';
  const subdomain = await allocateUniqueSubdomain(businessName, async (slug) => {
    const existing = await prisma.sites.findFirst({
      where: { subdomain: slug },
      select: { id: true }
    });
    return Boolean(existing);
  });

  const isolatedData = cloneIsolatedSiteData(data, {
    siteId: subdomain,
    subdomain,
    templateId: templateValidation.value
  });
  let preparedData = isolatedData;
  try {
    preparedData = await prepareOwnerSiteData(isolatedData, { siteId: subdomain, forPublish: true });
  } catch (error) {
    if (error.code === 'AREA_LOCATION_INCOMPLETE') {
      return sendBadRequest(res, error.message, error.code);
    }
    throw error;
  }
  const sanitizedSiteData = await attachSpanishLocale(sanitizeSiteDataForStorage(preparedData));
  const siteFilesData = sanitizedSiteData?.locales
    ? { ...preparedData, locales: sanitizedSiteData.locales }
    : preparedData;

  await writeIsolatedSiteFiles(subdomain, siteFilesData);

  // Create site record
  let site;
  try {
    site = await prisma.sites.create({
      data: {
        id: subdomain,
        user_id: user.id,
        subdomain,
        template_id: templateValidation.value,
        status: 'published',
        plan: 'trial',
        published_at: new Date(),
        expires_at: liveTrialExpiresAt(),
        site_data: sanitizedSiteData,
        json_file_path: path.join('sites', subdomain, 'data', 'site.json'),
        created_at: new Date()
      }
    });
  } catch (error) {
    await removeIsolatedSiteFiles(subdomain).catch(() => {});
    throw error;
  }

  return res.status(201).json({
    success: true,
    subdomain: site.subdomain,
    message: 'Site published successfully! Check your email to manage it.'
  });
}));

// ==================== TEMPLATE LOADING ====================

/**
 * GET /api/sites/templates/:templateId
 * Get template data
 */
router.get('/templates/:templateId', asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const templateValidation = validateTemplateId(templateId);
  if (!templateValidation.valid) {
    return sendBadRequest(res, templateValidation.error, 'INVALID_TEMPLATE');
  }

  try {
    const templateFile = getTemplateFilePath(templateValidation.value);
    const templateRaw = await fs.readFile(templateFile, 'utf-8');
    const template = JSON.parse(templateRaw);

    return sendSuccess(res, { template });
  } catch (err) {
    if (err instanceof PathEscapeError) {
      return sendBadRequest(res, err.message, 'INVALID_TEMPLATE');
    }
    if (err.code === 'ENOENT') {
      return sendNotFound(res, 'Template', 'TEMPLATE_NOT_FOUND');
    }
    throw err;
  }
}));

export default router;
