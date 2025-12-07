/**
 * Analytics Service
 * Tracks page views, orders, conversions for Pro sites
 * 
 * Features:
 * - Privacy-focused (no PII storage)
 * - Bot traffic filtering
 * - Aggregated stats and time series data
 * - Referrer tracking
 * - Revenue analytics
 */

import { prisma } from '../../database/db.js';

class AnalyticsService {
  /**
   * Bot detection patterns
   */
  static BOT_PATTERNS = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /googlebot/i,
    /bingbot/i,
    /slurp/i,          // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /linkedinbot/i,
    /twitterbot/i,
    /whatsapp/i,
    /telegram/i
  ];

  /**
   * Detect if user agent is a bot
   */
  static isBot(userAgent) {
    if (!userAgent) return false;

    return this.BOT_PATTERNS.some(pattern => pattern.test(userAgent));
  }

  /**
   * Strip query parameters that might contain PII
   */
  static sanitizePath(path) {
    if (!path) return '/';

    try {
      const url = new URL(path, 'http://example.com');
      // Only keep the pathname, remove all query params
      return url.pathname;
    } catch {
      // If URL parsing fails, return the path up to the first ?
      return path.split('?')[0];
    }
  }

  /**
   * Extract domain from referrer URL
   */
  static extractReferrerDomain(referrer) {
    if (!referrer) return null;

    try {
      const url = new URL(referrer);
      return url.hostname.replace('www.', '');
    } catch {
      return null;
    }
  }

  /**
   * Track a page view
   */
  static async trackPageView(pageView) {
    const { subdomain, path, userAgent, referrer, ipAddress } = pageView;

    // Bot detection
    if (this.isBot(userAgent)) {
      return { tracked: false, reason: 'bot_traffic' };
    }

    // Sanitize path to remove PII
    const sanitizedPath = this.sanitizePath(path);
    const referrerDomain = this.extractReferrerDomain(referrer);
    const timestamp = new Date();

    // Do NOT store IP addresses (privacy)
    await prisma.analytics_page_views.create({
      data: {
        subdomain,
        path: sanitizedPath,
        timestamp,
        user_agent: userAgent || null,
        referrer_domain: referrerDomain
      }
    });

    return { tracked: true };
  }

  /**
   * Track an order completion
   */
  static async trackOrder(order) {
    const { subdomain, orderId, revenue, itemsCount, orderType } = order;

    // Validation
    if (revenue < 0) {
      throw new Error('Revenue must be a positive number');
    }

    const timestamp = new Date();

    await prisma.analytics_orders.create({
      data: {
        subdomain,
        order_id: orderId,
        revenue,
        items_count: itemsCount,
        order_type: orderType || null,
        timestamp
      }
    });

    return { tracked: true };
  }

  /**
   * Track a conversion event
   */
  static async trackConversion(conversion) {
    const { subdomain, type, value, metadata } = conversion;

    const timestamp = new Date();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await prisma.analytics_conversions.create({
      data: {
        subdomain,
        type,
        value: value || 0,
        metadata: metadataJson,
        timestamp
      }
    });

    return { tracked: true };
  }

  /**
   * Get aggregated stats for a subdomain
   */
  static async getStats(subdomain, options = {}) {
    const { period, startDate, endDate } = options;

    let dateFilter = '';
    const params = [subdomain];

    if (startDate && endDate) {
      dateFilter = 'AND timestamp >= $2::timestamp AND timestamp <= $3::timestamp';
      params.push(startDate, endDate);
    } else if (period) {
      const periodMap = {
        '24h': '1 day',
        '7d': '7 days',
        '30d': '30 days',
        '90d': '90 days',
        '1y': '1 year'
      };
      dateFilter = `AND timestamp >= NOW() - INTERVAL '${periodMap[period] || '7 days'}'`;
    }

    // Use raw query for complex join and aggregation
    const result = await prisma.$queryRawUnsafe(
      `SELECT
        COUNT(DISTINCT pv.id) as total_page_views,
        COUNT(DISTINCT pv.user_agent) as unique_visitors,
        COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
        COALESCE(SUM(o.revenue), 0) as total_revenue,
        COALESCE(AVG(o.revenue), 0) as avg_order_value,
        CASE 
          WHEN COUNT(DISTINCT pv.id) > 0 
          THEN COALESCE(COUNT(DISTINCT o.id)::float / COUNT(DISTINCT pv.id), 0)
          ELSE 0 
        END as conversion_rate
      FROM analytics_page_views pv
      LEFT JOIN analytics_orders o ON o.subdomain = pv.subdomain AND o.timestamp >= pv.timestamp - INTERVAL '1 hour'
      WHERE pv.subdomain = $1
      ${dateFilter}`,
      ...params
    );

    const row = result[0] || {};

    return {
      pageViews: Number(row.total_page_views) || 0,
      uniqueVisitors: Number(row.unique_visitors) || 0,
      orders: Number(row.total_orders) || 0,
      revenue: Number(row.total_revenue) || 0,
      avgOrderValue: Number(row.avg_order_value) || 0,
      conversionRate: Number((Number(row.conversion_rate) * 100).toFixed(2)) || 0
    };
  }

  /**
   * Get top pages by view count
   */
  static async getTopPages(subdomain, options = {}) {
    const { limit = 10, period = '7d' } = options;

    const periodMap = {
      '24h': '1 day',
      '7d': '7 days',
      '30d': '30 days'
    };

    const result = await prisma.$queryRawUnsafe(
      `SELECT 
        path,
        COUNT(*) as views,
        COUNT(DISTINCT user_agent) as unique_visitors
      FROM analytics_page_views
      WHERE subdomain = $1
        AND timestamp >= NOW() - INTERVAL '${periodMap[period] || '7 days'}'
      GROUP BY path
      ORDER BY views DESC
      LIMIT $2`,
      subdomain,
      limit
    );

    return result.map(row => ({
      path: row.path,
      views: Number(row.views),
      uniqueVisitors: Number(row.unique_visitors)
    }));
  }

  /**
   * Get referrer statistics
   */
  static async getReferrerStats(subdomain, options = {}) {
    const { period = '30d' } = options;

    const periodMap = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };

    const result = await prisma.$queryRawUnsafe(
      `SELECT 
        COALESCE(referrer_domain, 'direct') as referrer_domain,
        COUNT(*) as count,
        (COUNT(*)::float / SUM(COUNT(*)) OVER () * 100) as percentage
      FROM analytics_page_views
      WHERE subdomain = $1
        AND timestamp >= NOW() - INTERVAL '${periodMap[period] || '30 days'}'
      GROUP BY referrer_domain
      ORDER BY count DESC`,
      subdomain
    );

    return result.map(row => ({
      domain: row.referrer_domain,
      visits: Number(row.count),
      percentage: Number(Number(row.percentage).toFixed(1))
    }));
  }

  /**
   * Get time series data for charts
   */
  static async getTimeSeriesData(subdomain, options = {}) {
    const { period = '7d', groupBy = 'day' } = options;

    const truncMap = {
      hour: 'hour',
      day: 'day',
      week: 'week',
      month: 'month'
    };

    const periodMap = {
      '24h': '1 day',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };

    const result = await prisma.$queryRawUnsafe(
      `SELECT 
        DATE_TRUNC('${truncMap[groupBy] || 'day'}', pv.timestamp) as date,
        COUNT(DISTINCT pv.id) as page_views,
        COALESCE(COUNT(DISTINCT o.id), 0) as orders,
        COALESCE(SUM(o.revenue), 0) as revenue
      FROM analytics_page_views pv
      LEFT JOIN analytics_orders o ON o.subdomain = pv.subdomain 
        AND DATE_TRUNC('${truncMap[groupBy] || 'day'}', o.timestamp) = DATE_TRUNC('${truncMap[groupBy] || 'day'}', pv.timestamp)
      WHERE pv.subdomain = $1
        AND pv.timestamp >= NOW() - INTERVAL '${periodMap[period] || '7 days'}'
      GROUP BY date
      ORDER BY date ASC`,
      subdomain
    );

    return result.map(row => ({
      date: row.date,
      pageViews: Number(row.page_views),
      orders: Number(row.orders),
      revenue: Number(row.revenue) || 0
    }));
  }

  /**
   * Delete all analytics data for a subdomain
   */
  static async deleteAnalytics(subdomain) {
    await prisma.analytics_page_views.deleteMany({
      where: { subdomain }
    });

    await prisma.analytics_orders.deleteMany({
      where: { subdomain }
    });

    await prisma.analytics_conversions.deleteMany({
      where: { subdomain }
    });

    return { deleted: true };
  }
}

export default AnalyticsService;
export { AnalyticsService };

