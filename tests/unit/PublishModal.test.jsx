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

      // Growth is the current commerce plan (legacy Premium templates map here)
      const growthPlanCards = screen.getAllByText('Growth');
      const growthPlanCard = growthPlanCards.find(el =>
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(growthPlanCard).toBeTruthy();
      expect(growthPlanCard?.closest('.plan-card')).toHaveClass('selected');
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

      const growthPlanCards = screen.getAllByText('Growth');
      const growthPlanCard = growthPlanCards.find(el =>
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(growthPlanCard).toBeTruthy();
      expect(growthPlanCard?.closest('.plan-card')).toHaveClass('selected');
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

      const growthPlanCards = screen.getAllByText('Growth');
      const growthPlanCard = growthPlanCards.find(el =>
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(growthPlanCard).toBeTruthy();
      expect(growthPlanCard?.closest('.plan-card')).toHaveClass('selected');
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

      const growthPlanCards = screen.getAllByText('Growth');
      const growthPlanCard = growthPlanCards.find(el =>
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(growthPlanCard).toBeTruthy();
      expect(growthPlanCard?.closest('.plan-card')).toHaveClass('selected');
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
    it('does not require a merchant processor to publish a Growth template', () => {
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

      expect(screen.queryByRole('button', { name: /connect stripe/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/subscription required/i)).not.toBeInTheDocument();
    });

    it('does not require a merchant processor to publish a Premium template', () => {
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

      expect(screen.queryByRole('button', { name: /connect stripe/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/subscription required/i)).not.toBeInTheDocument();
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

      const growthPlanCard = screen.getByText('Growth').closest('.plan-card');
      fireEvent.click(growthPlanCard);

      expect(growthPlanCard).toHaveClass('selected');
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

      expect(screen.getByText(/Your website \+ templates/)).toBeInTheDocument();
      expect(screen.getByText(/Booking, cart & Stripe checkout/)).toBeInTheDocument();
    });
  });

  describe('Merchant payments', () => {
    it('does not ask owners to connect Stripe while publishing a site', () => {
      const siteData = {
        template: 'salon',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      expect(screen.queryByRole('button', { name: /connect stripe/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/set up payments/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /i'll do this later/i })).not.toBeInTheDocument();
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

