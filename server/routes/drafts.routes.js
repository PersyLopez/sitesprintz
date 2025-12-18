/**
 * Drafts Routes
 * 
 * Handles draft creation, retrieval, and publishing.
 * Drafts are stored in the database (not file system) for reliability.
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';
import { sanitizeSiteDataForStorage } from '../utils/siteDataSanitizer.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendGone,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';
import {
  validateEmail,
  validateTemplateId,
  validatePlan,
  sanitizeBusinessData,
  generateSecureId,
  generateSecurePassword
} from '../utils/validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const publicDir = path.join(__dirname, '../../public');
const templatesDir = path.join(publicDir, 'data', 'templates');

// Draft expiration time (7 days)
const DRAFT_EXPIRY_DAYS = 7;

/**
 * POST /api/drafts
 * Create a new draft
 */
router.post('/', asyncHandler(async (req, res) => {
  const draftData = req.body;

  // Validate template ID
  const templateId = draftData.templateId || draftData.data?.template || draftData.template;
  const templateValidation = validateTemplateId(templateId);
  
  if (!templateValidation.valid) {
    return sendBadRequest(res, templateValidation.error, 'INVALID_TEMPLATE');
  }

  // Sanitize business data
  const businessData = sanitizeBusinessData(draftData.businessData || draftData.data || {});

  // Generate draft ID
  const draftId = generateSecureId('draft');

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DRAFT_EXPIRY_DAYS);

  // Check if drafts table exists (graceful fallback to file storage if not)
  let useDatabase = true;
  try {
    await prisma.$queryRaw`SELECT 1 FROM drafts LIMIT 1`;
  } catch (error) {
    // Table doesn't exist, fall back to file storage
    console.warn('Drafts table not found, using file storage fallback');
    useDatabase = false;
  }

  if (useDatabase) {
    // Store in database
    await prisma.$executeRaw`
      INSERT INTO drafts (id, template_id, business_data, status, expires_at, created_at, updated_at)
      VALUES (${draftId}, ${templateValidation.value}, ${JSON.stringify(businessData)}::jsonb, 'draft', ${expiresAt}, NOW(), NOW())
    `;
  } else {
    // Fallback to file storage
    const draftsDir = path.join(publicDir, 'drafts');
    await fs.mkdir(draftsDir, { recursive: true });
    
    const draft = {
      id: draftId,
      draftId: draftId,
      templateId: templateValidation.value,
      template: templateValidation.value,
      businessData: businessData,
      data: businessData,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    await fs.writeFile(
      path.join(draftsDir, `${draftId}.json`),
      JSON.stringify(draft, null, 2)
    );
  }

  return sendCreated(res, {
    id: draftId,
    draftId: draftId,
    templateId: templateValidation.value,
    previewUrl: `/preview/${draftId}`,
    expiresAt: expiresAt.toISOString(),
    data: businessData
  }, 'Draft created successfully');
}));

/**
 * GET /api/drafts/:draftId
 * Get a draft by ID
 */
router.get('/:draftId', asyncHandler(async (req, res) => {
  const { draftId } = req.params;

  if (!draftId || !draftId.startsWith('draft-')) {
    return sendBadRequest(res, 'Invalid draft ID', 'INVALID_DRAFT_ID');
  }

  // Try database first
  let draft = null;
  let useDatabase = true;
  
  try {
    const result = await prisma.$queryRaw`
      SELECT id, template_id, business_data, status, created_at, updated_at, expires_at
      FROM drafts
      WHERE id = ${draftId}
    `;
    
    if (result && result.length > 0) {
      draft = result[0];
    }
  } catch (error) {
    // Table doesn't exist, try file fallback
    useDatabase = false;
  }

  // Fallback to file storage
  if (!draft && !useDatabase) {
    try {
      const draftFile = path.join(publicDir, 'drafts', `${draftId}.json`);
      const draftRaw = await fs.readFile(draftFile, 'utf-8');
      const fileDraft = JSON.parse(draftRaw);
      
      draft = {
        id: fileDraft.id || fileDraft.draftId,
        template_id: fileDraft.templateId || fileDraft.template,
        business_data: fileDraft.businessData || fileDraft.data || {},
        status: fileDraft.status || 'draft',
        created_at: fileDraft.createdAt,
        updated_at: fileDraft.updatedAt,
        expires_at: fileDraft.expiresAt
      };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return sendNotFound(res, 'Draft', 'DRAFT_NOT_FOUND');
      }
      throw err;
    }
  }

  if (!draft) {
    return sendNotFound(res, 'Draft', 'DRAFT_NOT_FOUND');
  }

  // Check expiration
  if (new Date(draft.expires_at) < new Date()) {
    // Clean up expired draft
    if (useDatabase) {
      await prisma.$executeRaw`
        UPDATE drafts SET status = 'expired' WHERE id = ${draftId}
      `;
    } else {
      try {
        await fs.unlink(path.join(publicDir, 'drafts', `${draftId}.json`));
      } catch (e) { /* ignore */ }
    }
    return sendGone(res, 'Draft has expired', 'DRAFT_EXPIRED');
  }

  return sendSuccess(res, {
    id: draft.id,
    draftId: draft.id,
    templateId: draft.template_id,
    template: draft.template_id,
    businessData: draft.business_data,
    data: draft.business_data,
    status: draft.status,
    createdAt: draft.created_at,
    updatedAt: draft.updated_at,
    expiresAt: draft.expires_at
  });
}));

/**
 * PUT /api/drafts/:draftId
 * Update a draft
 */
router.put('/:draftId', asyncHandler(async (req, res) => {
  const { draftId } = req.params;
  const updateData = req.body;

  if (!draftId || !draftId.startsWith('draft-')) {
    return sendBadRequest(res, 'Invalid draft ID', 'INVALID_DRAFT_ID');
  }

  // Sanitize business data
  const businessData = sanitizeBusinessData(updateData.businessData || updateData.data || {});

  // Try database first
  let useDatabase = true;
  try {
    const result = await prisma.$executeRaw`
      UPDATE drafts 
      SET business_data = ${JSON.stringify(businessData)}::jsonb, updated_at = NOW()
      WHERE id = ${draftId} AND status = 'draft'
    `;
    
    if (result === 0) {
      // Draft not found in database
      useDatabase = false;
    }
  } catch (error) {
    useDatabase = false;
  }

  // Fallback to file storage
  if (!useDatabase) {
    try {
      const draftFile = path.join(publicDir, 'drafts', `${draftId}.json`);
      const draftRaw = await fs.readFile(draftFile, 'utf-8');
      const draft = JSON.parse(draftRaw);
      
      draft.businessData = businessData;
      draft.data = businessData;
      draft.updatedAt = new Date().toISOString();
      
      await fs.writeFile(draftFile, JSON.stringify(draft, null, 2));
    } catch (err) {
      if (err.code === 'ENOENT') {
        return sendNotFound(res, 'Draft', 'DRAFT_NOT_FOUND');
      }
      throw err;
    }
  }

  return sendSuccess(res, {
    id: draftId,
    draftId: draftId,
    businessData: businessData,
    data: businessData,
    updatedAt: new Date().toISOString()
  }, 'Draft updated successfully');
}));

/**
 * DELETE /api/drafts/:draftId
 * Delete a draft
 */
router.delete('/:draftId', asyncHandler(async (req, res) => {
  const { draftId } = req.params;

  if (!draftId || !draftId.startsWith('draft-')) {
    return sendBadRequest(res, 'Invalid draft ID', 'INVALID_DRAFT_ID');
  }

  // Try database first
  let deleted = false;
  try {
    const result = await prisma.$executeRaw`
      UPDATE drafts SET status = 'deleted' WHERE id = ${draftId}
    `;
    deleted = result > 0;
  } catch (error) {
    // Table doesn't exist, try file
  }

  // Fallback to file storage
  if (!deleted) {
    try {
      await fs.unlink(path.join(publicDir, 'drafts', `${draftId}.json`));
      deleted = true;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  return sendSuccess(res, {}, 'Draft deleted successfully');
}));

/**
 * POST /api/drafts/:draftId/publish
 * Publish a draft as a live site
 */
router.post('/:draftId/publish', asyncHandler(async (req, res) => {
  const { draftId } = req.params;
  const { plan, email } = req.body || {};

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return sendBadRequest(res, emailValidation.error, 'INVALID_EMAIL');
  }

  // Validate plan
  const planValidation = validatePlan(plan);
  if (!planValidation.valid) {
    return sendBadRequest(res, planValidation.error, 'INVALID_PLAN');
  }

  // Get draft (try database first, then file)
  let draft = null;
  let useDatabase = true;
  
  try {
    const result = await prisma.$queryRaw`
      SELECT id, template_id, business_data, status, expires_at
      FROM drafts
      WHERE id = ${draftId} AND status = 'draft'
    `;
    
    if (result && result.length > 0) {
      draft = result[0];
    }
  } catch (error) {
    useDatabase = false;
  }

  // Fallback to file
  if (!draft) {
    try {
      const draftFile = path.join(publicDir, 'drafts', `${draftId}.json`);
      const draftRaw = await fs.readFile(draftFile, 'utf-8');
      const fileDraft = JSON.parse(draftRaw);
      
      draft = {
        id: fileDraft.id || fileDraft.draftId,
        template_id: fileDraft.templateId || fileDraft.template,
        business_data: fileDraft.businessData || fileDraft.data || {},
        status: fileDraft.status || 'draft',
        expires_at: fileDraft.expiresAt
      };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return sendNotFound(res, 'Draft', 'DRAFT_NOT_FOUND');
      }
      throw err;
    }
  }

  if (!draft) {
    return sendNotFound(res, 'Draft', 'DRAFT_NOT_FOUND');
  }

  // Check expiration
  if (new Date(draft.expires_at) < new Date()) {
    return sendGone(res, 'Draft has expired', 'DRAFT_EXPIRED');
  }

  // Load template
  const templateFile = path.join(templatesDir, `${draft.template_id}.json`);
  let siteData;
  
  try {
    const templateRaw = await fs.readFile(templateFile, 'utf-8');
    siteData = JSON.parse(templateRaw);
  } catch (err) {
    // Try starter template as fallback
    try {
      const starterRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
      siteData = JSON.parse(starterRaw);
    } catch (e) {
      return sendNotFound(res, 'Template', 'TEMPLATE_NOT_FOUND');
    }
  }

  // Merge draft business data into site data
  const businessData = draft.business_data || {};
  
  if (businessData.businessName) {
    siteData.brand = siteData.brand || {};
    siteData.brand.name = businessData.businessName;
  }
  
  if (siteData.hero) {
    if (businessData.heroTitle) siteData.hero.title = businessData.heroTitle;
    if (businessData.heroSubtitle) siteData.hero.subtitle = businessData.heroSubtitle;
    if (businessData.heroImage) siteData.hero.image = businessData.heroImage;
  }
  
  if (siteData.contact) {
    if (businessData.email) siteData.contact.email = businessData.email;
    if (businessData.phone) siteData.contact.phone = businessData.phone;
    if (businessData.address) siteData.contact.subtitle = businessData.address;
    if (businessData.businessHours) siteData.contact.hours = businessData.businessHours;
  }
  
  siteData.social = siteData.social || {};
  if (businessData.websiteUrl) siteData.social.website = businessData.websiteUrl;
  if (businessData.facebookUrl) siteData.social.facebook = businessData.facebookUrl;
  if (businessData.instagramUrl) siteData.social.instagram = businessData.instagramUrl;
  if (businessData.googleMapsUrl) siteData.social.maps = businessData.googleMapsUrl;

  // Generate unique subdomain
  const businessName = siteData.brand?.name || 'my-site';
  const baseSubdomain = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);

  let subdomain = baseSubdomain || 'site';
  let attempt = 0;
  const maxAttempts = 10;

  while (attempt < maxAttempts) {
    const existing = await prisma.sites.findFirst({
      where: { subdomain },
      select: { id: true }
    });
    
    if (!existing) break;
    
    attempt++;
    const suffix = generateSecureId('').substring(0, 8);
    subdomain = `${baseSubdomain}-${suffix}`;
  }

  // Create site directory
  const siteDir = path.join(publicDir, 'sites', subdomain);
  await fs.mkdir(siteDir, { recursive: true });
  await fs.mkdir(path.join(siteDir, 'data'), { recursive: true });

  // Save site data file
  await fs.writeFile(
    path.join(siteDir, 'data', 'site.json'),
    JSON.stringify(siteData, null, 2)
  );

  // Copy site template
  try {
    const indexContent = await fs.readFile(
      path.join(publicDir, 'site-template.html'),
      'utf-8'
    );
    await fs.writeFile(path.join(siteDir, 'index.html'), indexContent);
  } catch (e) {
    console.warn('Could not copy site template:', e.message);
  }

  // Get or create user
  let user = await prisma.users.findUnique({
    where: { email: emailValidation.value }
  });

  let userId;
  let isNewUser = false;
  
  if (!user) {
    const tempPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    user = await prisma.users.create({
      data: {
        email: emailValidation.value,
        password_hash: hashedPassword,
        role: 'user',
        status: 'pending',
        created_at: new Date()
      }
    });

    userId = user.id;
    isNewUser = true;

    // Send welcome email (non-blocking)
    sendEmail(emailValidation.value, EmailTypes.WELCOME, { 
      email: emailValidation.value 
    }).catch(err => console.error('Failed to send welcome email:', err));
  } else {
    userId = user.id;
  }

  // Set trial expiration
  const trialExpiresAt = new Date();
  trialExpiresAt.setDate(trialExpiresAt.getDate() + 7);

  // Sanitize site data
  const sanitizedSiteData = sanitizeSiteDataForStorage(siteData);

  // Create site record
  const siteId = subdomain;
  
  await prisma.sites.create({
    data: {
      id: siteId,
      user_id: userId,
      subdomain,
      template_id: draft.template_id,
      status: 'published',
      plan: planValidation.value,
      published_at: new Date(),
      expires_at: trialExpiresAt,
      site_data: sanitizedSiteData,
      json_file_path: path.join('sites', subdomain, 'data', 'site.json')
    }
  });

  // Mark draft as published
  if (useDatabase) {
    await prisma.$executeRaw`
      UPDATE drafts 
      SET status = 'published', published_at = NOW(), published_site_id = ${siteId}
      WHERE id = ${draftId}
    `;
  } else {
    try {
      await fs.unlink(path.join(publicDir, 'drafts', `${draftId}.json`));
    } catch (e) { /* ignore */ }
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  return sendSuccess(res, {
    subdomain,
    url: `${baseUrl}/sites/${subdomain}`,
    businessName: siteData.brand?.name,
    trialDays: 7,
    isNewUser,
    site: {
      id: siteId,
      subdomain,
      url: `${baseUrl}/sites/${subdomain}`,
      businessName: siteData.brand?.name,
      templateId: draft.template_id,
      plan: planValidation.value,
      expiresAt: trialExpiresAt.toISOString()
    }
  }, 'Site published successfully');
}));

export default router;
