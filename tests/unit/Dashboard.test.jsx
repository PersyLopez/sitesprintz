import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../src/pages/Dashboard';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastContext } from '../../src/context/ToastContext';
import { sitesService } from '../../src/services/sites';

// Mock services
vi.mock('../../src/services/sites', () => ({
  sitesService: {
    getUserSites: vi.fn(),
    deleteSite: vi.fn(),
  },
}));

// Mock child components
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock('../../src/components/dashboard/SiteCard', () => ({
  default: ({ site, onDelete, onDuplicate }) => (
    <div data-testid={`site-card-${site.id}`}>
      <h3>{site.name}</h3>
      <span>{site.status}</span>
      <button onClick={onDelete}>Delete</button>
      <button onClick={onDuplicate}>Duplicate</button>
    </div>
  ),
}));

vi.mock('../../src/components/dashboard/WelcomeModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="welcome-modal">
      <h2>Welcome!</h2>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../../src/components/dashboard/TrialBanner', () => ({
  default: ({ user }) => (
    <div data-testid="trial-banner">Trial: {user.subscription_status}</div>
  ),
}));

vi.mock('../../src/components/dashboard/StripeConnectSection', () => ({
  default: ({ connected, onConnect }) => (
    <div data-testid="stripe-connect">
      <span>Stripe: {connected ? 'Connected' : 'Not Connected'}</span>
      <button onClick={onConnect}>Connect</button>
    </div>
  ),
}));

// Mock window.confirm
global.confirm = vi.fn();

// Mock fetch for Stripe and orders
global.fetch = vi.fn();

describe('Dashboard Page', () => {
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  const mockNavigate = vi.fn();

  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    subscription_plan: 'starter',
    subscription_status: 'active',
  };

  const mockSites = [
    {
      id: 1,
      name: 'My First Site',
      status: 'published',
      plan: 'starter',
      url: 'my-first-site',
    },
    {
      id: 2,
      name: 'My Second Site',
      status: 'draft',
      plan: 'pro',
      url: 'my-second-site',
    },
  ];

  const renderDashboard = (user = mockUser, sites = mockSites) => {
    sitesService.getUserSites.mockResolvedValue({ sites });

    return render(
      <BrowserRouter>
        <AuthContext.Provider
          value={{
            user,
            loading: false,
            isAuthenticated: true,
            logout: vi.fn(),
          }}
        >
          <ToastContext.Provider
            value={{
              showSuccess: mockShowSuccess,
              showError: mockShowError,
            }}
          >
            <Dashboard />
          </ToastContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch.mockClear();
    global.confirm.mockClear();
    
    // Default mock for pending orders fetch
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [] }),
    });
  });

  describe('Page Rendering', () => {
    it('should render dashboard with header and footer', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('footer')).toBeInTheDocument();
      });
    });

    it('should display user greeting with name', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, John Doe/i)).toBeInTheDocument();
      });
    });

    it('should display user greeting with email username if no name', async () => {
      const userWithoutName = { ...mockUser, name: null };
      renderDashboard(userWithoutName);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, john/i)).toBeInTheDocument();
      });
    });

    it('should display generic greeting if no name or email', async () => {
      const userMinimal = { ...mockUser, name: null, email: null };
      renderDashboard(userMinimal);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, there/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching sites', () => {
      sitesService.getUserSites.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderDashboard();

      expect(screen.getByText('Loading your sites...')).toBeInTheDocument();
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('should hide loading state after sites are loaded', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading your sites...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when user has no sites', async () => {
      renderDashboard(mockUser, []);

      await waitFor(() => {
        expect(screen.getByText('No sites yet')).toBeInTheDocument();
        expect(screen.getByText('Create your first website to get started')).toBeInTheDocument();
      });
    });

    it('should have create first site button in empty state', async () => {
      renderDashboard(mockUser, []);

      await waitFor(() => {
        const createButton = screen.getByRole('link', { name: /Create Your First Site/i });
        expect(createButton).toBeInTheDocument();
        expect(createButton).toHaveAttribute('href', '/setup');
      });
    });
  });

  describe('Sites Display', () => {
    it('should display all user sites', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('site-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('site-card-2')).toBeInTheDocument();
      });
    });

    it('should display site statistics cards', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Total Sites')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(screen.getByText('2')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Published')).toBeInTheDocument();
      expect(screen.getByText('Drafts')).toBeInTheDocument();
    });

    it('should show "Your Sites" heading', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Your Sites/i })).toBeInTheDocument();
      });
    });
  });

  describe('Site Actions', () => {
    it('should delete site after confirmation', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(true);
      sitesService.deleteSite.mockResolvedValue({});
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('site-card-1')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /Delete/i })[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          'Are you sure you want to delete this site? This action cannot be undone.'
        );
        expect(sitesService.deleteSite).toHaveBeenCalledWith(1, 1);
        expect(mockShowSuccess).toHaveBeenCalledWith('Site deleted successfully');
      });
    });

    it('should not delete site if confirmation cancelled', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(false);
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('site-card-1')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /Delete/i })[0];
      await user.click(deleteButton);

      expect(sitesService.deleteSite).not.toHaveBeenCalled();
    });

    it('should show error if delete fails', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(true);
      sitesService.deleteSite.mockRejectedValue(new Error('Delete failed'));
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('site-card-1')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /Delete/i })[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Failed to delete site');
      });
    });

    it('should duplicate site successfully', async () => {
      const user = userEvent.setup();
      const duplicatedSite = { id: 3, name: 'My First Site (Copy)', status: 'draft' };
      
      // First call is for loadPendingOrders, second is for duplicate
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => duplicatedSite,
        });
        
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('site-card-1')).toBeInTheDocument();
      }, { timeout: 3000 });

      const duplicateButton = screen.getAllByRole('button', { name: /Duplicate/i })[0];
      await user.click(duplicateButton);

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Site duplicated successfully');
      }, { timeout: 3000 });
    });

    it('should show error if duplicate fails', async () => {
      const user = userEvent.setup();
      
      // First call is for loadPendingOrders, second is for duplicate (fails)
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ count: 0 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Failed to duplicate' }),
        });
        
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('site-card-1')).toBeInTheDocument();
      });

      const duplicateButton = screen.getAllByRole('button', { name: /Duplicate/i })[0];
      await user.click(duplicateButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Failed to duplicate site');
      }, { timeout: 5000 });
    });
  });

  describe('Navigation Actions', () => {
    it('should have Create New Site button', async () => {
      renderDashboard();

      await waitFor(() => {
        const createButton = screen.getByRole('link', { name: /Create New Site/i });
        expect(createButton).toBeInTheDocument();
        expect(createButton).toHaveAttribute('href', '/setup');
      });
    });

    it('should have Analytics button', async () => {
      renderDashboard();

      await waitFor(() => {
        const analyticsButton = screen.getByRole('link', { name: /Analytics/i });
        expect(analyticsButton).toBeInTheDocument();
        expect(analyticsButton).toHaveAttribute('href', '/analytics');
      });
    });

    it('should show Admin and Users buttons for admin users', async () => {
      const adminUser = { ...mockUser, role: 'admin' };
      renderDashboard(adminUser);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Admin/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Users/i })).toBeInTheDocument();
      });
    });

    it('should not show Admin buttons for regular users', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Users/i })).not.toBeInTheDocument();
      });
    });

    it('should show Orders button for users with pro sites', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0 }),
      });
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Orders/i })).toBeInTheDocument();
      });
    });

    it('should not show Orders button for users without pro sites', async () => {
      const starterSites = [{ ...mockSites[0], plan: 'starter' }];
      renderDashboard(mockUser, starterSites);

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /Orders/i })).not.toBeInTheDocument();
      });
    });

    it('should display pending orders badge', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 }),
      });
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('site-card-1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Badge might take extra time to load
      await waitFor(() => {
        const badge = document.querySelector('.notification-badge');
        expect(badge).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Welcome Modal', () => {
    it('should show welcome modal for first-time users', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('welcome-modal')).toBeInTheDocument();
      });
    });

    it('should not show welcome modal for returning users', async () => {
      localStorage.setItem('hasVisitedDashboard', 'true');
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument();
      });
    });

    it('should close welcome modal when user clicks close', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('welcome-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /Close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument();
      });
    });

    it('should set localStorage flag after showing welcome modal', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(localStorage.getItem('hasVisitedDashboard')).toBe('true');
      });
    });
  });

  describe('Trial Banner', () => {
    it('should show trial banner for users in trial', async () => {
      const trialUser = { ...mockUser, subscription_status: 'trial' };
      renderDashboard(trialUser);

      await waitFor(() => {
        expect(screen.getByTestId('trial-banner')).toBeInTheDocument();
        expect(screen.getByText(/Trial: trial/i)).toBeInTheDocument();
      });
    });

    it('should not show trial banner for active subscribers', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByTestId('trial-banner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Stripe Connect Section', () => {
    it('should show Stripe connect section for pro users', async () => {
      const proUser = { ...mockUser, subscription_plan: 'pro' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: false }),
      });
      renderDashboard(proUser);

      await waitFor(() => {
        expect(screen.getByTestId('stripe-connect')).toBeInTheDocument();
      });
    });

    it('should not show Stripe connect section for starter users', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByTestId('stripe-connect')).not.toBeInTheDocument();
      });
    });

    it('should display Stripe connection status', async () => {
      const proUser = { ...mockUser, subscription_plan: 'pro' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: true }),
      });
      renderDashboard(proUser);

      await waitFor(() => {
        expect(screen.getByText(/Stripe: Connected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error if sites fail to load', async () => {
      sitesService.getUserSites.mockRejectedValue(new Error('Network error'));
      renderDashboard();

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Failed to load your sites');
      }, { timeout: 3000 });
    });

    it('should handle missing user ID gracefully', async () => {
      const userWithoutId = { ...mockUser, id: null };
      renderDashboard(userWithoutId);

      await waitFor(() => {
        expect(sitesService.getUserSites).not.toHaveBeenCalled();
      });
    });
  });
});

