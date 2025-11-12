import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PublishModal from '@/components/setup/PublishModal';
import { AuthContext } from '@/context/AuthContext';
import { ToastContext } from '@/context/ToastContext';

// Mock fetch globally
global.fetch = vi.fn();

const renderWithContext = (component, authValue, toastValue) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        <ToastContext.Provider value={toastValue}>
          {component}
        </ToastContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('PublishModal', () => {
  const mockOnClose = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  const mockNavigate = vi.fn();

  const defaultAuthValue = {
    user: { id: '123', email: 'test@example.com', subscription: null },
    loading: false
  };

  const defaultToastValue = {
    showSuccess: mockShowSuccess,
    showError: mockShowError
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock - will be overridden in individual tests
    global.fetch.mockReset();
    // Mock window.confirm to return false by default
    global.window.confirm = vi.fn(() => false);
  });

  describe('Plan Detection', () => {
    it('should detect premium template by tier metadata', () => {
      const siteData = {
        template: 'medical-specialty',
        tier: 'Premium',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      // Premium plan should be selected - check for selected plan card
      const premiumPlanCards = screen.getAllByText('Premium');
      const premiumPlanCard = premiumPlanCards.find(el => 
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(premiumPlanCard).toBeTruthy();
      expect(premiumPlanCard?.closest('.plan-card')).toHaveClass('selected');
    });

    it('should detect pro template by tier metadata', () => {
      const siteData = {
        template: 'restaurant-ordering',
        tier: 'Pro',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const proPlanCards = screen.getAllByText('Pro');
      const proPlanCard = proPlanCards.find(el => 
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(proPlanCard).toBeTruthy();
      expect(proPlanCard?.closest('.plan-card')).toHaveClass('selected');
    });

    it('should detect pro template by -pro suffix', () => {
      const siteData = {
        template: 'fitness-booking-pro',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const proPlanCards = screen.getAllByText('Pro');
      const proPlanCard = proPlanCards.find(el => 
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(proPlanCard).toBeTruthy();
      expect(proPlanCard?.closest('.plan-card')).toHaveClass('selected');
    });

    it('should detect pro template by template ID', () => {
      const siteData = {
        template: 'product-ordering',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const proPlanCards = screen.getAllByText('Pro');
      const proPlanCard = proPlanCards.find(el => 
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(proPlanCard).toBeTruthy();
      expect(proPlanCard?.closest('.plan-card')).toHaveClass('selected');
    });

    it('should default to starter for basic templates', () => {
      const siteData = {
        template: 'simple-landing',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const starterPlanCard = screen.getByText('Starter').closest('.plan-card');
      expect(starterPlanCard).toHaveClass('selected');
    });
  });

  describe('Validation', () => {
    it('should prevent publish without user', () => {
      const authValue = { user: null, loading: false };
      const siteData = { brand: { name: 'Test Business' } };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        authValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      expect(mockShowError).toHaveBeenCalledWith('Please log in to publish your site');
    });

    it('should prevent publish without business name', () => {
      const siteData = { template: 'basic' }; // No brand.name

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      expect(mockShowError).toHaveBeenCalledWith('Please add your business name before publishing');
    });

    it('should accept businessName as fallback', () => {
      const siteData = { 
        businessName: 'Test Business', // No brand.name but has businessName
        template: 'basic'
      };

      // Mock fetch for draft creation and publishing
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ draftId: 'test-draft-id' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            subdomain: 'test-business',
            url: 'http://localhost:3000/sites/test-business'
          })
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      // Should not show error
      expect(mockShowError).not.toHaveBeenCalledWith('Please add your business name before publishing');
    });
  });

  describe('Payment Logic', () => {
    it('should show error for pro plan without subscription', () => {
      const siteData = {
        template: 'restaurant-ordering',
        tier: 'Pro',
        brand: { name: 'Test Business' }
      };

      const authValue = {
        user: { id: '123', email: 'test@example.com', subscription: null },
        loading: false
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        authValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Pro subscription required')
      );
    });

    it('should show error for premium plan without subscription', () => {
      const siteData = {
        template: 'medical-premium',
        tier: 'Premium',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Premium subscription required')
      );
    });

    it('should allow starter plan without subscription', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      // Mock fetch for draft creation and publishing
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ draftId: 'test-draft-id' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            subdomain: 'test-business',
            url: 'http://localhost:3000/sites/test-business'
          })
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(mockShowError).not.toHaveBeenCalledWith(
          expect.stringContaining('requires a subscription')
        );
      });
    });
  });

  describe('Publish Process', () => {
    it('should publish successfully with valid data', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' },
        businessName: 'Test Business',
        phone: '555-1234',
        email: 'business@test.com'
      };

      // Mock fetch for draft creation and publishing
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ draftId: 'test-draft-id' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            subdomain: 'test-business',
            url: 'http://localhost:3000/sites/test-business'
          })
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle publish errors gracefully', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      // Mock fetch to fail on publish
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ draftId: 'test-draft-id' })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Network error' })
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      // Check that error was called with network error message
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringMatching(/Network error|Failed to publish/i)
      );
    });

    it('should show loading state during publish', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      // Mock fetch with delay for loading state test
      global.fetch.mockImplementation(
        (url) => {
          if (url.includes('/publish')) {
            return new Promise(resolve => setTimeout(() => resolve({
              ok: true,
              json: async () => ({
                subdomain: 'test-business',
                url: 'http://localhost:3000/sites/test-business'
              })
            }), 100));
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({ draftId: 'test-draft-id' })
          });
        }
      );

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      // Button should show loading state
      expect(await screen.findByText(/Publishing/)).toBeInTheDocument();
    });
  });

  describe('Plan Selection', () => {
    it('should allow changing plan before publish', () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const proPlanCard = screen.getByText('Pro').closest('.plan-card');
      fireEvent.click(proPlanCard);

      expect(proPlanCard).toHaveClass('selected');
    });

    it('should show plan features', () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      expect(screen.getByText(/Display-only site/)).toBeInTheDocument();
      expect(screen.getByText(/Stripe payments/)).toBeInTheDocument();
      expect(screen.getByText(/Advanced features/)).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal on cancel', () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing template ID', () => {
      const siteData = {
        brand: { name: 'Test Business' }
        // No template
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      // Should default to starter
      const starterPlanCard = screen.getByText('Starter').closest('.plan-card');
      expect(starterPlanCard).toHaveClass('selected');
    });

    it('should handle special characters in business name', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test & Business™ (LLC)' }
      };

      // Mock fetch for draft creation and publishing
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ draftId: 'test-draft-id' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            subdomain: 'test-business-llc',
            url: 'http://localhost:3000/sites/test-business-llc'
          })
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = screen.getByText(/Publish Site/i);
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });
});

