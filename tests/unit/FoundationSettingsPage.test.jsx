/**
 * FoundationSettingsPage Component Tests
 * 
 * Test suite for the Foundation Settings Page container component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoundationSettingsPage from '../../src/pages/FoundationSettingsPage';

// Mock dependencies
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../src/hooks/useToast', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../src/services/sites', () => ({
  sitesService: {
    getUserSites: vi.fn(),
  },
}));

vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock('../../src/components/dashboard/FoundationSettings', () => ({
  default: ({ site, onUpdate }) => (
    <div data-testid="foundation-settings">
      <span>Foundation Settings for {site?.name}</span>
      <button onClick={() => onUpdate({})}>Update</button>
    </div>
  ),
}));

import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';
import { sitesService } from '../../src/services/sites';

describe('FoundationSettingsPage Component', () => {
  let mockShowSuccess;
  let mockShowError;

  beforeEach(() => {
    mockShowSuccess = vi.fn();
    mockShowError = vi.fn();

    useAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });

    useToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== LOADING STATE TESTS ====================
  describe('Loading State', () => {
    it('should show loading state initially', () => {
      sitesService.getUserSites.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<FoundationSettingsPage />);
      
      expect(screen.getByText('Loading your sites...')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should show spinner in loading state', () => {
      sitesService.getUserSites.mockImplementation(() => new Promise(() => {}));
      
      render(<FoundationSettingsPage />);
      
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });
  });

  // ==================== EMPTY STATE TESTS ====================
  describe('Empty State', () => {
    it('should show empty state when user has no sites', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: [] });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('No Sites Yet')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Create your first site to configure foundation features')).toBeInTheDocument();
      expect(screen.getByText('Create Site')).toBeInTheDocument();
    });

    it('should have create site link in empty state', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: [] });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        const createLink = screen.getByText('Create Site');
        expect(createLink).toHaveAttribute('href', '/create');
      });
    });
  });

  // ==================== SITE LIST RENDERING TESTS ====================
  describe('Site List Rendering', () => {
    const mockSites = [
      {
        id: 'site-1',
        name: 'My Restaurant',
        subdomain: 'myrestaurant',
        status: 'published',
        plan: 'pro',
        site_data: { foundation: {} }
      },
      {
        id: 'site-2',
        name: 'My Salon',
        subdomain: 'mysalon',
        status: 'draft',
        plan: 'starter',
        site_data: { foundation: {} }
      },
    ];

    it('should render list of user sites', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('My Restaurant')).toBeInTheDocument();
        expect(screen.getByText('My Salon')).toBeInTheDocument();
      });
    });

    it('should show site status indicators', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        // Published site has green indicator
        expect(screen.getByText('🟢')).toBeInTheDocument();
        // Draft site has yellow indicator
        expect(screen.getByText('🟡')).toBeInTheDocument();
      });
    });

    it('should show site subdomains', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('myrestaurant.sitesprintz.com')).toBeInTheDocument();
        expect(screen.getByText('mysalon.sitesprintz.com')).toBeInTheDocument();
      });
    });

    it('should show site plans', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('pro')).toBeInTheDocument();
        expect(screen.getByText('starter')).toBeInTheDocument();
      });
    });
  });

  // ==================== SITE SELECTION TESTS ====================
  describe('Site Selection', () => {
    const mockSites = [
      {
        id: 'site-1',
        name: 'Published Site',
        subdomain: 'published',
        status: 'published',
        plan: 'pro',
        site_data: { foundation: {} }
      },
      {
        id: 'site-2',
        name: 'Draft Site',
        subdomain: 'draft',
        status: 'draft',
        plan: 'starter',
        site_data: { foundation: {} }
      },
    ];

    it('should auto-select first published site', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Foundation Settings for Published Site')).toBeInTheDocument();
      });
    });

    it('should select first site if none are published', async () => {
      const draftSites = mockSites.map(site => ({ ...site, status: 'draft' }));
      sitesService.getUserSites.mockResolvedValueOnce({ sites: draftSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Foundation Settings for Published Site')).toBeInTheDocument();
      });
    });

    it('should allow switching between sites', async () => {
      const user = userEvent.setup();
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Foundation Settings for Published Site')).toBeInTheDocument();
      });
      
      // Click on draft site
      const draftSiteButton = screen.getByText('Draft Site').closest('button');
      await user.click(draftSiteButton);
      
      expect(screen.getByText('Foundation Settings for Draft Site')).toBeInTheDocument();
    });

    it('should highlight active site in sidebar', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        const activeSiteButton = screen.getByText('Published Site').closest('button');
        expect(activeSiteButton).toHaveClass('active');
      });
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should show error toast when loading sites fails', async () => {
      sitesService.getUserSites.mockRejectedValueOnce(new Error('Failed to load'));
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Failed to load your sites');
      });
    });

    it('should not crash if site data is malformed', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({
        sites: [{ id: 'site-1', name: 'Test' }] // Missing required fields
      });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
    });
  });

  // ==================== CONFIG UPDATE TESTS ====================
  describe('Config Updates', () => {
    const mockSites = [
      {
        id: 'site-1',
        name: 'Test Site',
        subdomain: 'test',
        status: 'published',
        plan: 'starter',
        site_data: {
          foundation: {
            trustSignals: { enabled: true }
          }
        }
      },
    ];

    it('should update site config in state when onUpdate called', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('foundation-settings')).toBeInTheDocument();
      });
      
      // Trigger update
      const updateButton = screen.getByText('Update');
      await userEvent.click(updateButton);
      
      // Should not crash (testing state update)
      expect(screen.getByTestId('foundation-settings')).toBeInTheDocument();
    });

    it('should show success toast after config update', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: mockSites });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('foundation-settings')).toBeInTheDocument();
      });
      
      const updateButton = screen.getByText('Update');
      await userEvent.click(updateButton);
      
      expect(mockShowSuccess).toHaveBeenCalledWith('Foundation settings updated!');
    });
  });

  // ==================== SITE HEADER TESTS ====================
  describe('Selected Site Header', () => {
    const mockSite = {
      id: 'site-1',
      name: 'Amazing Business',
      subdomain: 'amazing',
      status: 'published',
      plan: 'pro',
      site_data: { foundation: {} }
    };

    it('should display selected site name', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: [mockSite] });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Amazing Business')).toBeInTheDocument();
      });
    });

    it('should display site link with subdomain', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: [mockSite] });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        const siteLink = screen.getByText('amazing.sitesprintz.com ↗');
        expect(siteLink).toHaveAttribute('href', 'https://amazing.sitesprintz.com');
        expect(siteLink).toHaveAttribute('target', '_blank');
        expect(siteLink).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should display plan badge', async () => {
      sitesService.getUserSites.mockResolvedValueOnce({ sites: [mockSite] });
      
      render(<FoundationSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('pro Plan')).toBeInTheDocument();
      });
    });
  });
});

