/**
 * Users Routes
 * 
 * User-specific endpoints for profile, sites, and analytics.
 * All routes require authentication.
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');
const sitesDir = path.join(publicDir, 'sites');

/**
 * Helper: Check if user can access resource
 */
function canAccessUser(reqUser, targetUserId) {
  return reqUser.id === targetUserId || 
         reqUser.userId === targetUserId || 
         reqUser.role === 'admin';
}

/**
 * Helper: Parse site_data
 */
function parseSiteData(site) {
  if (!site?.site_data) return {};
  if (typeof site.site_data === 'string') {
    try {
      return JSON.parse(site.site_data);
    } catch (e) {
      return {};
    }
  }
  return site.site_data;
}

/**
 * GET /api/users/:userId
 * Get user profile
 */
router.get('/:userId', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!canAccessUser(req.user, userId)) {
    return sendForbidden(res, 'Access denied', 'ACCESS_DENIED');
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      subscription_plan: true,
      subscription_status: true,
      created_at: true,
      last_login: true,
      email_verified: true,
      _count: {
        select: { sites: true }
      }
    }
  });

  if (!user) {
    return sendNotFound(res, 'User', 'USER_NOT_FOUND');
  }

  return sendSuccess(res, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      plan: user.subscription_plan,
      subscriptionStatus: user.subscription_status,
      emailVerified: user.email_verified,
      sitesCount: user._count.sites,
      createdAt: user.created_at,
      lastLogin: user.last_login
    }
  });
}));

/**
 * GET /api/users/:userId/sites
 * Get all sites for a user
 */
router.get('/:userId/sites', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status, limit = 50 } = req.query;

  if (!canAccessUser(req.user, userId)) {
    return sendForbidden(res, 'Access denied', 'ACCESS_DENIED');
  }

  // Build query
  const where = { user_id: userId };
  if (status) where.status = status;

  const sites = await prisma.sites.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 50, 100),
    select: {
      id: true,
      subdomain: true,
      template_id: true,
      status: true,
      plan: true,
      is_public: true,
      published_at: true,
      created_at: true,
      expires_at: true,
      site_data: true
    }
  });

  const formattedSites = sites.map(site => {
    const siteData = parseSiteData(site);
    return {
      id: site.id,
      subdomain: site.subdomain,
      name: siteData?.brand?.name || 'Untitled Site',
      url: `/sites/${site.subdomain}/`,
      status: site.status,
      plan: site.plan,
      isPublic: site.is_public,
      template: site.template_id,
      publishedAt: site.published_at,
      createdAt: site.created_at,
      expiresAt: site.expires_at
    };
  });

  return sendSuccess(res, { sites: formattedSites });
}));

/**
 * DELETE /api/users/:userId/sites/:siteId
 * Delete a user's site
 */
router.delete('/:userId/sites/:siteId', requireAuth, asyncHandler(async (req, res) => {
  const { userId, siteId } = req.params;

  if (!canAccessUser(req.user, userId)) {
    return sendForbidden(res, 'Access denied', 'ACCESS_DENIED');
  }

  // Check if site exists and belongs to user
  const site = await prisma.sites.findFirst({
    where: { id: siteId, user_id: userId },
    select: { id: true, subdomain: true }
  });

  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  // Delete from database (CASCADE handles related data)
  await prisma.sites.delete({
    where: { id: siteId }
  });

  // Delete site directory (non-blocking)
  const sitePath = path.join(sitesDir, site.subdomain);
  fs.rm(sitePath, { recursive: true, force: true }).catch(err => {
    console.error(`Error deleting site directory ${site.subdomain}:`, err.message);
  });

  return sendSuccess(res, {}, 'Site deleted successfully');
}));

/**
 * GET /api/users/:userId/analytics
 * Get user's sites analytics
 */
router.get('/:userId/analytics', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!canAccessUser(req.user, userId)) {
    return sendForbidden(res, 'Access denied', 'ACCESS_DENIED');
  }

  // Get user's sites with analytics data
  const sites = await prisma.sites.findMany({
    where: { user_id: userId },
    select: {
      id: true,
      subdomain: true,
      status: true,
      plan: true,
      created_at: true,
      site_data: true,
      _count: {
        select: {
          submissions: true,
          analytics_events: true
        }
      }
    }
  });

  // Calculate stats
  let totalViews = 0;
  let publishedCount = 0;
  let draftCount = 0;

  const sitesAnalytics = sites.map(site => {
    const siteData = parseSiteData(site);
    const views = site._count.analytics_events || 0;
    
    totalViews += views;
    
    if (site.status === 'published') {
      publishedCount++;
    } else {
      draftCount++;
    }

    return {
      id: site.id,
      subdomain: site.subdomain,
      name: siteData?.brand?.name || site.subdomain,
      status: site.status,
      plan: site.plan,
      views,
      submissions: site._count.submissions || 0,
      createdAt: site.created_at
    };
  });

  // Get recent submissions count
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSubmissions = await prisma.submissions.count({
    where: {
      sites: { user_id: userId },
      created_at: { gte: sevenDaysAgo }
    }
  });

  return sendSuccess(res, {
    totalSites: sites.length,
    publishedSites: publishedCount,
    draftSites: draftCount,
    totalViews,
    recentSubmissions,
    sites: sitesAnalytics.sort((a, b) => b.views - a.views)
  });
}));

/**
 * GET /api/users/:userId/submissions
 * Get all submissions for user's sites
 */
router.get('/:userId/submissions', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status, limit = 50 } = req.query;

  if (!canAccessUser(req.user, userId)) {
    return sendForbidden(res, 'Access denied', 'ACCESS_DENIED');
  }

  // Build query
  const where = { sites: { user_id: userId } };
  if (status) where.status = status;

  const submissions = await prisma.submissions.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 50, 200),
    include: {
      sites: {
        select: {
          subdomain: true,
          site_data: true
        }
      }
    }
  });

  const formattedSubmissions = submissions.map(sub => {
    const siteData = parseSiteData(sub.sites);
    return {
      id: sub.id,
      name: sub.name,
      email: sub.email,
      phone: sub.phone,
      message: sub.message,
      type: sub.form_type,
      status: sub.status,
      subdomain: sub.sites?.subdomain,
      businessName: siteData?.brand?.name || 'Unknown',
      createdAt: sub.created_at
    };
  });

  return sendSuccess(res, { submissions: formattedSubmissions });
}));

/**
 * PATCH /api/users/:userId/profile
 * Update user profile
 */
router.patch('/:userId/profile', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Users can only update their own profile
  if (req.user.id !== userId && req.user.userId !== userId) {
    return sendForbidden(res, 'Access denied', 'ACCESS_DENIED');
  }

  const { displayName, timezone, notifications } = req.body;

  // Build update data
  const updateData = {};
  
  if (displayName !== undefined) {
    updateData.display_name = String(displayName).substring(0, 100);
  }
  
  if (timezone !== undefined) {
    updateData.timezone = String(timezone).substring(0, 50);
  }
  
  if (notifications !== undefined) {
    updateData.notification_preferences = notifications;
  }

  if (Object.keys(updateData).length === 0) {
    return sendBadRequest(res, 'No valid fields to update', 'NO_UPDATE_FIELDS');
  }

  await prisma.users.update({
    where: { id: userId },
    data: updateData
  });

  return sendSuccess(res, {}, 'Profile updated successfully');
}));

export default router;
