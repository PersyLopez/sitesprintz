/**
 * Analytics API Routes
 * Endpoints for tracking and retrieving analytics data
 */

import express from 'express';
import AnalyticsService from '../services/analyticsService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/analytics/pageview
 * Track a page view (public endpoint)
 */
router.post('/pageview', async (req, res) => {
  try {
    const { subdomain, path, userAgent, referrer } = req.body;

    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain is required' });
    }

    const result = await AnalyticsService.trackPageView({
      subdomain,
      path,
      userAgent,
      referrer,
      ipAddress: req.ip
    });

    res.json(result);
  } catch (error) {
    console.error('Analytics pageview error:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

/**
 * POST /api/analytics/conversion
 * Track a conversion event (public endpoint)
 */
router.post('/conversion', async (req, res) => {
  try {
    const { subdomain, type, value, metadata } = req.body;

    if (!subdomain || !type) {
      return res.status(400).json({ error: 'Subdomain and type are required' });
    }

    const result = await AnalyticsService.trackConversion({
      subdomain,
      type,
      value,
      metadata
    });

    res.json(result);
  } catch (error) {
    console.error('Analytics conversion error:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

/**
 * POST /api/analytics/order
 * Track an order completion (authenticated)
 */
router.post('/order', requireAuth, async (req, res) => {
  try {
    const { subdomain, orderId, revenue, itemsCount, orderType } = req.body;

    if (!subdomain || !orderId || revenue === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await AnalyticsService.trackOrder({
      subdomain,
      orderId,
      revenue,
      itemsCount,
      orderType
    });

    res.json(result);
  } catch (error) {
    console.error('Analytics order error:', error);
    res.status(500).json({ error: error.message || 'Failed to track order' });
  }
});

/**
 * GET /api/analytics/stats/:subdomain
 * Get aggregated stats (authenticated)
 */
router.get('/stats/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { period, startDate, endDate } = req.query;

    // Verify user owns this subdomain
    if (req.user.subdomain !== subdomain && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await AnalyticsService.getStats(subdomain, {
      period,
      startDate,
      endDate
    });

    res.json(stats);
  } catch (error) {
    console.error('Analytics stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

/**
 * GET /api/analytics/top-pages/:subdomain
 * Get top pages by views (authenticated)
 */
router.get('/top-pages/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { limit, period } = req.query;

    // Verify user owns this subdomain
    if (req.user.subdomain !== subdomain && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const topPages = await AnalyticsService.getTopPages(subdomain, {
      limit: limit ? parseInt(limit) : 10,
      period
    });

    res.json(topPages);
  } catch (error) {
    console.error('Analytics top pages error:', error);
    res.status(500).json({ error: 'Failed to retrieve top pages' });
  }
});

/**
 * GET /api/analytics/referrers/:subdomain
 * Get referrer statistics (authenticated)
 */
router.get('/referrers/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { period } = req.query;

    // Verify user owns this subdomain
    if (req.user.subdomain !== subdomain && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const referrers = await AnalyticsService.getReferrerStats(subdomain, {
      period
    });

    res.json(referrers);
  } catch (error) {
    console.error('Analytics referrers error:', error);
    res.status(500).json({ error: 'Failed to retrieve referrers' });
  }
});

/**
 * GET /api/analytics/timeseries/:subdomain
 * Get time series data for charts (authenticated)
 */
router.get('/timeseries/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { period, groupBy } = req.query;

    // Verify user owns this subdomain
    if (req.user.subdomain !== subdomain && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const timeSeries = await AnalyticsService.getTimeSeriesData(subdomain, {
      period,
      groupBy
    });

    res.json(timeSeries);
  } catch (error) {
    console.error('Analytics timeseries error:', error);
    res.status(500).json({ error: 'Failed to retrieve time series data' });
  }
});

/**
 * DELETE /api/analytics/:subdomain
 * Delete all analytics for a subdomain (authenticated)
 */
router.delete('/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Verify user owns this subdomain or is admin
    if (req.user.subdomain !== subdomain && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await AnalyticsService.deleteAnalytics(subdomain);

    res.json(result);
  } catch (error) {
    console.error('Analytics delete error:', error);
    res.status(500).json({ error: 'Failed to delete analytics' });
  }
});

export default router;

