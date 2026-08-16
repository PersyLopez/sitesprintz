/**
 * Drafts Routes
 * 
 * Handles draft creation, retrieval, and publishing.
 * Drafts are stored in the database (not file system) for reliability.
 */

import express from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';
import { sanitizeSiteDataForStorage } from '../utils/siteDataSanitizer.js';
import { TemplateNormalizer } from '../services/templateNormalizer.js';
import { hasFeature, FEATURES } from '../../src/utils/planFeatures.js';
import { normalizeTier } from '../../src/config/tiers.js';
import { resolveUserPlan } from '../utils/resolveUserPlan.js';
import { inheritPaymentAccountsForSite } from '../services/payments/processorConnectHelpers.js';
import { validateFeaturesForSave, resolvePaymentMethods } from '../../src/config/featureFlags.js';
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
  validateDraftId,
  validatePlan,
  sanitizeBusinessData,
  generateSecureId,
  generateSecurePassword
} from '../utils/validators.js';
import {
  PathEscapeError,
  allocateUniqueSubdomain,
  cloneIsolatedSiteData,
  deepClone,
  deleteDraftFile,
  isUniqueConstraintError,
  loadTemplateCopy,
  readDraftFile,
  removeIsolatedSiteFiles,
  writeDraftFile,
  writeIsolatedSiteFiles
} from '../utils/siteIsolation.js';

const router = express.Router();

// Draft expiration time (7 days)
const DRAFT_EXPIRY_DAYS = 7;

/**
 * Comprehensive merge function: Merge draft business data into normalized template
 * Preserves all user edits across all sections
 */
function mergeBusinessDataWithTemplate(template, businessData) {
  const merged = deepClone(template) || {};

  // Brand & hero section
  if (businessData.businessName) {
    merged.brand = merged.brand || {};
    merged.brand.name = businessData.businessName;
  }
  if (businessData.heroTitle) {
    merged.hero = merged.hero || {};
    merged.hero.title = businessData.heroTitle;
  }
  if (businessData.heroSubtitle) {
    merged.hero = merged.hero || {};
    merged.hero.subtitle = businessData.heroSubtitle;
  }
  if (businessData.heroImage) {
    merged.hero = merged.hero || {};
    merged.hero.image = businessData.heroImage;
  }
  if (businessData.tagline) {
    merged.brand = merged.brand || {};
    merged.brand.tagline = businessData.tagline;
  }

  // Contact section
  if (businessData.email || businessData.phone || businessData.address || businessData.businessHours) {
    merged.contact = merged.contact || {};
    if (businessData.email) merged.contact.email = businessData.email;
    if (businessData.phone) merged.contact.phone = businessData.phone;
    if (businessData.address) merged.contact.address = businessData.address;
    if (businessData.businessHours) merged.contact.hours = businessData.businessHours;
  }

  // Menu/Products (handle both formats)
  if (businessData.menu) {
    merged.menu = businessData.menu;  // Preserve full menu structure
  } else if (businessData.products) {
    // Convert products array to menu.sections format
    const categories = {};
    businessData.products.forEach(product => {
      const category = product.category || 'Main';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });
    merged.menu = {
      sections: Object.entries(categories).map(([name, items]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        description: '',
        items: items,
      })),
    };
  }

  // Team members
  if (businessData.team?.members) {
    merged.team = businessData.team;
  } else if (businessData.staff) {
    merged.team = { members: businessData.staff };
  }

  // Gallery
  if (businessData.gallery?.images || businessData.gallery?.categories) {
    merged.gallery = businessData.gallery;
  }

  // Testimonials
  if (businessData.testimonials?.items) {
    merged.testimonials = businessData.testimonials;
  } else if (Array.isArray(businessData.testimonials)) {
    merged.testimonials = { items: businessData.testimonials };
  }

  // Stats
  if (businessData.stats?.items) {
    merged.stats = businessData.stats;
  }

  // FAQ
  if (businessData.faq?.items) {
    merged.faq = businessData.faq;
  } else if (Array.isArray(businessData.faqs)) {
    merged.faq = { items: businessData.faqs };
  }

  // About section
  if (businessData.about) {
    merged.about = { ...merged.about, ...businessData.about };
  }

  // Special sections (Pro only)
  if (businessData.chefSpecials) {
    merged.chefSpecials = businessData.chefSpecials;
  }
  if (businessData.privateEvents) {
    merged.privateEvents = businessData.privateEvents;
  }
  if (businessData.credentials) {
    merged.credentials = businessData.credentials;
  }

  // Social links
  if (businessData.social) {
    merged.social = {
      ...merged.social,
      ...businessData.social
    };
  } else {
    merged.social = merged.social || {};
    if (businessData.websiteUrl) merged.social.website = businessData.websiteUrl;
    if (businessData.facebookUrl) merged.social.facebook = businessData.facebookUrl;
    if (businessData.instagramUrl) merged.social.instagram = businessData.instagramUrl;
    if (businessData.googleMapsUrl) merged.social.googleMapsUrl = businessData.googleMapsUrl;
  }

  // Colors/Theme
  if (businessData.colors) {
    merged.themeVars = {
      ...merged.themeVars,
      ...businessData.colors
    };
  }

  // Features (preserve template features, but allow overrides)
  if (businessData.features) {
    merged.features = {
      ...merged.features,
      ...businessData.features
    };
  }

  // Booking configuration
  if (businessData.booking) {
    merged.booking = {
      ...merged.booking,
      ...businessData.booking
    };
  }

  // Canonical sections array (page builder)
  if (Array.isArray(businessData.sections) && businessData.sections.length > 0) {
    merged.sections = businessData.sections;
  }

  if (Array.isArray(businessData.nav) && businessData.nav.length > 0) {
    merged.nav = businessData.nav;
  }

  for (const key of ['_layout', '_level', '_niche', '_features', '_operatingModel', '_theme', '_themeId']) {
    if (businessData[key] != null) {
      merged[key] = businessData[key];
    }
  }

  // Settings / contact / brand objects from editor
  if (businessData.settings && typeof businessData.settings === 'object') {
    merged.settings = { ...(merged.settings || {}), ...businessData.settings };
  }
  if (businessData.contact && typeof businessData.contact === 'object') {
    merged.contact = { ...(merged.contact || {}), ...businessData.contact };
  }
  if (businessData.brand && typeof businessData.brand === 'object') {
    merged.brand = { ...(merged.brand || {}), ...businessData.brand };
  }
  if (businessData.hero && typeof businessData.hero === 'object') {
    merged.hero = { ...(merged.hero || {}), ...businessData.hero };
  }
  if (businessData.beforeAfter) {
    merged.beforeAfter = businessData.beforeAfter;
  }
  if (Array.isArray(businessData.products) && businessData.products.length > 0) {
    merged.products = businessData.products;
  }

  return merged;
}

/**
 * Convert menu sections into a flat products array for cart/checkout
 */
function flattenMenuToProducts(menu) {
  if (!menu?.sections?.length) return [];

  const products = [];
  menu.sections.forEach((section) => {
    (section.items || []).forEach((item, idx) => {
      if (item.price == null) return;
      const sectionKey = (section.id || section.name || 'menu')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      products.push({
        id: item.id || `${sectionKey}-${idx}-${String(item.name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: item.name,
        price: item.price,
        description: item.description || '',
        image: item.image || '',
        category: section.name || 'Menu'
      });
    });
  });
  return products;
}

/**
 * Filter template features based on user's subscription tier
 * Removes features user doesn't have access to
 */
function filterFeaturesByPlan(siteData, userPlan) {
  const plan = normalizeTier(userPlan);
  const filtered = deepClone(siteData) || {};
  
  // Filter features object
  if (filtered.features) {
    filtered.features = {
      bookingWidget: {
        ...filtered.features.bookingWidget,
        enabled: filtered.features.bookingWidget?.enabled 
          && hasFeature(plan, FEATURES.EMBEDDED_BOOKING)
      },
      tabbedMenu: filtered.features.tabbedMenu 
        && hasFeature(plan, FEATURES.SERVICE_DISPLAY),
      stripeCheckout: hasFeature(plan, FEATURES.STRIPE_CHECKOUT),
      shoppingCart: hasFeature(plan, FEATURES.SHOPPING_CART),
      orderManagement: hasFeature(plan, FEATURES.ORDER_MANAGEMENT),
      gallery: {
        ...filtered.features.gallery,
        filterable: filtered.features.gallery?.filterable 
          && hasFeature(plan, FEATURES.FILTERS)
      },
      privateEvents: {
        ...filtered.features.privateEvents,
        enabled: filtered.features.privateEvents?.enabled 
          && hasFeature(plan, FEATURES.EMBEDDED_BOOKING)
      },
      ownerDashboard: filtered.features.ownerDashboard 
        && hasFeature(plan, FEATURES.BASIC_ANALYTICS),
      analytics: filtered.features.analytics 
        && hasFeature(plan, FEATURES.BASIC_ANALYTICS),
    };
  }
  
  // Booking: keep basic link for Starter; full widget only for Growth
  if (!hasFeature(plan, FEATURES.EMBEDDED_BOOKING)) {
    if (hasFeature(plan, FEATURES.BASIC_BOOKING_LINK) && filtered.booking) {
      filtered.booking = {
        ...filtered.booking,
        enabled: true,
        mode: 'link',
        provider: filtered.booking.provider || filtered.booking.url ? (filtered.booking.provider || 'external') : 'link',
        embedded: false
      };
      if (filtered.features?.bookingWidget) {
        filtered.features.bookingWidget.enabled = false;
      }
    } else {
      delete filtered.booking;
      if (filtered.features?.bookingWidget) {
        filtered.features.bookingWidget.enabled = false;
      }
    }
  } else if (filtered.booking) {
    filtered.booking.enabled = true;
    filtered.booking.embedded = true;
  }

  if (Array.isArray(filtered.sections) && !hasFeature(plan, FEATURES.EMBEDDED_BOOKING)) {
    const linkOnly = hasFeature(plan, FEATURES.BASIC_BOOKING_LINK);
    filtered.sections = filtered.sections.map((section) => {
      if (section?.type !== 'booking' && section?.type !== 'native-booking') return section;
      return {
        ...section,
        content: {
          ...(section.content || {}),
          embedded: false,
          mode: linkOnly ? 'link' : 'off',
          enabled: linkOnly
        }
      };
    });
  }
  
  // Remove team profiles if the plan does not include STAFF_PROFILES
  if (!hasFeature(plan, FEATURES.STAFF_PROFILES)) {
    delete filtered.team;
    if (Array.isArray(filtered.sections)) {
      filtered.sections = filtered.sections.filter((section) => section?.type !== 'team');
    }
    if (Array.isArray(filtered.nav)) {
      filtered.nav = filtered.nav.filter((item) => !String(item?.href || '').includes('#team'));
    }
  }

  // FAQ / before-after (Starter+)
  if (!hasFeature(plan, FEATURES.FAQ_SECTION)) {
    delete filtered.faq;
  }
  if (!hasFeature(plan, FEATURES.BEFORE_AFTER_GALLERY)) {
    delete filtered.beforeAfter;
  }
  
  // Remove filterable gallery if user doesn't have FILTERS
  if (!hasFeature(plan, FEATURES.FILTERS)) {
    if (filtered.gallery) {
      filtered.gallery = { ...filtered.gallery };
      delete filtered.gallery.categories;
    }
  }
  
  // Remove private events / chef specials without embedded booking
  if (!hasFeature(plan, FEATURES.EMBEDDED_BOOKING)) {
    delete filtered.privateEvents;
    delete filtered.chefSpecials;
  }
  
  // Checkout flags — keep display prices on Starter (service display), disable checkout only
  if (!hasFeature(plan, FEATURES.STRIPE_CHECKOUT)) {
    filtered.settings = {
      ...(filtered.settings || {}),
      allowCheckout: false,
      allowOrders: false,
      payOnSite: false
    };
  } else {
    filtered.settings = {
      ...(filtered.settings || {}),
      allowCheckout: true,
      allowOrders: hasFeature(plan, FEATURES.ORDER_MANAGEMENT),
      payOnSite: filtered.settings?.payOnSite === true
    };

    if ((!filtered.products || filtered.products.length === 0) && filtered.menu?.sections?.length) {
      filtered.products = flattenMenuToProducts(filtered.menu);
    }
  }
  
  if (!hasFeature(plan, FEATURES.ORDER_MANAGEMENT)) {
    filtered.settings = {
      ...(filtered.settings || {}),
      allowOrders: false
    };
  }

  // Persist plan + branding for published site runtime
  filtered.plan = plan;
  filtered.settings = {
    ...(filtered.settings || {}),
    removeBranding: hasFeature(plan, FEATURES.REMOVE_BRANDING),
    tier: plan
  };
  
  return filtered;
}

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
    // Fallback to private file storage (outside public/)
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

    await writeDraftFile(draftId, JSON.stringify(draft, null, 2));
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
  const draftIdValidation = validateDraftId(draftId);
  if (!draftIdValidation.valid) {
    return sendBadRequest(res, draftIdValidation.error, 'INVALID_DRAFT_ID');
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

  // Fallback to private file storage
  if (!draft && !useDatabase) {
    try {
      const draftRaw = await readDraftFile(draftId);
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
      if (err.code === 'ENOENT' || err instanceof PathEscapeError) {
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
      await deleteDraftFile(draftId).catch(() => {});
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
  const draftIdValidation = validateDraftId(draftId);
  if (!draftIdValidation.valid) {
    return sendBadRequest(res, draftIdValidation.error, 'INVALID_DRAFT_ID');
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

  // Fallback to private file storage
  if (!useDatabase) {
    try {
      const draftRaw = await readDraftFile(draftId);
      const draft = JSON.parse(draftRaw);
      
      draft.businessData = businessData;
      draft.data = businessData;
      draft.updatedAt = new Date().toISOString();
      
      await writeDraftFile(draftId, JSON.stringify(draft, null, 2));
    } catch (err) {
      if (err.code === 'ENOENT' || err instanceof PathEscapeError) {
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
  const draftIdValidation = validateDraftId(draftId);
  if (!draftIdValidation.valid) {
    return sendBadRequest(res, draftIdValidation.error, 'INVALID_DRAFT_ID');
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

  // Fallback to private file storage
  if (!deleted) {
    try {
      deleted = await deleteDraftFile(draftId);
    } catch (err) {
      if (err.code !== 'ENOENT' && !(err instanceof PathEscapeError)) {
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

  try {
    const draftIdValidation = validateDraftId(draftId);
    if (!draftIdValidation.valid) {
      return sendBadRequest(res, draftIdValidation.error, 'INVALID_DRAFT_ID');
    }

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

    // Get draft (try database first, then private file storage)
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
      console.error('[PUBLISH] Error querying database for draft:', error.message);
      useDatabase = false;
    }

    // Fallback to private file storage
    if (!draft) {
      try {
        const draftRaw = await readDraftFile(draftId);
        const fileDraft = JSON.parse(draftRaw);
        
        draft = {
          id: fileDraft.id || fileDraft.draftId,
          template_id: fileDraft.templateId || fileDraft.template,
          business_data: fileDraft.businessData || fileDraft.data || {},
          status: fileDraft.status || 'draft',
          expires_at: fileDraft.expiresAt
        };
      } catch (err) {
        if (err.code === 'ENOENT' || err instanceof PathEscapeError) {
          return sendNotFound(res, 'Draft', 'DRAFT_NOT_FOUND');
        }
        console.error('[PUBLISH] Error reading draft file:', err.message);
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

    const templateValidation = validateTemplateId(draft.template_id);
    if (!templateValidation.valid) {
      return sendBadRequest(res, templateValidation.error, 'INVALID_TEMPLATE');
    }

    let rawTemplate;
    try {
      rawTemplate = await loadTemplateCopy(templateValidation.value);
    } catch (err) {
      if (err instanceof PathEscapeError) {
        return sendBadRequest(res, err.message, 'INVALID_TEMPLATE');
      }
      console.error('[PUBLISH] Error loading template:', err.message);
      try {
        rawTemplate = await loadTemplateCopy('starter');
      } catch (e) {
        console.error('[PUBLISH] Error loading fallback template:', e.message);
        return sendNotFound(res, 'Template', 'TEMPLATE_NOT_FOUND');
      }
    }

    // Normalize a private copy of the template, then merge tenant business data
    let siteData = TemplateNormalizer.normalize(rawTemplate);
    const businessData = draft.business_data || {};
    siteData = mergeBusinessDataWithTemplate(siteData, businessData);

    // Get or create user (needed for feature gating)
    let user = await prisma.users.findUnique({
      where: { email: emailValidation.value },
      select: {
        id: true,
        subscription_status: true,
        subscription_plan: true,
        plan: true
      }
    });

    let userId;
    let isNewUser = false;
    
    if (!user) {
      console.log('[PUBLISH] User not found, creating new user:', emailValidation.value);
      const tempPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      user = await prisma.users.create({
        data: {
          email: emailValidation.value,
          password_hash: hashedPassword,
          role: 'user',
          status: 'pending',
          created_at: new Date()
        },
        select: {
          id: true,
          subscription_status: true,
          subscription_plan: true,
          plan: true
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

    // Apply feature gating based on user's subscription tier (before saving)
    const userPlan = resolveUserPlan(user);
    siteData = filterFeaturesByPlan(siteData, userPlan);

    // Validate feature flags after plan-based filtering
    const layoutKey = siteData._layout || siteData.layout;
    const features = siteData._features || siteData.features;
    const featureValidation = validateFeaturesForSave(layoutKey, features);
    if (!featureValidation.valid) {
      return sendBadRequest(res, featureValidation.errors[0], 'FEATURE_VALIDATION_FAILED');
    }

    // Resolve and persist payment methods
    siteData._paymentMethods = resolvePaymentMethods(features);

  // Gate subscription BEFORE writing files (avoid orphan site.json on failure)
  const hasActiveSubscription =
    user.subscription_status === 'active' || user.subscription_status === 'trialing';

  console.log('[PUBLISH] User subscription check:', {
    email: emailValidation.value,
    subscription_status: user.subscription_status,
    hasActiveSubscription,
    plan: userPlan
  });

  let sitePlan = userPlan || planValidation.value;
  let expiresAt = null;

  if (!hasActiveSubscription) {
    const publishedSites = await prisma.sites.findMany({
      where: {
        user_id: userId,
        status: 'published'
      },
      select: { id: true }
    });

    if (publishedSites.length === 0) {
      return sendBadRequest(res, 'Payment method required to start free trial. Please add a payment method.', 'PAYMENT_METHOD_REQUIRED');
    }
    return sendBadRequest(res, 'Subscription required. Please subscribe to a plan to publish additional sites.', 'SUBSCRIPTION_REQUIRED');
  }

  // Allocate an isolated subdomain, write contained files, then persist.
  // Retry on unique-constraint races so two publishes cannot share a directory.
  const businessName = siteData.brand?.name || 'my-site';
  let subdomain;
  let siteId;
  let sanitizedSiteData;
  const maxCreateAttempts = 3;

  try {
    sanitizedSiteData = sanitizeSiteDataForStorage(siteData);
  } catch (error) {
    console.error('[PUBLISH] Error sanitizing site data:', error.message);
    return sendServerError(res, 'Failed to prepare site data for storage', 'SANITIZATION_ERROR');
  }

  for (let createAttempt = 0; createAttempt < maxCreateAttempts; createAttempt += 1) {
    subdomain = await allocateUniqueSubdomain(businessName, async (slug) => {
      const existing = await prisma.sites.findFirst({
        where: { subdomain: slug },
        select: { id: true }
      });
      return Boolean(existing);
    });

    siteId = subdomain;
    siteData = cloneIsolatedSiteData(siteData, {
      siteId,
      subdomain,
      templateId: templateValidation.value
    });
    sanitizedSiteData = sanitizeSiteDataForStorage(siteData);

    try {
      await writeIsolatedSiteFiles(subdomain, siteData);
    } catch (error) {
      console.error('[PUBLISH] Error writing isolated site files:', error.message);
      return sendServerError(res, 'Failed to write site data file', 'FILE_WRITE_ERROR');
    }

    try {
      await prisma.sites.create({
        data: {
          id: siteId,
          user_id: userId,
          subdomain,
          template_id: templateValidation.value,
          status: 'published',
          plan: sitePlan,
          published_at: new Date(),
          expires_at: expiresAt,
          site_data: sanitizedSiteData,
          json_file_path: path.join('sites', subdomain, 'data', 'site.json')
        }
      });
      await inheritPaymentAccountsForSite(userId, siteId).catch(() => {});
      break;
    } catch (error) {
      await removeIsolatedSiteFiles(subdomain).catch(() => {});
      if (isUniqueConstraintError(error) && createAttempt < maxCreateAttempts - 1) {
        continue;
      }
      console.error('[PUBLISH] Error creating site record:', error.message);
      return sendServerError(res, 'Failed to create site record', 'DATABASE_ERROR');
    }
  }

  // Mark draft as published
  try {
    if (useDatabase) {
      await prisma.$executeRaw`
        UPDATE drafts 
        SET status = 'published', published_at = NOW(), published_site_id = ${siteId}
        WHERE id = ${draftId}
      `;
    } else {
      await deleteDraftFile(draftId).catch(() => {});
    }
  } catch (error) {
    console.error('[PUBLISH] Error marking draft as published:', error.message);
    // Don't fail if this step fails - site is already created
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  return sendSuccess(res, {
    subdomain,
    url: `${baseUrl}/sites/${subdomain}`,
    businessName: siteData.brand?.name,
    trialDays: hasActiveSubscription ? null : 7,
    isNewUser,
    hasActiveSubscription,
    site: {
      id: siteId,
      subdomain,
      url: `${baseUrl}/sites/${subdomain}`,
      businessName: siteData.brand?.name,
      templateId: draft.template_id,
      plan: sitePlan,
      expiresAt: expiresAt ? expiresAt.toISOString() : null
    }
  }, 'Site published successfully');
  } catch (error) {
    console.error('[PUBLISH] Unhandled error in publish endpoint:', error.message);
    throw error; // Let asyncHandler catch it
  }
}));

export default router;
