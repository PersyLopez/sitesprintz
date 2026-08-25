import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EditorPanel from '../../src/components/setup/EditorPanel';
import { SiteContext } from '../../src/context/SiteContext';
import { AuthContext } from '../../src/context/AuthContext';

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock('../../src/services/sites', () => ({
  sitesService: {
    getUserSites: vi.fn(() => Promise.resolve([])),
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

describe('EditorPanel Component', () => {
  let mockSiteContext;
  let mockAuthContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSiteContext = {
      siteData: {
        businessName: 'Test Business',
        template: 'salon',
        services: [],
        contact: {},
        social: {},
        themeVars: {},
      },
      updateField: vi.fn(),
      updateNestedField: vi.fn(),
      addService: vi.fn(),
      updateService: vi.fn(),
      deleteService: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false,
    };

    mockAuthContext = {
      user: { id: 1, email: 'test@example.com', role: 'user', plan: 'growth', subscription_status: 'active' },
      loading: false,
    };
  });

  const renderEditorPanel = (authOverride = {}) => render(
    <AuthContext.Provider value={{ ...mockAuthContext, ...authOverride }}>
      <SiteContext.Provider value={mockSiteContext}>
        <EditorPanel />
      </SiteContext.Provider>
    </AuthContext.Provider>
  );

  describe('Panel Structure', () => {
    it('should render editor panel with Essentials tab active', () => {
      renderEditorPanel();

      expect(screen.getByRole('tab', { name: /Essentials/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('business-info-form')).toBeInTheDocument();
    });

    it('should show all four section tabs', () => {
      renderEditorPanel();

      expect(screen.getByRole('tab', { name: /Essentials/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Design/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Services & Products/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Contact & Booking/i })).toBeInTheDocument();
    });

    it('should switch between exclusive tab panels', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await user.click(screen.getByRole('tab', { name: /Design/i }));

      expect(screen.getByRole('tab', { name: /Design/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('theme-picker')).toBeInTheDocument();
      expect(screen.queryByTestId('business-info-form')).not.toBeInTheDocument();
    });

    it('should render undo and redo controls', () => {
      renderEditorPanel();

      expect(screen.getByRole('button', { name: /Undo last change/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Redo last undone change/i })).toBeInTheDocument();
    });
  });

  describe('Exclusive panes', () => {
    it('should show only Services & Products pane when that tab is active', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await user.click(screen.getByRole('tab', { name: /Services & Products/i }));

      expect(screen.getByTestId('services-products-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('business-info-form')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contact-booking-form')).not.toBeInTheDocument();
    });

    it('should show only Contact & Booking pane when that tab is active', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await user.click(screen.getByRole('tab', { name: /Contact & Booking/i }));

      expect(screen.getByTestId('contact-booking-form')).toBeInTheDocument();
      expect(screen.queryByTestId('services-products-editor')).not.toBeInTheDocument();
    });

    it('should expose a single visible data-section at a time', async () => {
      const user = userEvent.setup();
      const { container } = renderEditorPanel();

      expect(container.querySelectorAll('[data-section]')).toHaveLength(1);

      await user.click(screen.getByRole('tab', { name: /Design/i }));

      await waitFor(() => {
        expect(container.querySelectorAll('[data-section]')).toHaveLength(1);
        expect(container.querySelector('[data-section="design"]')).toBeInTheDocument();
      });
    });
  });
});
