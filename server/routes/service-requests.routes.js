/**
 * Service Requests Routes
 * 
 * Handles niche-specific service request form submissions.
 * Uses template service factory to route to appropriate niche service.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTemplateService } from '../services/templates/index.js';
import { prisma } from '../../database/db.js';
import { parseSiteData } from '../utils/parseSiteData.js';
import { siteUrgentEnabled } from '../../src/utils/visitorExperience.js';
import { hasServiceRequestFeature } from '../constants/subscription.js';
import { resolveUserPlan } from '../utils/resolveUserPlan.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();

/**
 * Helper: Get site by subdomain with owner info
 */
async function getSiteBySubdomain(subdomain) {
  return prisma.sites.findFirst({
    where: { subdomain },
    select: {
      id: true,
      subdomain: true,
      site_data: true,
      user_id: true,
      users: {
        select: { id: true, email: true, subscription_plan: true, plan: true }
      }
    }
  });
}

/**
 * POST /api/service-requests/submit
 * Submit a service request form
 * Public endpoint (no auth required for customers)
 */
router.post('/submit', asyncHandler(async (req, res) => {
  const { subdomain, templateId, ...formData } = req.body;

  // Validate required fields
  if (!subdomain) {
    return sendBadRequest(res, 'Subdomain is required', 'MISSING_SUBDOMAIN');
  }

  if (!templateId) {
    return sendBadRequest(res, 'Template ID is required', 'MISSING_TEMPLATE_ID');
  }

  // Get site and verify exists
  const site = await getSiteBySubdomain(subdomain);
  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  // Check if site owner has Growth tier (for booking/request features)
  const userPlan = resolveUserPlan(site.users);
  if (!hasServiceRequestFeature(userPlan)) {
    return sendBadRequest(
      res,
      'Service request forms require Growth tier or higher',
      'TIER_REQUIRED'
    );
  }

  const siteData = parseSiteData(site.site_data);
  if (!siteUrgentEnabled(siteData)) {
    return sendBadRequest(
      res,
      'Service requests are not enabled for this site',
      'SERVICE_REQUESTS_DISABLED'
    );
  }

  try {
    // Get appropriate service for this template
    const service = getTemplateService(templateId);

    // Create submission using niche-specific logic
    const submission = await service.createSubmission(site.id, formData);

    return sendCreated(
      res,
      { submissionId: submission.id },
      'Your request has been submitted successfully'
    );
  } catch (error) {
    console.error('Service request submission error:', error);
    
    // Handle validation errors
    if (error.message.includes('Validation failed')) {
      return sendBadRequest(res, error.message, 'VALIDATION_ERROR');
    }

    // Handle service not found
    if (error.message.includes('No service found')) {
      return sendBadRequest(res, `Template ${templateId} does not support service requests`, 'TEMPLATE_NOT_SUPPORTED');
    }

    return sendServerError(res, 'Failed to submit service request');
  }
}));

/**
 * GET /api/service-requests/fields/:templateId
 * Get field definitions for a specific template
 * Public endpoint (for form rendering)
 */
router.get('/fields/:templateId', asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  if (!templateId) {
    return sendBadRequest(res, 'Template ID is required', 'MISSING_TEMPLATE_ID');
  }

  try {
    const service = getTemplateService(templateId);

    return sendSuccess(res, {
      templateId,
      requiredFields: service.getRequiredFields(),
      nicheFields: service.getNicheFields(),
      formType: service.getFormType()
    });
  } catch (error) {
    console.error('Error getting template fields:', error);
    
    // If service not found, return empty fields (graceful degradation)
    if (error.message.includes('No service found')) {
      return sendSuccess(res, {
        templateId,
        requiredFields: ['name', 'email', 'phone'],
        nicheFields: [],
        formType: 'contact'
      });
    }

    return sendServerError(res, 'Failed to get template fields');
  }
}));

/**
 * GET /api/service-requests
 * Get all service requests for authenticated user's sites
 * Protected endpoint
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { status, limit = 100 } = req.query;

  // Build query
  const where = {
    sites: { user_id: userId },
    form_type: { in: ['service_request', 'quote_request'] }
  };

  if (status) {
    where.status = status;
  }

  const submissions = await prisma.submissions.findMany({
    where,
    include: {
      sites: {
        select: {
          subdomain: true,
          site_data: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 100, 500)
  });

  const formattedSubmissions = submissions.map(sub => {
    const siteData = parseSiteData(sub.sites?.site_data);
    
    return {
      id: sub.id,
      name: sub.name,
      email: sub.email,
      phone: sub.phone,
      message: sub.message,
      type: sub.form_type,
      status: sub.status,
      submittedAt: sub.created_at,
      subdomain: sub.sites?.subdomain,
      businessName: siteData?.brand?.name || 'Unknown Site',
      data: sub.data // Contains niche-specific fields
    };
  });

  return sendSuccess(res, { submissions: formattedSubmissions });
}));

/**
 * GET /api/service-requests/site/:subdomain
 * Get service requests for a specific site
 * Protected endpoint
 */
router.get('/site/:subdomain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const userId = req.user.id || req.user.userId;
  const { status, limit = 100 } = req.query;

  // Find and verify site ownership
  const site = await getSiteBySubdomain(subdomain);
  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  if (site.user_id !== userId && req.user.role !== 'admin') {
    return sendBadRequest(res, 'Not authorized to view these requests', 'ACCESS_DENIED');
  }

  // Build query
  const where = { 
    site_id: site.id,
    form_type: { in: ['service_request', 'quote_request'] }
  };
  if (status) {
    where.status = status;
  }

  const submissions = await prisma.submissions.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 100, 500)
  });

  const formattedSubmissions = submissions.map(sub => ({
    id: sub.id,
    name: sub.name,
    email: sub.email,
    phone: sub.phone,
    message: sub.message,
    type: sub.form_type,
    status: sub.status,
    submittedAt: sub.created_at,
    data: sub.data
  }));

  return sendSuccess(res, { submissions: formattedSubmissions });
}));

export default router;

