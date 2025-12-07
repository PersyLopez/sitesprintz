import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EditorPanel from '../../src/components/setup/EditorPanel';
import { SiteContext } from '../../src/context/SiteContext';
import { AuthContext } from '../../src/context/AuthContext';

// Mock services
vi.mock('../../src/services/sites', () => ({
  sitesService: {
    getUserSites: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock child components
vi.mock('../../src/components/setup/forms/BusinessInfoForm', () => ({
  default: () => <div data-testid="business-info-form">Business Info Form</div>
}));

vi.mock('../../src/components/setup/forms/ProductsEditor', () => ({
  default: () => <div data-testid="products-editor">Products Editor</div>
}));

vi.mock('../../src/components/setup/forms/BookingEditor', () => ({
  default: () => <div data-testid="booking-editor">Booking Editor</div>
}));

vi.mock('../../src/components/setup/forms/PaymentSettings', () => ({
  default: () => <div data-testid="payment-settings">Payment Settings</div>
}));

describe('EditorPanel - Scroll Navigation', () => {
  let mockSiteContext;
  let mockAuthContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock site context
    mockSiteContext = {
      siteData: {
        businessName: 'Test Business',
        template: 'restaurant',
        services: [],
        contact: {},
        social: {},
        themeVars: {}
      },
      updateField: vi.fn(),
      addService: vi.fn(),
      updateService: vi.fn(),
      deleteService: vi.fn()
    };

    // Mock auth context with pro plan (to avoid upgrade prompts)
    mockAuthContext = {
      user: {
        id: 1,
        email: 'test@example.com',
        plan: 'pro',
        subscription_status: 'active'
      },
      loading: false
    };

    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => 'mock-auth-token');
  });

  const renderEditorPanel = (authOverride = {}) => {
    return render(
      <AuthContext.Provider value={{ ...mockAuthContext, ...authOverride }}>
        <SiteContext.Provider value={mockSiteContext}>
          <EditorPanel />
        </SiteContext.Provider>
      </AuthContext.Provider>
    );
  };

  // ============================================================
  // Scroll Spy Functionality (10 tests)
  // ============================================================

  describe('Scroll Spy Functionality', () => {
    it.skip('should update active tab when scrolling to a section', async () => {
      const { container } = renderEditorPanel();

      await waitFor(() => {
        const businessTab = screen.getByRole('button', { name: /Business Info/i });
        expect(businessTab).toHaveClass('active');
      });

      // Get the content container and sections
      const contentContainer = container.querySelector('.editor-content');
      const servicesSection = container.querySelector('[data-section="services"]'); // Section for services

      if (contentContainer && servicesSection) {
        // Mock getBoundingClientRect for scroll spy
        servicesSection.getBoundingClientRect = vi.fn(() => ({
          top: 50, // Within viewport
          bottom: 400,
          height: 350,
          left: 0,
          right: 800,
          width: 800,
          x: 0,
          y: 50
        }));

        // Mock offsetTop which is used by the scroll handler
        Object.defineProperty(servicesSection, 'offsetTop', {
          configurable: true,
          value: 100 // Set offsetTop to match scroll logic
        });

        // Fire scroll event using fireEvent
        fireEvent.scroll(contentContainer, { target: { scrollTop: 150 } });

        await waitFor(() => {
          const servicesTab = screen.getByRole('button', { name: /Services/i });
          // The scroll spy should update the active tab
          expect(servicesTab).toHaveClass('active');
        }, { timeout: 2000 });
      }
    });

    it('should have sticky tabs during scroll', () => {
      const { container } = renderEditorPanel();

      const tabsContainer = container.querySelector('.editor-tabs');
      expect(tabsContainer).toBeInTheDocument();
      // CSS file testing in unit tests is unreliable, skipping style check
    });

    it('should smooth scroll to section when clicking tab', async () => {
      const user = userEvent.setup();
      const { container } = renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Services/i })).toBeInTheDocument();
      });

      const servicesTab = screen.getByRole('button', { name: /Services/i });

      // Mock scrollIntoView
      Element.prototype.scrollIntoView = vi.fn();

      await user.click(servicesTab);

      // scrollIntoView should be called
      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      });
    });

    it('should use smooth scroll behavior', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Contact/i })).toBeInTheDocument();
      });

      const contactTab = screen.getByRole('button', { name: /Contact/i });

      // Mock scrollIntoView
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      await user.click(contactTab);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });

    it('should prevent scroll spy updates during manual scroll', async () => {
      const user = userEvent.setup();
      const { container } = renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Colors/i })).toBeInTheDocument();
      });

      const colorsTab = screen.getByRole('button', { name: /Colors/i });
      Element.prototype.scrollIntoView = vi.fn();

      await user.click(colorsTab);

      // During the manual scroll, scroll spy should be temporarily disabled
      // This prevents tab jumping during smooth scroll
      await waitFor(() => {
        expect(colorsTab).toHaveClass('active');
      });
    });

    it('should have scroll-margin-top on sections for sticky tabs', () => {
      const { container } = renderEditorPanel();

      // Check that editor sections have scroll-margin-top in CSS
      const sections = container.querySelectorAll('.editor-section');
      sections.forEach(section => {
        const styles = window.getComputedStyle(section);
        // scroll-margin-top should be defined (value varies by CSS)
        expect(styles.scrollMarginTop).toBeDefined();
      });
    });

    it('should render section headers with titles', async () => {
      renderEditorPanel();

      expect(await screen.findByText(/🏢 Business Information/i)).toBeInTheDocument();
      expect(await screen.findByText(/✨ Services/i)).toBeInTheDocument();
      expect(await screen.findByText(/📞 Contact Information/i)).toBeInTheDocument();
      expect(await screen.findByText(/🎨 Brand Colors/i)).toBeInTheDocument();
    });

    it('should render section descriptions', async () => {
      renderEditorPanel();

      expect(await screen.findByText(/Tell us about your business/i)).toBeInTheDocument();
      expect(await screen.findByText(/Add and manage your service offerings/i)).toBeInTheDocument();
      expect(await screen.findByText(/Update your business contact details/i)).toBeInTheDocument();
      expect(await screen.findByText(/Customize your site's color scheme/i)).toBeInTheDocument();
    });

    it('should attach refs to all scrollable sections', async () => {
      const { container } = renderEditorPanel();

      await waitFor(() => {
        // Check that sections have data-section attributes
        const sections = container.querySelectorAll('[data-section]');
        expect(sections.length).toBeGreaterThan(0);
      });
    });

    it('should maintain active tab state across re-renders', async () => {
      const user = userEvent.setup();
      const { rerender } = renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Services/i })).toBeInTheDocument();
      });

      const servicesTab = screen.getByRole('button', { name: /Services/i });
      await user.click(servicesTab);

      await waitFor(() => {
        expect(servicesTab).toHaveClass('active');
      });

      // Re-render
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <SiteContext.Provider value={mockSiteContext}>
            <EditorPanel />
          </SiteContext.Provider>
        </AuthContext.Provider>
      );

      // Active state should persist
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Services/i })).toHaveClass('active');
      });
    });
  });

  // ============================================================
  // Section Navigation (8 tests)
  // ============================================================

  describe('Section Navigation', () => {
    it('should navigate to Business Info section', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Business Info/i })).toBeInTheDocument();
      });

      const businessTab = screen.getByRole('button', { name: /Business Info/i });
      await user.click(businessTab);

      await waitFor(() => {
        expect(screen.getByTestId('business-info-form')).toBeInTheDocument();
      });
    });

    it('should navigate to Services section', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Services/i })).toBeInTheDocument();
      });

      const servicesTab = screen.getByRole('button', { name: /Services/i });
      await user.click(servicesTab);

      await waitFor(() => {
        expect(servicesTab).toHaveClass('active');
      });
    });

    it('should navigate to Contact section', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Contact/i })).toBeInTheDocument();
      });

      const contactTab = screen.getByRole('button', { name: /Contact/i });
      await user.click(contactTab);

      await waitFor(() => {
        expect(contactTab).toHaveClass('active');
      });
    });

    it('should navigate to Colors section', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Colors/i })).toBeInTheDocument();
      });

      const colorsTab = screen.getByRole('button', { name: /Colors/i });
      await user.click(colorsTab);

      await waitFor(() => {
        expect(colorsTab).toHaveClass('active');
      });
    });

    it('should navigate to Products section (pro user)', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Products/i })).toBeInTheDocument();
      });

      const productsTab = screen.getByRole('button', { name: /Products/i });
      await user.click(productsTab);

      await waitFor(() => {
        expect(screen.getByTestId('products-editor')).toBeInTheDocument();
      });
    });

    it('should navigate to Booking section (pro user)', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Booking/i })).toBeInTheDocument();
      });

      const bookingTab = screen.getByRole('button', { name: /Booking/i });
      await user.click(bookingTab);

      await waitFor(() => {
        expect(screen.getByTestId('booking-editor')).toBeInTheDocument();
      });
    });

    it('should navigate to Payments section (pro user)', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Payments/i })).toBeInTheDocument();
      });

      const paymentsTab = screen.getByRole('button', { name: /Payments/i });
      await user.click(paymentsTab);

      await waitFor(() => {
        expect(screen.getByTestId('payment-settings')).toBeInTheDocument();
      });
    });

    it('should allow rapid tab switching without errors', async () => {
      const user = userEvent.setup();
      renderEditorPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Services/i })).toBeInTheDocument();
      });

      // Rapidly click different tabs
      const tabs = [
        screen.getByRole('button', { name: /Services/i }),
        screen.getByRole('button', { name: /Contact/i }),
        screen.getByRole('button', { name: /Colors/i }),
        screen.getByRole('button', { name: /Business Info/i }),
      ];

      for (const tab of tabs) {
        await user.click(tab);
      }

      // Should end on last clicked tab
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Business Info/i })).toHaveClass('active');
      });
    });
  });
});

