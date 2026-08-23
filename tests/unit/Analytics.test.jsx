import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Analytics from '../../src/pages/Analytics';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';
import { usePlan } from '../../src/hooks/usePlan';
import { useSiteWorkspace } from '../../src/context/SiteWorkspaceContext';

vi.mock('../../src/hooks/useAuth');
vi.mock('../../src/hooks/useToast');
vi.mock('../../src/hooks/usePlan');
vi.mock('../../src/context/SiteWorkspaceContext');
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));
vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));
vi.mock('../../src/components/analytics/StatsCard', () => ({
  default: ({ label, value }) => (
    <div className="stats-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  ),
}));
vi.mock('../../src/components/analytics/AnalyticsChart', () => ({
  default: ({ title }) => (
    <div className="analytics-chart">
      <h3 className="chart-title">{title}</h3>
    </div>
  ),
}));
vi.mock('../../src/components/analytics/SiteAnalyticsTable', () => ({
  default: ({ sites }) => (
    <div className="site-analytics-table">
      {sites.map((site) => (
        <div key={site.id}>{site.name}</div>
      ))}
    </div>
  ),
}));
vi.mock('../../src/components/common/FeatureGate', () => ({
  default: ({ children, upgradeMessage }) => (
    <div data-testid="analytics-upgrade-gate">{upgradeMessage || children}</div>
  ),
}));

function mockSiteAnalyticsFetch(overrides = {}) {
  const stats = {
    pageViews: 12458,
    uniqueVisitors: 3876,
    orders: 22,
    revenue: 880,
    ...overrides.stats,
  };
  const timeSeries = overrides.timeSeries || [
    { date: '2026-01-01', pageViews: 850, orders: 12, revenue: 480 },
    { date: '2026-01-03', pageViews: 920, orders: 15, revenue: 600 },
    { date: '2026-01-05', pageViews: 1100, orders: 18, revenue: 720 },
    { date: '2026-01-07', pageViews: 980, orders: 14, revenue: 560 },
    { date: '2026-01-09', pageViews: 1050, orders: 16, revenue: 640 },
    { date: '2026-01-11', pageViews: 1200, orders: 22, revenue: 880 },
  ];

  global.fetch.mockImplementation((url) => {
    if (url.includes('/api/analytics/stats/')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, ...stats }) });
    }
    if (url.includes('/api/analytics/timeseries/')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, timeSeries }) });
    }
    if (url.includes('/api/analytics/top-pages/')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, pages: [] }) });
    }
    if (url.includes('/api/analytics/referrers/')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, referrers: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

function mockAccountRollupFetch(sites = [
  { id: '1', subdomain: 'main-site', name: 'Main Site' },
  { id: '2', subdomain: 'second-site', name: 'Second Site' },
]) {
  const siteStats = {
    'main-site': { pageViews: 3200, uniqueVisitors: 1100, orders: 8, revenue: 320 },
    'second-site': { pageViews: 1800, uniqueVisitors: 650, orders: 4, revenue: 160 },
  };

  global.fetch.mockImplementation((url) => {
    const urlString = String(url);

    if (urlString.includes('/api/users/') && urlString.includes('/sites')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, sites }) });
    }

    for (const [subdomain, stats] of Object.entries(siteStats)) {
      if (urlString.includes(`/api/analytics/stats/${subdomain}`)) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, ...stats }) });
      }
      if (urlString.includes(`/api/analytics/timeseries/${subdomain}`)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            timeSeries: [
              { date: '2026-01-01', pageViews: stats.pageViews / 2, uniqueVisitors: stats.uniqueVisitors / 2, orders: 2, revenue: 80 },
              { date: '2026-01-02', pageViews: stats.pageViews / 2, uniqueVisitors: stats.uniqueVisitors / 2, orders: 2, revenue: 80 },
            ],
          }),
        });
      }
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe('Analytics Page', () => {
  let mockUser;
  let mockShowError;

  beforeEach(() => {
    mockUser = { id: 'user1', email: 'user@test.com' };
    mockShowError = vi.fn();

    useAuth.mockReturnValue({ user: mockUser, loading: false });
    useToast.mockReturnValue({
      showSuccess: vi.fn(),
      showError: mockShowError,
    });
    usePlan.mockReturnValue({
      plan: 'growth',
      isGrowth: true,
      features: { analytics: true },
    });
    useSiteWorkspace.mockReturnValue({
      embedded: false,
      siteId: null,
      site: null,
    });

    global.fetch = vi.fn();
    global.localStorage = {
      getItem: vi.fn(() => 'fake-token'),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Rendering', () => {
    beforeEach(() => {
      useSiteWorkspace.mockReturnValue({
        embedded: true,
        siteId: 'site123',
        site: { id: 'site123', subdomain: 'test-salon' },
      });
      mockSiteAnalyticsFetch();
    });

    it('should render analytics page', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-analytics-panel')).toBeInTheDocument();
      });
    });

    it('should show page title', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Analytics' })).toBeInTheDocument();
      });
    });

    it('should use pane semantics when embedded', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const page = screen.getByTestId('analytics-page');
        expect(within(page).queryByRole('main')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 1, name: /Analytics/i })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: 'Analytics' })).toBeInTheDocument();
        expect(page.querySelector('.analytics-header.pane-quiet-header')).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      global.fetch.mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
    });

    it('should handle account rollup without site ID', async () => {
      useSiteWorkspace.mockReturnValue({
        embedded: false,
        siteId: null,
        site: null,
      });
      mockAccountRollupFetch();

      render(
        <MemoryRouter initialEntries={['/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/All Sites/i)).toBeInTheDocument();
        expect(screen.getByText(/5,?000/)).toBeInTheDocument();
        expect(screen.getByText(/1,?750/)).toBeInTheDocument();
        expect(screen.getByText('Unique visitors (summed by site)')).toBeInTheDocument();
        expect(screen.getByText('Main Site')).toBeInTheDocument();
        expect(screen.getByText('Second Site')).toBeInTheDocument();
      });
    });

    it('should not call legacy user analytics endpoint for account rollup', async () => {
      useSiteWorkspace.mockReturnValue({
        embedded: false,
        siteId: null,
        site: null,
      });
      mockAccountRollupFetch();

      render(
        <MemoryRouter initialEntries={['/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-analytics-panel')).toBeInTheDocument();
      });

      const urls = global.fetch.mock.calls.map(([url]) => String(url));
      expect(urls.some((url) => url.includes('/api/users/user1/analytics'))).toBe(false);
      expect(urls.some((url) => url.includes('/api/users/user1/sites'))).toBe(true);
      expect(urls.some((url) => url.includes('/api/analytics/stats/main-site'))).toBe(true);
    });
  });

  describe('Metrics Display', () => {
    beforeEach(() => {
      useSiteWorkspace.mockReturnValue({
        embedded: true,
        siteId: 'site123',
        site: { id: 'site123', subdomain: 'test-salon' },
      });
      mockSiteAnalyticsFetch();
    });

    it('should display views count', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/12,?458/)).toBeInTheDocument();
      });
    });

    it('should display visitors count with site label', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('Unique Visitors').length).toBeGreaterThan(0);
        expect(screen.getByText(/3,?876/)).toBeInTheDocument();
      });
    });

    it('should render chart section for site analytics', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Analytics' })).toBeInTheDocument();
        expect(screen.getByText(/Site Views Over Time/i)).toBeInTheDocument();
      });
    });

    it('should display unavailable bounce rate placeholder when API omits metrics', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
      });
    });

    it('should display bounce rate and duration when API returns them', async () => {
      mockSiteAnalyticsFetch({
        stats: {
          bounceRate: 42.5,
          avgDurationSeconds: 192,
        },
      });

      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('42.5%')).toBeInTheDocument();
        expect(screen.getByText('3m 12s')).toBeInTheDocument();
      });
    });

    it('should display average session duration placeholder', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Avg\. Duration/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Filters', () => {
    beforeEach(() => {
      useSiteWorkspace.mockReturnValue({
        embedded: true,
        siteId: 'site123',
        site: { id: 'site123', subdomain: 'test-salon' },
      });
      mockSiteAnalyticsFetch();
    });

    it('should have date filter options', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
        expect(select.className).toContain('time-range-select');
      });
    });

    it('should filter by last 7 days', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const dateFilter = screen.getByRole('combobox');
      await user.selectOptions(dateFilter, '7');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/analytics/stats/test-salon'),
          expect.any(Object),
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('period=7d'),
          expect.any(Object),
        );
      });
    });

    it('should filter by last 30 days', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const dateFilter = screen.getByRole('combobox');
      await user.selectOptions(dateFilter, '30');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('period=30d'),
          expect.any(Object),
        );
      });
    });

    it('should have 90 day option', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /Last 90 Days/i })).toBeInTheDocument();
      });
    });

    it('should refresh data when date changes', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const initialCalls = global.fetch.mock.calls.length;
      const dateFilter = screen.getByRole('combobox');
      await user.selectOptions(dateFilter, '7');

      await waitFor(() => {
        expect(global.fetch.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });
  });

  describe('Charts', () => {
    beforeEach(() => {
      useSiteWorkspace.mockReturnValue({
        embedded: true,
        siteId: 'site123',
        site: { id: 'site123', subdomain: 'test-salon' },
      });
      mockSiteAnalyticsFetch();
    });

    it('should display chart titles', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Site Views Over Time/i)).toBeInTheDocument();
        expect(screen.getByText(/Orders Over Time/i)).toBeInTheDocument();
        expect(screen.getByText(/Revenue Trend/i)).toBeInTheDocument();
      });
    });

    it('should not call legacy sites analytics route', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-analytics-panel')).toBeInTheDocument();
      });

      const urls = global.fetch.mock.calls.map(([url]) => String(url));
      expect(urls.some((url) => url.includes('/api/sites/'))).toBe(false);
    });
  });

  describe('Growth gate', () => {
    it('should show upgrade gate for starter on workspace analytics', async () => {
      usePlan.mockReturnValue({
        plan: 'starter',
        isGrowth: false,
        features: { analytics: false },
      });
      useSiteWorkspace.mockReturnValue({
        embedded: true,
        siteId: 'site123',
        site: { id: 'site123', subdomain: 'test-salon' },
      });

      render(
        <MemoryRouter initialEntries={['/dashboard/sites/site123/analytics']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('analytics-upgrade-gate')).toBeInTheDocument();
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockShowError).not.toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    beforeEach(() => {
      useSiteWorkspace.mockReturnValue({
        embedded: false,
        siteId: 'site123',
        site: { id: 'site123', subdomain: 'test-salon' },
      });
      mockSiteAnalyticsFetch();
    });

    it('should have refresh button', async () => {
      render(
        <MemoryRouter initialEntries={['/analytics?siteId=site123']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should refresh data when refresh button clicked', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/analytics?siteId=site123']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const initialCalls = global.fetch.mock.calls.length;
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(global.fetch.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });

    it('should have link to dashboard when standalone', async () => {
      render(
        <MemoryRouter initialEntries={['/analytics?siteId=site123']}>
          <Analytics />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const dashboardLink = screen.getByRole('link', { name: /← Dashboard/i });
        expect(dashboardLink).toBeInTheDocument();
        expect(dashboardLink).toHaveAttribute('href', '/dashboard');
        expect(document.querySelector('.analytics-header.pane-quiet-header')).not.toBeInTheDocument();
      });
    });
  });
});
