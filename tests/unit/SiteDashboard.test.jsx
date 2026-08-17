import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SiteDashboard from '../../src/pages/SiteDashboard';
import SiteOverview from '../../src/components/dashboard/SiteOverview';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastContext } from '../../src/context/ToastContext';
import { sitesService } from '../../src/services/sites';

vi.mock('../../src/services/sites', () => ({
  sitesService: {
    getUserSites: vi.fn(),
    getSite: vi.fn(),
  },
}));

vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock('../../src/hooks/usePlan', () => ({
  usePlan: () => ({ isGrowth: true, isAbove: () => true }),
}));

vi.mock('../../src/components/ShareModal', () => ({
  default: ({ subdomain }) => (
    <div data-testid="share-modal-mock">Sharing {subdomain}</div>
  ),
}));

describe('SiteDashboard', () => {
  const mockUser = { id: 'user-1', name: 'Alex', email: 'alex@example.com' };
  const listedSite = {
    id: 'site-1',
    subdomain: 'river-salon',
    templateId: 'salon',
    status: 'published',
    plan: 'growth',
    businessName: 'River Salon',
  };

  const renderDashboard = (entry = '/dashboard/sites/site-1') => {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user: mockUser, loading: false, isAuthenticated: true }}>
          <ToastContext.Provider value={{ showSuccess: vi.fn(), showError: vi.fn() }}>
            <Routes>
              <Route path="/dashboard/sites/:siteId" element={<SiteDashboard />}>
                <Route index element={<SiteOverview />} />
              </Route>
            </Routes>
          </ToastContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sitesService.getUserSites.mockResolvedValue({ sites: [listedSite] });
    sitesService.getSite.mockResolvedValue({
      site: {
        ...listedSite,
        data: { businessName: 'River Salon', niche: 'salon' },
      },
    });
  });

  it('renders the site workspace with orders, appointments, and settings', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('site-dashboard')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'River Salon' })).toBeInTheDocument();
    expect(screen.getByTestId('site-nav-orders')).toHaveAttribute('href', '/dashboard/sites/site-1/orders');
    expect(screen.getByTestId('site-nav-appointments')).toHaveAttribute('href', '/dashboard/sites/site-1/appointments');
    expect(screen.getByTestId('site-nav-settings')).toHaveAttribute('href', '/dashboard/sites/site-1/settings');
    expect(screen.getByTestId('site-overview-orders')).toBeInTheDocument();
    expect(screen.getByTestId('site-overview-appointments')).toBeInTheDocument();
    expect(screen.getByTestId('site-overview-settings')).toBeInTheDocument();
    expect(screen.getByTestId('site-dashboard-edit')).toHaveAttribute('href', '/view/river-salon?edit=true');
    expect(screen.getByTestId('site-dashboard-builder')).toHaveAttribute('href', '/setup?site=site-1');
    expect(screen.getByTestId('site-overview-edit')).toHaveAttribute('href', '/view/river-salon?edit=true');
    expect(screen.getByTestId('site-dashboard-share')).toBeInTheDocument();
    expect(screen.getByTestId('site-dashboard-share')).toBeEnabled();
  });

  it('shows not found when the site is not in the account', async () => {
    sitesService.getUserSites.mockResolvedValue({ sites: [] });
    renderDashboard('/dashboard/sites/missing');

    await waitFor(() => {
      expect(screen.getByTestId('site-dashboard-not-found')).toBeInTheDocument();
    });
  });
});
