import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutButton from '@/components/ecommerce/CheckoutButton';
import * as useCartHook from '@/hooks/useCart';
import * as useStripeHook from '@/hooks/useStripe';
import * as stripeUtils from '@/utils/stripe';

// Mock hooks
vi.mock('@/hooks/useCart');
vi.mock('@/hooks/useStripe');
vi.mock('@/utils/stripe');

describe('CheckoutButton', () => {
  const mockClearCart = vi.fn();
  const mockGetCartTotal = vi.fn();
  const mockStripe = { createPaymentMethod: vi.fn() };
  const mockProcessCheckout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default happy path mocks
    vi.mocked(useCartHook.useCart).mockReturnValue({
      cartItems: [{ id: '1', name: 'Test Product', price: 10, quantity: 1 }],
      getCartTotal: mockGetCartTotal.mockReturnValue(10),
      clearCart: mockClearCart
    });

    vi.mocked(useStripeHook.useStripe).mockReturnValue({
      stripe: mockStripe,
      loading: false,
      error: null
    });

    vi.mocked(stripeUtils.processCheckout).mockImplementation(mockProcessCheckout);
  });

  describe('Rendering', () => {
    it('should render checkout button with correct total', () => {
      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      expect(screen.getByText(/Proceed to Checkout/)).toBeInTheDocument();
      expect(screen.getByText(/\$10\.00/)).toBeInTheDocument();
    });

    it('should show custom button text when provided', () => {
      render(
        <CheckoutButton 
          stripePublishableKey="pk_test_123" 
          siteId="site-1"
          buttonText="Pay Now"
        />
      );
      
      expect(screen.getByText(/Pay Now/)).toBeInTheDocument();
    });

    it('should show loading state when Stripe is loading', () => {
      vi.mocked(useStripeHook.useStripe).mockReturnValue({
        stripe: null,
        loading: true,
        error: null
      });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Empty Cart Handling', () => {
    it('should disable button when cart is empty', () => {
      vi.mocked(useCartHook.useCart).mockReturnValue({
        cartItems: [],
        getCartTotal: vi.fn().mockReturnValue(0),
        clearCart: mockClearCart
      });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show error when trying to checkout with empty cart', async () => {
      vi.mocked(useCartHook.useCart).mockReturnValue({
        cartItems: [],
        getCartTotal: vi.fn().mockReturnValue(0),
        clearCart: mockClearCart
      });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Error should not be shown since button is disabled
      expect(mockProcessCheckout).not.toHaveBeenCalled();
    });
  });

  describe('Stripe Not Loaded', () => {
    it('should disable button when Stripe is not loaded', () => {
      vi.mocked(useStripeHook.useStripe).mockReturnValue({
        stripe: null,
        loading: false,
        error: null
      });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show error message when Stripe fails to load', () => {
      vi.mocked(useStripeHook.useStripe).mockReturnValue({
        stripe: null,
        loading: false,
        error: 'Failed to load Stripe'
      });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      expect(screen.getByText(/Stripe Error: Failed to load Stripe/)).toBeInTheDocument();
    });

    it('should show warning when Stripe key is not provided', () => {
      render(<CheckoutButton siteId="site-1" />);
      
      expect(screen.getByText(/Stripe is not configured/)).toBeInTheDocument();
    });
  });

  describe('Checkout Process', () => {
    it('should process checkout successfully', async () => {
      mockProcessCheckout.mockResolvedValue({ success: true });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show processing state
      expect(await screen.findByText('Processing...')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockProcessCheckout).toHaveBeenCalledWith(
          mockStripe,
          [{ id: '1', name: 'Test Product', price: 10, quantity: 1 }],
          'site-1'
        );
      });
    });

    it('should handle checkout errors gracefully', async () => {
      mockProcessCheckout.mockRejectedValue(new Error('Payment failed'));

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Payment failed/)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      mockProcessCheckout.mockRejectedValue(new Error('Network error'));

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should disable button while processing', async () => {
      mockProcessCheckout.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Button should be disabled during processing
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle cart total of zero', () => {
      vi.mocked(useCartHook.useCart).mockReturnValue({
        cartItems: [{ id: '1', name: 'Free Item', price: 0, quantity: 1 }],
        getCartTotal: vi.fn().mockReturnValue(0),
        clearCart: mockClearCart
      });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('should format large totals correctly', () => {
      vi.mocked(useCartHook.useCart).mockReturnValue({
        cartItems: [{ id: '1', name: 'Expensive Item', price: 1234.56, quantity: 1 }],
        getCartTotal: vi.fn().mockReturnValue(1234.56),
        clearCart: mockClearCart
      });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      expect(screen.getByText(/\$1234\.56/)).toBeInTheDocument();
    });

    it('should handle rapid button clicks', async () => {
      mockProcessCheckout.mockResolvedValue({ success: true });

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      
      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        // Should only process once
        expect(mockProcessCheckout).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should show error messages to screen readers', async () => {
      mockProcessCheckout.mockRejectedValue(new Error('Card declined'));

      render(<CheckoutButton stripePublishableKey="pk_test_123" siteId="site-1" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      const error = await screen.findByText(/Card declined/);
      expect(error).toBeInTheDocument();
      expect(error.closest('.checkout-error')).toBeInTheDocument();
    });
  });
});

