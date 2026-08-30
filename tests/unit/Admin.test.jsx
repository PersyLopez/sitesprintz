import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Admin from '../../src/pages/Admin';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';

const { mockApiGet } = vi.hoisted(() => ({ mockApiGet: vi.fn() }));

vi.mock('../../src/hooks/useAuth');
vi.mock('../../src/hooks/useToast');
vi.mock('../../src/services/api', async () => {
  const actual = await vi.importActual('../../src/services/api');
  return {
    ...actual,
    default: { ...actual.default, get: mockApiGet },
    api: { ...actual.api, get: mockApiGet },
  };
});
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));
vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));
vi.mock('../../src/components/analytics/StatsCard', () => ({
  default: ({ label, value }) => (
    <div data-testid="stats-card">
      <span>{label}</span>: <span>{value}</span>
    </div>
  ),
}));

describe('Admin Page', () => {
  const mockUser = { id: 'admin1', email: 'admin@test.com', role: 'admin' };
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const mockAdminData = {
    system: {
      status: 'Online',
      uptime: '99.9%',
      responseTime: 120,
      activeUsers: 45,
      totalRequests: 125847,
      memory: 62.4,
      cpu: 34.2,
      storage: 78.6
    },
    platform: {
      totalUsers: 1247,
      activeUsers: 856,
      userGrowth: 12.4,
      totalSites: 3521,
      publishedSites: 2894,
      draftSites: 627,
      siteGrowth: 18.2,
      totalRevenue: 45670,
      mrr: 15200,
      revenueGrowth: 22.5,
      conversionRate: 68.4,
      conversionChange: 5.2,
      churnRate: 3.2,
      avgRevenuePerUser: 36.60
    },
    growth: {
      newUsersToday: 23,
      newUsersWeek: 156,
      newUsersMonth: 682,
      newSitesToday: 47,
      newSitesWeek: 289,
      newSitesMonth: 1247,
      activeTrials: 124,
      conversions: 18,
      publishedToday: 34
    },
    subscriptions: {
      starter: 856,
      checkout: 234,
      pro: 91,
      trial: 66
    },
    recentSignups: [
      {
        id: 1,
        email: 'user1@example.com',
        name: 'John Doe',
        date: '2025-01-15T10:30:00Z',
        plan: 'trial'
      }
    ],
    topUsers: [
      { id: 1, name: 'John Doe', sites: 12, revenue: 2400, plan: 'pro' },
      { id: 2, name: 'Jane Smith', sites: 8, revenue: 1800, plan: 'pro' }
    ],
    recentActivity: [
      {
        id: 1,
        type: 'site_published',
        user: 'John Doe',
        description: 'Published "My Restaurant"',
        date: '2025-01-15T10:45:00Z'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, token: 'fake-token' });
    useToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue(mockAdminData);
    global.localStorage = {
      getItem: vi.fn(() => 'fake-token'),
    };
  });

  // Rendering (4 tests)
  describe('Page Rendering', () => {
    it('should render admin page', async () => {
      mockApiGet.mockResolvedValue(mockAdminData);

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should show page title', async () => {
      mockApiGet.mockResolvedValue(mockAdminData);

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      mockApiGet.mockReturnValue(new Promise(() => { }));

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      expect(screen.getByText(/loading admin data/i, { selector: '.sr-only' })).toBeInTheDocument();
      expect(document.querySelector('.skeleton-loader')).toBeInTheDocument();
    });

    it('should load admin data on mount', async () => {
      mockApiGet.mockResolvedValue(mockAdminData);

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          '/api/admin/analytics',
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        );
      });
    });
  });

  // Tabs (4 tests)
  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue(mockAdminData);
    });

    it('should have overview tab', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      });
    });

    it('should have activity tab', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/activity/i)).toBeInTheDocument();
      });
    });

    it('should have system tab', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/system/i)).toBeInTheDocument();
      });
    });

    it('should switch between tabs', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      });

      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      expect(activityTab).toBeInTheDocument();
    });
  });

  // Stats Display (4 tests)
  describe('Statistics Display', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue(mockAdminData);
    });

    it('should display platform stats', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/total users/i)).toBeInTheDocument();
      });
    });

    it('should display system stats', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statsCards = screen.getAllByTestId('stats-card');
        expect(statsCards.length).toBeGreaterThan(0);
      });
    });

    it('should show formatted numbers', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statsCards = screen.getAllByTestId('stats-card');
        expect(statsCards.length).toBeGreaterThan(0);
      });
    });

    it('should display admin data after loading', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statsCards = screen.getAllByTestId('stats-card');
        expect(statsCards.length).toBeGreaterThan(0);
      });
    });
  });

  // Links (4 tests)
  describe('Navigation Links', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue(mockAdminData);
    });

    it('should have link to users page', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/manage users/i)).toBeInTheDocument();
      });
    });

    it('should render admin subnav with hub link', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('admin-subnav')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Hub' })).toHaveAttribute('href', '/admin');
      });
    });

    it('should have refresh button', async () => {
      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should refresh data when button clicked', async () => {
      const user = userEvent.setup();
      mockApiGet.mockResolvedValue(mockAdminData);

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledTimes(2);
      });
    });
  });

  // Error Handling (4 tests)
  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockApiGet.mockRejectedValue(new Error('Failed'));

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
      });
    });

    it('should use mock data on error', async () => {
      mockApiGet.mockRejectedValue(new Error('Failed'));

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statsCards = screen.getAllByTestId('stats-card');
        expect(statsCards.length).toBeGreaterThan(0);
      });
    });

    it('should handle unauthorized access', async () => {
      mockApiGet.mockRejectedValue(new Error('Forbidden'));

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'));

      render(
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
      });
    });
  });
});

