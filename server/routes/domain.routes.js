/**
 * Domain Routes
 * Handles custom domain management for Pro tier users
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { domainService } from '../services/domainService.js';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendForbidden,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';
import { getPlanLimits } from '../services/subscriptionService.js';
import { resolveUserPlan } from '../utils/resolveUserPlan.js';
import { prisma } from '../../database/db.js';

const router = express.Router();

/**
 * Check if user has Growth plan (required for custom domain)
 */
async function requireProPlan(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { plan: true, subscription_plan: true }
    });

    const plan = resolveUserPlan(user);
    const limits = getPlanLimits(plan);

    if (!limits.customDomain) {
      return sendForbidden(res, 'Custom domain requires Growth plan', 'GROWTH_PLAN_REQUIRED');
    }

    next();
  } catch (error) {
    return sendServerError(res, 'Error checking plan', 'PLAN_CHECK_ERROR');
  }
}

/**
 * POST /api/sites/:subdomain/domain
 * Add custom domain to site
 */
router.post('/:subdomain/domain', requireAuth, requireProPlan, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { domain } = req.body;
  const userId = req.user.id || req.user.userId;

  if (!domain) {
    return sendBadRequest(res, 'Domain is required', 'MISSING_DOMAIN');
  }

  try {
    const result = await domainService.addCustomDomain(subdomain, domain, userId);
    return sendSuccess(res, result, 'Custom domain added successfully');
  } catch (error) {
    if (error.message === 'Site not found or access denied') {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    if (error.message === 'Domain is already in use by another site') {
      return sendBadRequest(res, error.message, 'DOMAIN_IN_USE');
    }
    if (error.message === 'Invalid domain format') {
      return sendBadRequest(res, error.message, 'INVALID_DOMAIN');
    }
    return sendServerError(res, error.message, 'DOMAIN_ADD_ERROR');
  }
}));

/**
 * GET /api/sites/:subdomain/domain
 * Get domain status and DNS instructions
 */
router.get('/:subdomain/domain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const userId = req.user.id || req.user.userId;

  // Verify site belongs to user
  const site = await prisma.sites.findFirst({
    where: {
      subdomain,
      user_id: userId
    }
  });

  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  try {
    const status = await domainService.getDomainStatus(subdomain);
    return sendSuccess(res, status);
  } catch (error) {
    return sendServerError(res, error.message, 'DOMAIN_STATUS_ERROR');
  }
}));

/**
 * DELETE /api/sites/:subdomain/domain
 * Remove custom domain from site
 */
router.delete('/:subdomain/domain', requireAuth, requireProPlan, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const userId = req.user.id || req.user.userId;

  try {
    const result = await domainService.removeDomain(subdomain, userId);
    return sendSuccess(res, result, 'Custom domain removed successfully');
  } catch (error) {
    if (error.message === 'Site not found or access denied') {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendServerError(res, error.message, 'DOMAIN_REMOVE_ERROR');
  }
}));

/**
 * POST /api/sites/:subdomain/domain/verify
 * Verify DNS records are correctly configured
 */
router.post('/:subdomain/domain/verify', requireAuth, requireProPlan, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const userId = req.user.id || req.user.userId;

  // Verify site belongs to user
  const site = await prisma.sites.findFirst({
    where: {
      subdomain,
      user_id: userId
    }
  });

  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  try {
    const result = await domainService.verifyDNS(subdomain);
    return sendSuccess(res, result, result.verified ? 'Domain verified successfully' : 'DNS records not yet configured');
  } catch (error) {
    if (error.message === 'Site does not have a custom domain configured') {
      return sendBadRequest(res, error.message, 'NO_CUSTOM_DOMAIN');
    }
    return sendServerError(res, error.message, 'DNS_VERIFY_ERROR');
  }
}));

export default router;

