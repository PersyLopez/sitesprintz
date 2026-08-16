/**
 * Unit Tests for Analytics Service
 * Tests the Prisma-based analytics implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Prisma DB module
vi.mock('../../database/db.js', () => ({
  prisma: {
    sites: {
      findUnique: vi.fn()
    },
    analytics_page_views: {
      create: vi.fn(),
      deleteMany: vi.fn()
    },
    analytics_orders: {
      create: vi.fn(),
      deleteMany: vi.fn()
    },
    analytics_conversions: {
      create: vi.fn(),
      deleteMany: vi.fn()
    },
    $queryRawUnsafe: vi.fn()
  }
}));

let AnalyticsService;
let prisma;

describe('AnalyticsService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Re-import to get fresh mocks
    const dbModule = await import('../../database/db.js');
    prisma = dbModule.prisma;
    
    // Setup default mock for site resolution
    vi.mocked(prisma.sites.findUnique).mockResolvedValue({
      id: 'site-123',
      subdomain: 'mybusiness'
    });
    
    // Import analytics service
    const module = await import('../../server/services/analyticsService.js');
    AnalyticsService = module.default || module.AnalyticsService;
  });

  describe('Bot Detection', () => {
    const botUserAgents = [
      'Googlebot',
      'bingbot',
      'Slurp',
      'DuckDuckBot',
      'Baiduspider',
      'YandexBot',
      'facebookexternalhit',
      'LinkedInBot',
      'Twitterbot'
    ];

    it.each(botUserAgents)('should filter out %s traffic', async (botUA) => {
      const result = await AnalyticsService.trackPageView({
        subdomain: 'mybusiness',
        path: '/',
        userAgent: `Mozilla/5.0 (compatible; ${botUA}/2.1)`
      });

      expect(result.tracked).toBe(false);
      expect(result.reason).toBe('bot_traffic');
      expect(prisma.analytics_page_views.create).not.toHaveBeenCalled();
    });

    it('should allow legitimate user agents', async () => {
      const result = await AnalyticsService.trackPageView({
        subdomain: 'mybusiness',
        path: '/',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      });

      expect(result.tracked).toBe(true);
      expect(prisma.analytics_page_views.create).toHaveBeenCalled();
    });
  });

  describe('trackPageView()', () => {
    it('should record a page view with all fields', async () => {
      const result = await AnalyticsService.trackPageView({
        subdomain: 'mybusiness',
        path: '/menu',
        userAgent: 'Mozilla/5.0...',
        referrer: 'https://google.com'
      });

      expect(result.tracked).toBe(true);
      expect(prisma.analytics_page_views.create).toHaveBeenCalledWith({
        data: {
          site_id: 'site-123',
          path: '/menu',
          timestamp: expect.any(Date),
          user_agent: 'Mozilla/5.0...',
          referrer: 'https://google.com'
        }
      });
    });

    it('should handle missing optional fields', async () => {
      await AnalyticsService.trackPageView({
        subdomain: 'mybusiness',
        path: '/'
      });

      expect(prisma.analytics_page_views.create).toHaveBeenCalledWith({
        data: {
          site_id: 'site-123',
          path: '/',
          timestamp: expect.any(Date),
          user_agent: null,
          referrer: null
        }
      });
    });

    it('should sanitize paths to remove query parameters', async () => {
      await AnalyticsService.trackPageView({
        subdomain: 'mybusiness',
        path: '/contact?email=user@example.com&phone=555-1234'
      });

      const call = vi.mocked(prisma.analytics_page_views.create).mock.calls[0];
      expect(call[0].data.path).toBe('/contact');
    });

    it('should not store IP addresses', async () => {
      await AnalyticsService.trackPageView({
        subdomain: 'mybusiness',
        path: '/',
        ipAddress: '192.168.1.1'
      });

      const call = vi.mocked(prisma.analytics_page_views.create).mock.calls[0];
      expect(call[0].data).not.toHaveProperty('ip_address');
    });
  });

  describe('trackOrder()', () => {
    it('should record an order with value', async () => {
      const result = await AnalyticsService.trackOrder({
        subdomain: 'mybusiness',
        orderId: 'order_123',
        value: 4599
      });

      expect(result.tracked).toBe(true);
      expect(prisma.analytics_orders.create).toHaveBeenCalledWith({
        data: {
          site_id: 'site-123',
          order_id: 'order_123',
          value: 4599,
          timestamp: expect.any(Date)
        }
      });
    });

    it('should validate value is positive', async () => {
      await expect(
        AnalyticsService.trackOrder({
          subdomain: 'mybusiness',
          orderId: 'order_123',
          value: -10
        })
      ).rejects.toThrow('Value must be a positive number');
    });
  });

  describe('trackConversion()', () => {
    it('should record a conversion event', async () => {
      const result = await AnalyticsService.trackConversion({
        subdomain: 'mybusiness',
        type: 'contact_form_submit',
        metadata: { formType: 'quote_request' }
      });

      expect(result.tracked).toBe(true);
      expect(prisma.analytics_conversions.create).toHaveBeenCalledWith({
        data: {
          site_id: 'site-123',
          event_type: 'contact_form_submit',
          metadata: { formType: 'quote_request' },
          timestamp: expect.any(Date)
        }
      });
    });

    it('should handle conversion without metadata', async () => {
      await AnalyticsService.trackConversion({
        subdomain: 'mybusiness',
        type: 'booking_click'
      });

      expect(prisma.analytics_conversions.create).toHaveBeenCalledWith({
        data: {
          site_id: 'site-123',
          event_type: 'booking_click',
          metadata: null,
          timestamp: expect.any(Date)
        }
      });
    });
  });

  describe('getStats()', () => {
    it('should query aggregated stats by site_id', async () => {
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([{
        total_page_views: 150,
        unique_visitors: 45,
        total_orders: 12,
        total_revenue: 56788,
        avg_order_value: 4732,
        conversion_rate: 0.08
      }]);

      const stats = await AnalyticsService.getStats('mybusiness', { period: '7d' });

      expect(stats.pageViews).toBe(150);
      expect(stats.uniqueVisitors).toBe(45);
      expect(stats.orders).toBe(12);
      expect(stats.revenue).toBe(56788);
      expect(stats.conversionRate).toBe(8);
      
      const sqlCall = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0];
      expect(sqlCall[0]).toContain('pv.site_id = $1');
    });
  });

  describe('getTopPages()', () => {
    it('should return top pages for a site', async () => {
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([
        { path: '/menu', views: 89, unique_visitors: 45 },
        { path: '/', views: 67, unique_visitors: 42 }
      ]);

      const topPages = await AnalyticsService.getTopPages('mybusiness', { limit: 10 });

      expect(topPages).toHaveLength(2);
      expect(topPages[0].path).toBe('/menu');
      expect(topPages[0].views).toBe(89);
      
      const sqlCall = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0];
      expect(sqlCall[0]).toContain('site_id = $1');
    });
  });

  describe('getReferrerStats()', () => {
    it('should return traffic sources', async () => {
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([
        { referrer: 'google.com', count: 120, percentage: 60.0 },
        { referrer: 'direct', count: 30, percentage: 15.0 }
      ]);

      const referrers = await AnalyticsService.getReferrerStats('mybusiness');

      expect(referrers).toHaveLength(2);
      expect(referrers[0].domain).toBe('google.com');
      expect(referrers[0].visits).toBe(120);
      
      const sqlCall = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0];
      expect(sqlCall[0]).toContain('site_id = $1');
    });
  });

  describe('getTimeSeriesData()', () => {
    it('should return time-series aggregated data', async () => {
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([
        { date: '2025-01-10', page_views: 45, orders: 3, revenue: 12050 }
      ]);

      const timeSeries = await AnalyticsService.getTimeSeriesData('mybusiness', {
        period: '7d',
        groupBy: 'day'
      });

      expect(timeSeries[0].pageViews).toBe(45);
      expect(timeSeries[0].orders).toBe(3);
      expect(timeSeries[0].revenue).toBe(12050);
      
      const sqlCall = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0];
      expect(sqlCall[0]).toContain('pv.site_id = $1');
    });
  });

  describe('deleteAnalytics() and clearSiteData()', () => {
    it('should delete all analytics for a subdomain', async () => {
      await AnalyticsService.deleteAnalytics('mybusiness');

      expect(prisma.analytics_page_views.deleteMany).toHaveBeenCalledWith({
        where: { site_id: 'site-123' }
      });
      expect(prisma.analytics_orders.deleteMany).toHaveBeenCalledWith({
        where: { site_id: 'site-123' }
      });
      expect(prisma.analytics_conversions.deleteMany).toHaveBeenCalledWith({
        where: { site_id: 'site-123' }
      });
    });

    it('should clear analytics by site_id directly', async () => {
      await AnalyticsService.clearSiteData('site-456');

      expect(prisma.analytics_page_views.deleteMany).toHaveBeenCalledWith({
        where: { site_id: 'site-456' }
      });
    });
  });

  describe('resolveSiteId()', () => {
    it('should throw error if site not found', async () => {
      vi.mocked(prisma.sites.findUnique).mockResolvedValueOnce(null);

      await expect(
        AnalyticsService.trackPageView({
          subdomain: 'nonexistent',
          path: '/'
        })
      ).rejects.toThrow('Site not found');
    });
  });
});
