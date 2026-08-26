import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EditorPanel from '../../src/components/setup/EditorPanel';
import { SiteContext } from '../../src/context/SiteContext';
import { AuthContext } from '../../src/context/AuthContext';
import { sitesService } from '../../src/services/sites';

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock('../../src/services/sites', () => ({
  sitesService: {
    getUserSites: vi.fn(),
  },
}));

vi.mock('../../src/components/setup/forms/BusinessInfoForm', () => ({
  default: () => <div data-testid="business-info-form">Business Info Form</div>,
}));

vi.mock('../../src/components/setup/forms/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker">Theme Picker</div>,
}));

vi.mock('../../src/components/setup/forms/ServicesProductsEditor', () => ({
  default: () => <div data-testid="services-products-editor">Services & Products</div>,
}));

vi.mock('../../src/components/setup/forms/ContactBookingForm', () => ({
  default: () => <div data-testid="contact-booking-form">Contact & Booking</div>,
}));

global.fetch = vi.fn();

describe('EditorPanel - Trial & Subscription System', () => {
  let mockSiteContext;
  let mockAuthContext;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();

    mockSiteContext = {
      siteData: {
        id: 'draft-123',
        businessName: 'Test Business',
        template: 'salon',
        services: [],
        contact: {},
        social: {},
        themeVars: {},
      },
      updateField: vi.fn(),
      addService: vi.fn(),
      updateService: vi.fn(),
      deleteService: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false,
    };

    mockAuthContext = {
      user: {
        id: 1,
        email: 'test@example.com',
        plan: 'starter',
        subscription_status: null,
        trial_expires_at: null,
      },
      loading: false,
    };

    Storage.prototype.getItem = vi.fn(() => 'mock-auth-token');
  });

  const renderEditorPanel = (authOverride = {}, sitesData = []) => {
    sitesService.getUserSites.mockResolvedValue(sitesData);

    return render(
      <AuthContext.Provider value={{ ...mockAuthContext, ...authOverride }}>
        <SiteContext.Provider value={mockSiteContext}>
          <EditorPanel />
        </SiteContext.Provider>
      </AuthContext.Provider>
    );
  };

  describe('Editing without publish-time gating', () => {
    it('should not show upgrade banner during editing for starter users', async () => {
      renderEditorPanel({}, []);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Essentials/i })).toBeInTheDocument();
      });

      expect(screen.queryByText(/Start Your Free Trial!/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Subscribe to Publish Your Site/i)).not.toBeInTheDocument();
    });

    it('should allow starter users to open Services & Products tab', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Services & Products/i })).toBeInTheDocument();
      });

      const servicesTab = screen.getByRole('tab', { name: /Services & Products/i });
      expect(servicesTab).not.toBeDisabled();

      await user.click(servicesTab);
      expect(screen.getByTestId('services-products-editor')).toBeInTheDocument();
    });

    it('should allow starter users to open Contact & Booking tab', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Contact & Booking/i })).toBeInTheDocument();
      });

      const contactTab = screen.getByRole('tab', { name: /Contact & Booking/i });
      expect(contactTab).not.toBeDisabled();

      await user.click(contactTab);
      expect(screen.getByTestId('contact-booking-form')).toBeInTheDocument();
    });

    it('should expose all editor tabs for growth subscribers', async () => {
      renderEditorPanel({ user: { id: 1, email: 'test@example.com', plan: 'growth', subscription_status: 'active' } }, []);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Essentials/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Design/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Services & Products/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Contact & Booking/i })).toBeInTheDocument();
      });
    });

    it('should expose all editor tabs for trial users', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }, []);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Services & Products/i })).not.toBeDisabled();
        expect(screen.getByRole('tab', { name: /Contact & Booking/i })).not.toBeDisabled();
      });
    });
  });
});
