/**
 * Unit Tests for Analytics Dashboard Component
 * TDD Approach: RED phase - Define tests first
 * 
 * Analytics Dashboard should:
 * - Display overview stats (views, visitors, orders, revenue)
 * - Show time series chart with Chart.js
 * - Display top pages table
 * - Show referrer sources
 * - Support date range filtering
 * - Handle loading and error states
 * - Format currency and numbers properly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Will implement this component
let SiteAnalytics;

// Helper to mock all analytics endpoints
const mockAllEndpoints = (overrides = {}) => {
  return vi.fn((url) => {
    if (url.includes('/stats/')) {
      return Promise.resolve({
        ok: true,
        json: async () => overrides.stats || {
          pageViews: 100,
          uniqueVisitors: 50,
          orders: 5,
          revenue: 250,
          avgOrderValue: 50,
          conversionRate: 5
        }
      });
    }
    if (url.includes('/timeseries/')) {
      return Promise.resolve({
        ok: true,
        json: async () => overrides.timeseries || []
      });
    }
    if (url.includes('/top-pages/')) {
      return Promise.resolve({
        ok: true,
        json: async () => overrides.topPages || []
      });
    }
    if (url.includes('/referrers/')) {
      return Promise.resolve({
        ok: true,
        json: async () => overrides.referrers || []
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({})
    });
  });
};

describe('SiteAnalytics Dashboard', () => {
  beforeEach(async () => {
    // Mock API calls with default responses
    global.fetch = mockAllEndpoints();
    
    // Import component
    const module = await import('../../src/pages/SiteAnalytics.jsx');
    SiteAnalytics = module.default;
  });

  describe('Overview Stats', () => {
    it('should display all key metrics', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pageViews: 1250,
          uniqueVisitors: 340,
          orders: 28,
          revenue: 1456.75,
          avgOrderValue: 52.03,
          conversionRate: 2.24
        })
      });

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument(); // Page views
        expect(screen.getByText('340')).toBeInTheDocument(); // Visitors
        expect(screen.getByText('28')).toBeInTheDocument(); // Orders
        expect(screen.getByText('$1,456.75')).toBeInTheDocument(); // Revenue
      });
    });

    it('should display conversion rate as percentage', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pageViews: 1000,
          uniqueVisitors: 300,
          orders: 25,
          revenue: 1200,
          avgOrderValue: 48,
          conversionRate: 2.5
        })
      });

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText('2.5%')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SiteAnalytics subdomain="mybusiness" />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filtering', () => {
    it('should have period selector buttons', async () => {
      global.fetch = mockAllEndpoints();

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText('24h')).toBeInTheDocument();
        expect(screen.getByText('7d')).toBeInTheDocument();
        expect(screen.getByText('30d')).toBeInTheDocument();
        expect(screen.getByText('90d')).toBeInTheDocument();
      });
    });

    it('should fetch new data when period changes', async () => {
      global.fetch = mockAllEndpoints();

      const { rerender } = render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => screen.getByText('7d'));

      // Verify initial fetch calls
      const initialCallCount = global.fetch.mock.calls.length;
      expect(initialCallCount).toBeGreaterThan(0);

      // Click 30d button
      const user = userEvent.setup();
      const button30d = screen.getByText('30d');
      await user.click(button30d);

      // Wait a bit for the fetch to happen
      await waitFor(() => {
        // Should have made new API calls
        expect(global.fetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      });

      // Verify the new period was used in the API call
      const calls = global.fetch.mock.calls;
      const hasNewPeriodCall = calls.some(call => 
        call[0] && call[0].includes('period=30d')
      );
      expect(hasNewPeriodCall).toBe(true);
    });

    it('should highlight selected period', async () => {
      global.fetch = mockAllEndpoints();

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => screen.getByText('7d'));

      const button7d = screen.getByText('7d');
      expect(button7d).toHaveClass(/active|selected/i);
    });
  });

  describe('Time Series Chart', () => {
    it('should render Chart.js canvas', async () => {
      global.fetch = mockAllEndpoints({
        timeseries: [
          { date: '2025-01-10', pageViews: 45, orders: 3, revenue: 120 },
          { date: '2025-01-11', pageViews: 52, orders: 4, revenue: 180 },
          { date: '2025-01-12', pageViews: 38, orders: 2, revenue: 95 }
        ]
      });

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        const canvas = screen.getByRole('img', { name: /analytics chart/i });
        expect(canvas).toBeInTheDocument();
      });
    });

    it('should fetch time series data on mount', async () => {
      global.fetch = mockAllEndpoints();

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/timeseries/'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Top Pages Table', () => {
    it('should display top pages with view counts', async () => {
      global.fetch = mockAllEndpoints({
        topPages: [
          { path: '/menu', views: 89, uniqueVisitors: 45 },
          { path: '/', views: 67, uniqueVisitors: 42 },
          { path: '/contact', views: 34, uniqueVisitors: 28 }
        ]
      });

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText('/menu')).toBeInTheDocument();
        expect(screen.getByText('89')).toBeInTheDocument();
        expect(screen.getByText('/contact')).toBeInTheDocument();
      });
    });

    it('should show empty state when no pages', async () => {
      global.fetch = mockAllEndpoints({
        stats: {
          pageViews: 0,
          uniqueVisitors: 0,
          orders: 0,
          revenue: 0,
          avgOrderValue: 0,
          conversionRate: 0
        },
        topPages: []
      });

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText(/no data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Referrer Sources', () => {
    it('should display traffic sources with percentages', async () => {
      global.fetch = mockAllEndpoints({
        referrers: [
          { domain: 'google.com', visits: 120, percentage: 60.0 },
          { domain: 'facebook.com', visits: 50, percentage: 25.0 },
          { domain: 'direct', visits: 30, percentage: 15.0 }
        ]
      });

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText('google.com')).toBeInTheDocument();
        expect(screen.getByText('60.0%')).toBeInTheDocument();
        expect(screen.getByText('direct')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should have refresh button', async () => {
      global.fetch = mockAllEndpoints();

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should reload data when refresh clicked', async () => {
      global.fetch = mockAllEndpoints();

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => screen.getByRole('button', { name: /refresh/i }));

      const initialCallCount = global.fetch.mock.calls.length;

      const user = userEvent.setup();
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      // Click refresh
      await user.click(refreshButton);

      // Wait for new fetches to complete
      await waitFor(() => {
        expect(global.fetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      }, { timeout: 2000 });
    });
  });

  describe('Number Formatting', () => {
    it('should format large numbers with commas', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pageViews: 125340,
          uniqueVisitors: 34567,
          orders: 1234,
          revenue: 98765.43,
          avgOrderValue: 80.01,
          conversionRate: 0.98
        })
      });

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText('125,340')).toBeInTheDocument();
        expect(screen.getByText('34,567')).toBeInTheDocument();
      });
    });

    it('should format currency with dollar sign and cents', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pageViews: 100,
          uniqueVisitors: 50,
          orders: 5,
          revenue: 1234.56,
          avgOrderValue: 246.91,
          conversionRate: 5
        })
      });

      render(<SiteAnalytics subdomain="mybusiness" />);

      await waitFor(() => {
        expect(screen.getByText('$1,234.56')).toBeInTheDocument();
        expect(screen.getByText('$246.91')).toBeInTheDocument();
      });
    });
  });
});

