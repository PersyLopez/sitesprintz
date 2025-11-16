/**
 * Unit Tests for Analytics Service
 * TDD Approach: RED phase - Define tests first
 * 
 * Analytics Service should:
 * - Track page views with timestamp, subdomain, page path, user agent, referrer
 * - Track order completions with revenue, items count
 * - Track conversions (contact forms, booking clicks)
 * - Aggregate daily/weekly/monthly stats
 * - Calculate conversion rates
 * - Handle bot traffic filtering
 * - Respect privacy (no PII storage)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { query } from '../../database/db.js';

// Will implement this service
let AnalyticsService;

describe('AnalyticsService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the service
    const module = await import('../../server/services/analyticsService.js');
    AnalyticsService = module.default || module.AnalyticsService;
  });

  describe('trackPageView()', () => {
    it('should record a page view with all required fields', async () => {
      const pageView = {
        subdomain: 'mybusiness',
        path: '/menu',
        userAgent: 'Mozilla/5.0...',
        referrer: 'https://google.com',
        ipAddress: '192.168.1.1'
      };

      await AnalyticsService.trackPageView(pageView);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_page_views'),
        expect.arrayContaining([
          pageView.subdomain,
          pageView.path,
          expect.any(String), // timestamp
          pageView.userAgent,
          'google.com' // referrer domain extracted
        ])
      );
    });

    it('should filter out bot traffic', async () => {
      const botView = {
        subdomain: 'mybusiness',
        path: '/menu',
        userAgent: 'Googlebot/2.1',
        referrer: '',
        ipAddress: '192.168.1.1'
      };

      const result = await AnalyticsService.trackPageView(botView);

      expect(result.tracked).toBe(false);
      expect(result.reason).toBe('bot_traffic');
      expect(query).not.toHaveBeenCalled();
    });

    it('should not store IP addresses (privacy)', async () => {
      const pageView = {
        subdomain: 'mybusiness',
        path: '/menu',
        userAgent: 'Mozilla/5.0...',
        referrer: 'https://google.com',
        ipAddress: '192.168.1.1'
      };

      await AnalyticsService.trackPageView(pageView);

      const insertCall = query.mock.calls[0];
      expect(insertCall[1]).not.toContain('192.168.1.1');
    });

    it('should handle missing optional fields', async () => {
      const pageView = {
        subdomain: 'mybusiness',
        path: '/'
      };

      await AnalyticsService.trackPageView(pageView);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'mybusiness',
          '/',
          expect.any(String),
          null, // userAgent
          null  // referrer
        ])
      );
    });
  });

  describe('trackOrder()', () => {
    it('should record an order completion event', async () => {
      const order = {
        subdomain: 'mybusiness',
        orderId: 'order_123',
        revenue: 45.99,
        itemsCount: 3,
        orderType: 'pickup'
      };

      await AnalyticsService.trackOrder(order);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_orders'),
        expect.arrayContaining([
          order.subdomain,
          order.orderId,
          order.revenue,
          order.itemsCount,
          order.orderType
        ])
      );
    });

    it('should validate revenue is a positive number', async () => {
      const order = {
        subdomain: 'mybusiness',
        orderId: 'order_123',
        revenue: -10,
        itemsCount: 1
      };

      await expect(AnalyticsService.trackOrder(order))
        .rejects.toThrow('Revenue must be a positive number');
    });
  });

  describe('trackConversion()', () => {
    it('should record a conversion event', async () => {
      const conversion = {
        subdomain: 'mybusiness',
        type: 'contact_form_submit',
        value: 0,
        metadata: { formType: 'quote_request' }
      };

      await AnalyticsService.trackConversion(conversion);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_conversions'),
        expect.arrayContaining([
          conversion.subdomain,
          conversion.type,
          conversion.value,
          expect.any(String) // JSON metadata
        ])
      );
    });

    it('should support different conversion types', async () => {
      const types = [
        'contact_form_submit',
        'booking_click',
        'phone_click',
        'email_click',
        'menu_download'
      ];

      for (const type of types) {
        await AnalyticsService.trackConversion({
          subdomain: 'mybusiness',
          type,
          value: 0
        });
      }

      expect(query).toHaveBeenCalledTimes(types.length);
    });
  });

  describe('getStats()', () => {
    it('should return overview stats for a subdomain', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          total_page_views: 150,
          unique_visitors: 45,
          total_orders: 12,
          total_revenue: 567.88,
          avg_order_value: 47.32,
          conversion_rate: 0.08
        }]
      });

      const stats = await AnalyticsService.getStats('mybusiness', {
        period: '7d'
      });

      expect(stats).toEqual({
        pageViews: 150,
        uniqueVisitors: 45,
        orders: 12,
        revenue: 567.88,
        avgOrderValue: 47.32,
        conversionRate: 8.0 // percentage
      });
    });

    it('should support different time periods', async () => {
      const periods = ['24h', '7d', '30d', '90d', '1y'];
      
      for (const period of periods) {
        query.mockResolvedValueOnce({ rows: [{}] });
        await AnalyticsService.getStats('mybusiness', { period });
      }

      expect(query).toHaveBeenCalledTimes(periods.length);
    });

    it('should filter by date range', async () => {
      await AnalyticsService.getStats('mybusiness', {
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      const sqlCall = query.mock.calls[0][0];
      expect(sqlCall).toContain('timestamp >=');
      expect(sqlCall).toContain('timestamp <=');
    });
  });

  describe('getTopPages()', () => {
    it('should return most visited pages', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { path: '/menu', views: 89, unique_visitors: 45 },
          { path: '/', views: 67, unique_visitors: 42 },
          { path: '/contact', views: 34, unique_visitors: 28 }
        ]
      });

      const topPages = await AnalyticsService.getTopPages('mybusiness', {
        limit: 10
      });

      expect(topPages).toHaveLength(3);
      expect(topPages[0]).toEqual({
        path: '/menu',
        views: 89,
        uniqueVisitors: 45
      });
    });

    it('should limit results to specified count', async () => {
      await AnalyticsService.getTopPages('mybusiness', { limit: 5 });

      const sqlCall = query.mock.calls[0][0];
      expect(sqlCall).toContain('LIMIT 5');
    });
  });

  describe('getReferrerStats()', () => {
    it('should return traffic sources', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { referrer_domain: 'google.com', count: 120, percentage: 60.0 },
          { referrer_domain: 'facebook.com', count: 50, percentage: 25.0 },
          { referrer_domain: 'direct', count: 30, percentage: 15.0 }
        ]
      });

      const referrers = await AnalyticsService.getReferrerStats('mybusiness');

      expect(referrers).toHaveLength(3);
      expect(referrers[0].domain).toBe('google.com');
      expect(referrers[0].visits).toBe(120);
      expect(referrers[0].percentage).toBe(60.0);
    });

    it('should categorize direct traffic', async () => {
      query.mockResolvedValueOnce({
        rows: [{ referrer_domain: 'direct', count: 30, percentage: 100.0 }]
      });

      const referrers = await AnalyticsService.getReferrerStats('mybusiness');

      expect(referrers[0].domain).toBe('direct');
    });
  });

  describe('getTimeSeriesData()', () => {
    it('should return daily aggregated data', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { date: '2025-01-10', page_views: 45, orders: 3, revenue: 120.50 },
          { date: '2025-01-11', page_views: 52, orders: 4, revenue: 180.25 },
          { date: '2025-01-12', page_views: 38, orders: 2, revenue: 95.00 }
        ]
      });

      const timeSeries = await AnalyticsService.getTimeSeriesData('mybusiness', {
        period: '7d',
        groupBy: 'day'
      });

      expect(timeSeries).toHaveLength(3);
      expect(timeSeries[0]).toEqual({
        date: '2025-01-10',
        pageViews: 45,
        orders: 3,
        revenue: 120.50
      });
    });

    it('should support hourly grouping for 24h period', async () => {
      await AnalyticsService.getTimeSeriesData('mybusiness', {
        period: '24h',
        groupBy: 'hour'
      });

      const sqlCall = query.mock.calls[0][0];
      expect(sqlCall).toContain('DATE_TRUNC');
    });
  });

  describe('Bot Detection', () => {
    const botUserAgents = [
      'Googlebot',
      'bingbot',
      'Slurp', // Yahoo
      'DuckDuckBot',
      'Baiduspider',
      'YandexBot',
      'facebookexternalhit',
      'LinkedInBot',
      'Twitterbot'
    ];

    it.each(botUserAgents)('should detect %s as a bot', async (botUA) => {
      const result = await AnalyticsService.trackPageView({
        subdomain: 'test',
        path: '/',
        userAgent: `Mozilla/5.0 (compatible; ${botUA}/2.1; +http://www.google.com/bot.html)`
      });

      expect(result.tracked).toBe(false);
      expect(result.reason).toBe('bot_traffic');
    });

    it('should allow legitimate user agents', async () => {
      const legitimateUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      
      await AnalyticsService.trackPageView({
        subdomain: 'test',
        path: '/',
        userAgent: legitimateUA
      });

      expect(query).toHaveBeenCalled();
    });
  });

  describe('Privacy & Data Retention', () => {
    it('should not store any personally identifiable information', async () => {
      const pageView = {
        subdomain: 'mybusiness',
        path: '/contact?email=user@example.com&phone=555-1234',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      };

      await AnalyticsService.trackPageView(pageView);

      const insertCall = query.mock.calls[0];
      const insertedData = insertCall[1].join(' ');
      
      // Should not contain email, phone, or IP
      expect(insertedData).not.toContain('user@example.com');
      expect(insertedData).not.toContain('555-1234');
      expect(insertedData).not.toContain('192.168.1.1');
    });

    it('should provide method to delete analytics for a subdomain', async () => {
      await AnalyticsService.deleteAnalytics('mybusiness');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM analytics_page_views'),
        ['mybusiness']
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM analytics_orders'),
        ['mybusiness']
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM analytics_conversions'),
        ['mybusiness']
      );
    });
  });
});

