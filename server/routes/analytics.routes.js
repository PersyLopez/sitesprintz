/**
 * Analytics API Routes
 * Endpoints for tracking and retrieving analytics data
 */

import express from 'express';
import AnalyticsService from '../services/analyticsService.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();

/**
 * Helper: Verify user owns site by subdomain
 */
async function verifySiteOwnership(subdomain, userId, userRole) {
  const site = await prisma.sites.findFirst({
    where: { subdomain },
    select: { id: true, user_id: true }
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
 * POST /api/analytics/pageview
 * Track a page view (public endpoint)
 */
router.post('/pageview', asyncHandler(async (req, res) => {
  const { subdomain, path, userAgent, referrer } = req.body;

  if (!subdomain) {
    return sendBadRequest(res, 'Subdomain is required', 'MISSING_SUBDOMAIN');
  }

  const result = await AnalyticsService.trackPageView({
    subdomain,
    path: path || '/',
    userAgent: userAgent || req.headers['user-agent'],
    referrer: referrer || req.headers.referer,
    ipAddress: req.ip
  });

  return sendSuccess(res, result);
}));

/**
 * POST /api/analytics/event
 * Track a custom event (public endpoint)
 */
router.post('/event', asyncHandler(async (req, res) => {
  const { subdomain, eventType, eventData } = req.body;

  if (!subdomain || !eventType) {
    return sendBadRequest(res, 'Subdomain and eventType are required', 'MISSING_FIELDS');
  }

  const result = await AnalyticsService.trackEvent({
    subdomain,
    eventType,
    eventData: eventData || {},
    ipAddress: req.ip
  });

  return sendSuccess(res, result);
}));

/**
 * POST /api/analytics/conversion
 * Track a conversion event (public endpoint)
 */
router.post('/conversion', asyncHandler(async (req, res) => {
  const { subdomain, type, value, metadata } = req.body;

  if (!subdomain || !type) {
    return sendBadRequest(res, 'Subdomain and type are required', 'MISSING_FIELDS');
  }

  const result = await AnalyticsService.trackConversion({
    subdomain,
    type,
    value: value || 0,
    metadata: metadata || {}
  });

  return sendSuccess(res, result);
}));

/**
 * POST /api/analytics/order
 * Track an order completion (authenticated)
 */
router.post('/order', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain, orderId, revenue, itemsCount, orderType } = req.body;

  if (!subdomain || !orderId || revenue === undefined) {
    return sendBadRequest(res, 'subdomain, orderId, and revenue are required', 'MISSING_FIELDS');
  }

  const result = await AnalyticsService.trackOrder({
    subdomain,
    orderId,
    revenue: parseFloat(revenue) || 0,
    itemsCount: parseInt(itemsCount) || 1,
    orderType: orderType || 'checkout'
  });

  return sendSuccess(res, result);
}));

/**
 * GET /api/analytics/stats/:subdomain
 * Get aggregated stats (authenticated)
 */
router.get('/stats/:subdomain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { period, startDate, endDate } = req.query;
  const userId = req.user.id || req.user.userId;

  // Verify ownership
  const ownership = await verifySiteOwnership(subdomain, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const stats = await AnalyticsService.getStats(subdomain, {
    period: period || '7d',
    startDate,
    endDate
  });

  return sendSuccess(res, stats);
}));

/**
 * GET /api/analytics/top-pages/:subdomain
 * Get top pages by views (authenticated)
 */
router.get('/top-pages/:subdomain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { limit, period } = req.query;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(subdomain, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const topPages = await AnalyticsService.getTopPages(subdomain, {
    limit: Math.min(parseInt(limit) || 10, 100),
    period: period || '7d'
  });

  return sendSuccess(res, { pages: topPages });
}));

/**
 * GET /api/analytics/referrers/:subdomain
 * Get referrer statistics (authenticated)
 */
router.get('/referrers/:subdomain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { period } = req.query;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(subdomain, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const referrers = await AnalyticsService.getReferrerStats(subdomain, {
    period: period || '7d'
  });

  return sendSuccess(res, { referrers });
}));

/**
 * GET /api/analytics/timeseries/:subdomain
 * Get time series data for charts (authenticated)
 */
router.get('/timeseries/:subdomain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { period, groupBy } = req.query;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(subdomain, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const timeSeries = await AnalyticsService.getTimeSeriesData(subdomain, {
    period: period || '7d',
    groupBy: groupBy || 'day'
  });

  return sendSuccess(res, { timeSeries });
}));

/**
 * GET /api/analytics/summary/:subdomain
 * Get a quick summary for dashboard (authenticated)
 */
router.get('/summary/:subdomain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(subdomain, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  // Get quick stats
  const [stats, topPages] = await Promise.all([
    AnalyticsService.getStats(subdomain, { period: '7d' }),
    AnalyticsService.getTopPages(subdomain, { limit: 5, period: '7d' })
  ]);

  return sendSuccess(res, {
    stats,
    topPages
  });
}));

/**
 * DELETE /api/analytics/:subdomain
 * Delete all analytics for a subdomain (authenticated)
 */
router.delete('/:subdomain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const userId = req.user.id || req.user.userId;

  const ownership = await verifySiteOwnership(subdomain, userId, req.user.role);
  if (!ownership.authorized) {
    if (ownership.status === 404) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendForbidden(res, ownership.error, 'ACCESS_DENIED');
  }

  const result = await AnalyticsService.deleteAnalytics(subdomain);

  return sendSuccess(res, result, 'Analytics data deleted');
}));

export default router;
