import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckoutButton from '@/components/ecommerce/CheckoutButton';
import * as useCartHook from '@/hooks/useCart';
import { api } from '../../src/services/api';

vi.mock('@/hooks/useCart');
vi.mock('../../src/services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn()
  },
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn()
  }
}));

describe('CheckoutButton', () => {
  const mockGetCartTotal = vi.fn();
  const mockClearCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCartTotal.mockReturnValue(10);
    vi.mocked(useCartHook.useCart).mockReturnValue({
      cartItems: [{ id: '1', name: 'Test Product', price: 10, quantity: 1 }],
      getCartTotal: mockGetCartTotal,
      clearCart: mockClearCart
    });
  });

  it('shows a blocked notice when Stripe and pay on site are both off', () => {
    render(<CheckoutButton siteId="site-1" />);
    expect(screen.getByTestId('checkout-upgrade-notice')).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-button')).not.toBeInTheDocument();
  });

  it('shows Stripe checkout when payments are ready', () => {
    render(<CheckoutButton siteId="site-1" paymentsReady stripePublishableKey="pk_test_123" />);
    expect(screen.getByTestId('checkout-button')).toHaveTextContent(/Proceed to Checkout/);
    expect(screen.getByText(/\$10\.00/)).toBeInTheDocument();
  });

  it('shows pay-on-site checkout when the owner enabled it', () => {
    render(<CheckoutButton siteId="site-1" payOnSite />);
    expect(screen.getByTestId('pay-on-site-checkout')).toBeInTheDocument();
    expect(screen.getByTestId('pay-on-site-place-order')).toHaveTextContent(/Place order/);
    expect(screen.queryByTestId('checkout-upgrade-notice')).not.toBeInTheDocument();
  });

  it('places an unpaid pay-on-site order', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      order: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', total: 10 }
    });

    render(<CheckoutButton siteId="site-1" payOnSite />);

    await user.type(screen.getByTestId('pay-on-site-name'), 'Alex Rivera');
    await user.type(screen.getByTestId('pay-on-site-email'), 'alex@example.com');
    await user.click(screen.getByTestId('pay-on-site-place-order'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/orders/site-1/pay-on-site', expect.objectContaining({
        customerName: 'Alex Rivera',
        customerEmail: 'alex@example.com',
        items: [{ id: '1', name: 'Test Product', price: 10, quantity: 1 }]
      }));
    });

    expect(mockClearCart).toHaveBeenCalled();
    expect(screen.getByTestId('pay-on-site-confirmation')).toHaveTextContent(/Order placed/);
  });

  it('keeps Stripe checkout and pay on site together', () => {
    render(<CheckoutButton siteId="site-1" paymentsReady payOnSite />);
    expect(screen.getByTestId('checkout-button')).toBeInTheDocument();
    expect(screen.getByTestId('pay-on-site-checkout')).toBeInTheDocument();
    expect(screen.getByText(/Or pay on site/)).toBeInTheDocument();
  });

  it('disables Stripe checkout when the cart is empty', () => {
    vi.mocked(useCartHook.useCart).mockReturnValue({
      cartItems: [],
      getCartTotal: vi.fn().mockReturnValue(0),
      clearCart: mockClearCart
    });

    render(<CheckoutButton siteId="site-1" paymentsReady />);
    expect(screen.getByTestId('checkout-button')).toBeDisabled();
  });

  it('redirects to the payment processor on Stripe checkout', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ redirectUrl: 'https://checkout.example/session' })
    });
    delete window.location;
    window.location = { href: '', origin: 'http://localhost:5173' };

    render(<CheckoutButton siteId="site-1" paymentsReady />);
    fireEvent.click(screen.getByTestId('checkout-button'));

    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.example/session');
    });
  });
});
