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

describe('EditorPanel - Exclusive Tab Navigation', () => {
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
        plan: 'growth',
        subscription_status: 'active',
      },
      loading: false,
    };

    Storage.prototype.getItem = vi.fn(() => 'mock-auth-token');
  });

  const renderEditorPanel = (authOverride = {}) => render(
    <AuthContext.Provider value={{ ...mockAuthContext, ...authOverride }}>
      <SiteContext.Provider value={mockSiteContext}>
        <EditorPanel />
      </SiteContext.Provider>
    </AuthContext.Provider>
  );

  describe('Tablist accessibility', () => {
    it('should render a tablist with four tabs', () => {
      renderEditorPanel();

      expect(screen.getByRole('tablist', { name: /Editor sections/i })).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(4);
    });

    it('should mark only the active tab as selected', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      const essentialsTab = screen.getByRole('tab', { name: /Essentials/i });
      const designTab = screen.getByRole('tab', { name: /Design/i });

      expect(essentialsTab).toHaveAttribute('aria-selected', 'true');
      expect(designTab).toHaveAttribute('aria-selected', 'false');

      await user.click(designTab);

      expect(designTab).toHaveAttribute('aria-selected', 'true');
      expect(essentialsTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should render the active tabpanel with matching aria-labelledby', () => {
      renderEditorPanel();

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('id', 'editor-panel-essentials');
      expect(panel).toHaveAttribute('aria-labelledby', 'editor-tab-essentials');
    });
  });

  describe('Exclusive pane switching', () => {
    it('should show Essentials content by default', () => {
      renderEditorPanel();

      expect(screen.getByTestId('business-info-form')).toBeInTheDocument();
      expect(screen.queryByTestId('theme-picker')).not.toBeInTheDocument();
    });

    it('should switch to Design pane without scrolling', async () => {
      const user = userEvent.setup();
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
      renderEditorPanel();

      await user.click(screen.getByRole('tab', { name: /Design/i }));

      expect(screen.getByTestId('theme-picker')).toBeInTheDocument();
      expect(screen.queryByTestId('business-info-form')).not.toBeInTheDocument();
      expect(scrollSpy).not.toHaveBeenCalled();
      scrollSpy.mockRestore();
    });

    it('should switch to Services & Products pane', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await user.click(screen.getByRole('tab', { name: /Services & Products/i }));

      expect(screen.getByTestId('services-products-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('business-info-form')).not.toBeInTheDocument();
    });

    it('should switch to Contact & Booking pane', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await user.click(screen.getByRole('tab', { name: /Contact & Booking/i }));

      expect(screen.getByTestId('contact-booking-form')).toBeInTheDocument();
    });

    it('should keep only one data-section in the DOM', async () => {
      const user = userEvent.setup();
      const { container } = renderEditorPanel();

      await user.click(screen.getByRole('tab', { name: /Services & Products/i }));

      await waitFor(() => {
        expect(container.querySelectorAll('[data-section]')).toHaveLength(1);
        expect(container.querySelector('[data-section="services"]')).toBeInTheDocument();
      });
    });

    it('should support arrow-key navigation on the tablist', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      const essentialsTab = screen.getByRole('tab', { name: /Essentials/i });
      essentialsTab.focus();

      await user.keyboard('{ArrowRight}');

      expect(screen.getByRole('tab', { name: /Design/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('theme-picker')).toBeInTheDocument();
    });

    it('should allow rapid tab switching without errors', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      const tabs = [
        screen.getByRole('tab', { name: /Services & Products/i }),
        screen.getByRole('tab', { name: /Contact & Booking/i }),
        screen.getByRole('tab', { name: /Design/i }),
        screen.getByRole('tab', { name: /Essentials/i }),
      ];

      for (const tab of tabs) {
        await user.click(tab);
      }

      expect(screen.getByRole('tab', { name: /Essentials/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('business-info-form')).toBeInTheDocument();
    });
  });
});
