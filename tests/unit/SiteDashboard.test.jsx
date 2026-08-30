import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
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
    <div data-testid="share-modal">
      <span>Sharing {subdomain}</span>
      <button type="button" data-testid="share-whatsapp">WhatsApp</button>
    </div>
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

  const listedSite2 = {
    id: 'site-2',
    subdomain: 'summit-tow',
    templateId: 'tow',
    status: 'published',
    plan: 'growth',
    businessName: 'Summit Tow',
  };

  const renderDashboard = (entry = '/dashboard/sites/site-1') => {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user: mockUser, loading: false, isAuthenticated: true }}>
          <ToastContext.Provider value={{ showSuccess: vi.fn(), showError: vi.fn() }}>
            <Routes>
              <Route
                path="/dashboard/sites/:siteId"
                element={(
                  <>
                    <Link to="/dashboard/sites/site-2" data-testid="jump-site-2">jump site 2</Link>
                    <SiteDashboard />
                  </>
                )}
              >
                <Route index element={<SiteOverview />} />
                <Route path="appointments" element={
                  <div data-testid="booking-dashboard-embedded">
                    <button type="button" data-testid="appointments-tab">Appointments</button>
                    <button type="button" data-testid="add-service-button">Add Service</button>
                  </div>
                } />
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
    expect(screen.getByTestId('site-dashboard-view')).toHaveAttribute('href', expect.stringContaining('/view/river-salon'));
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

  it('opens share modal with WhatsApp channel', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('site-dashboard-share')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('site-dashboard-share'));

    await waitFor(() => {
      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
      expect(screen.getByTestId('share-whatsapp')).toBeInTheDocument();
    });
  });

  it('does not apply a stale list after siteId changes', async () => {
    const user = userEvent.setup();
    let resolveFirst;
    sitesService.getUserSites
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve;
      }))
      .mockResolvedValue({ sites: [listedSite, listedSite2] });
    sitesService.getSite.mockImplementation(async (id) => {
      const row = id === 'site-2' ? listedSite2 : listedSite;
      return { site: { ...row, data: { businessName: row.businessName } } };
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('jump-site-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('jump-site-2'));
    resolveFirst({ sites: [listedSite] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Summit Tow' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'River Salon' })).not.toBeInTheDocument();
  });

  it('does not keep previous site chrome after siteId changes', async () => {
    const user = userEvent.setup();
    sitesService.getUserSites.mockResolvedValue({ sites: [listedSite, listedSite2] });
    sitesService.getSite.mockImplementation(async (id) => {
      const row = id === 'site-2' ? listedSite2 : listedSite;
      return { site: { ...row, data: { businessName: row.businessName } } };
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'River Salon' })).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('jump-site-2'));

    expect(screen.queryByRole('heading', { name: 'River Salon' })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Summit Tow' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'River Salon' })).not.toBeInTheDocument();
  });

  it('renders booking console on nested appointments route', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('site-nav-appointments')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('site-nav-appointments'));

    await waitFor(() => {
      expect(screen.getByTestId('booking-dashboard-embedded')).toBeInTheDocument();
      expect(screen.getByTestId('appointments-tab')).toBeInTheDocument();
    });
  });
});
