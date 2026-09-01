import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PublishModal from '@/components/setup/PublishModal';
import { AuthContext } from '@/context/AuthContext';
import { ToastContext } from '@/context/ToastContext';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

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
    api.get.mockResolvedValue({
      sites: [{ status: 'published', subdomain: 'existing-biz' }],
    });
    api.post.mockResolvedValue({ draftId: 'test-draft-id' });
    global.window.confirm = vi.fn(() => false);
  });

  const getPublishButton = () => screen.getByTestId('publish-submit');

  const waitForPlanGrid = async () => {
    await waitFor(() => {
      expect(screen.getByText('Starter')).toBeInTheDocument();
    });
  };

  describe('Plan Detection', () => {
    it('should detect premium template by tier metadata', async () => {
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

      await waitForPlanGrid();

      // Growth is the current commerce plan (legacy Premium templates map here)
      const growthPlanCards = screen.getAllByText('Growth');
      const growthPlanCard = growthPlanCards.find(el =>
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(growthPlanCard).toBeTruthy();
      expect(growthPlanCard?.closest('.plan-card')).toHaveClass('selected');
    });

    it('should detect pro template by tier metadata', async () => {
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

      await waitForPlanGrid();

      const growthPlanCards = screen.getAllByText('Growth');
      const growthPlanCard = growthPlanCards.find(el =>
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(growthPlanCard).toBeTruthy();
      expect(growthPlanCard?.closest('.plan-card')).toHaveClass('selected');
    });

    it('should detect pro template by -pro suffix', async () => {
      const siteData = {
        template: 'fitness-booking-pro',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitForPlanGrid();

      const growthPlanCards = screen.getAllByText('Growth');
      const growthPlanCard = growthPlanCards.find(el =>
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(growthPlanCard).toBeTruthy();
      expect(growthPlanCard?.closest('.plan-card')).toHaveClass('selected');
    });

    it('should detect pro template by template ID', async () => {
      const siteData = {
        template: 'product-ordering',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitForPlanGrid();

      const growthPlanCards = screen.getAllByText('Growth');
      const growthPlanCard = growthPlanCards.find(el =>
        el.closest('.plan-card')?.classList.contains('selected')
      );
      expect(growthPlanCard).toBeTruthy();
      expect(growthPlanCard?.closest('.plan-card')).toHaveClass('selected');
    });

    it('should default to starter for basic templates', async () => {
      const siteData = {
        template: 'simple-landing',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitForPlanGrid();

      const starterPlanCard = screen.getByText('Starter').closest('.plan-card');
      expect(starterPlanCard).toHaveClass('selected');
    });
  });

  describe('Validation', () => {
    it('should prevent publish without user', async () => {
      const authValue = { user: null, loading: false };
      const siteData = { brand: { name: 'Test Business' } };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        authValue,
        defaultToastValue
      );

      await waitFor(() => {
        expect(getPublishButton()).not.toBeDisabled();
      });
      fireEvent.click(getPublishButton());

      expect(mockShowError).toHaveBeenCalledWith('Please log in to publish your site');
    });

    it('should prevent publish without business name', async () => {
      const siteData = { template: 'basic' };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitFor(() => {
        expect(getPublishButton()).not.toBeDisabled();
      });
      fireEvent.click(getPublishButton());

      expect(mockShowError).toHaveBeenCalledWith('Please add your business name before publishing');
    });

    it('should accept businessName as fallback', () => {
      const siteData = { 
        businessName: 'Test Business', // No brand.name but has businessName
        template: 'basic'
      };

      api.post
        .mockResolvedValueOnce({ draftId: 'test-draft-id' })
        .mockResolvedValueOnce({
          subdomain: 'test-business',
          url: 'http://localhost:5173/view/test-business',
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = getPublishButton();
      fireEvent.click(publishButton);

      // Should not show error
      expect(mockShowError).not.toHaveBeenCalledWith('Please add your business name before publishing');
    });
  });

  describe('Live trial (no card)', () => {
    it('shows 15-day no-card trial copy and hides plan grid for first site', async () => {
      api.get.mockResolvedValue({ sites: [] });
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' },
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitFor(() => {
        expect(screen.getByTestId('live-trial-notice')).toBeInTheDocument();
      });
      expect(screen.queryByText('Starter')).not.toBeInTheDocument();
      expect(screen.queryByText('Growth')).not.toBeInTheDocument();
      expect(screen.queryByText(/Payment Method Required/i)).not.toBeInTheDocument();
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

      api.post
        .mockResolvedValueOnce({ draftId: 'test-draft-id' })
        .mockResolvedValueOnce({
          subdomain: 'test-business',
          url: 'http://localhost:5173/view/test-business',
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      const publishButton = getPublishButton();
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

      api.post
        .mockResolvedValueOnce({ draftId: 'test-draft-id' })
        .mockResolvedValueOnce({
          subdomain: 'test-business',
          url: 'http://localhost:5173/view/test-business',
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitFor(() => {
        expect(getPublishButton()).not.toBeDisabled();
      });
      fireEvent.click(getPublishButton());

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });

    it('should handle publish errors gracefully', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      api.post.mockReset();
      api.post
        .mockResolvedValueOnce({ draftId: 'test-draft-id' })
        .mockRejectedValueOnce(new Error('Network error'));

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitFor(() => {
        expect(getPublishButton()).not.toBeDisabled();
      });
      fireEvent.click(getPublishButton());

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringMatching(/Network error|Failed to publish/i)
      );
    });

    it('should show loading state during publish', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      api.post
        .mockImplementation((url) => {
          if (String(url).includes('/publish')) {
            return new Promise((resolve) => setTimeout(() => resolve({
              subdomain: 'test-business',
              url: 'http://localhost:5173/view/test-business',
            }), 100));
          }
          return Promise.resolve({ draftId: 'test-draft-id' });
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitFor(() => {
        expect(getPublishButton()).not.toBeDisabled();
      });

      fireEvent.click(getPublishButton());

      expect(await screen.findByText(/Publishing/)).toBeInTheDocument();
    });
  });

  describe('Plan Selection', () => {
    it('should allow changing plan before publish', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitForPlanGrid();

      const growthPlanCard = screen.getByText('Growth').closest('.plan-card');
      fireEvent.click(growthPlanCard);

      expect(growthPlanCard).toHaveClass('selected');
    });

    it('should show plan features', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test Business' }
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitForPlanGrid();

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
    it('should handle missing template ID', async () => {
      const siteData = {
        brand: { name: 'Test Business' }
        // No template
      };

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitForPlanGrid();

      // Should default to starter
      const starterPlanCard = screen.getByText('Starter').closest('.plan-card');
      expect(starterPlanCard).toHaveClass('selected');
    });

    it('should handle special characters in business name', async () => {
      const siteData = {
        template: 'basic',
        brand: { name: 'Test & Business™ (LLC)' }
      };

      api.post
        .mockResolvedValueOnce({ draftId: 'test-draft-id' })
        .mockResolvedValueOnce({
          subdomain: 'test-business-llc',
          url: 'http://localhost:5173/view/test-business-llc',
        });

      renderWithContext(
        <PublishModal siteData={siteData} onClose={mockOnClose} />,
        defaultAuthValue,
        defaultToastValue
      );

      await waitFor(() => {
        expect(getPublishButton()).not.toBeDisabled();
      });
      fireEvent.click(getPublishButton());

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });
  });
});

