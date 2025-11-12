import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShoppingCart from '../../src/components/ecommerce/ShoppingCart';

// Mock useCart hook
const mockUseCart = {
  cartItems: [],
  isCartOpen: false,
  setIsCartOpen: vi.fn(),
  updateQuantity: vi.fn(),
  removeFromCart: vi.fn(),
  clearCart: vi.fn(),
  getCartTotal: vi.fn(() => 0),
  getItemCount: vi.fn(() => 0),
};

vi.mock('../../src/hooks/useCart', () => ({
  useCart: () => mockUseCart,
}));

// Mock CheckoutButton
vi.mock('../../src/components/ecommerce/CheckoutButton', () => ({
  default: ({ buttonText }) => <button>{buttonText}</button>,
}));

describe('ShoppingCart Component', () => {
  const defaultProps = {
    stripePublishableKey: 'pk_test_123',
    siteId: 'test-site-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCart.cartItems = [];
    mockUseCart.isCartOpen = false;
    mockUseCart.getItemCount.mockReturnValue(0);
    mockUseCart.getCartTotal.mockReturnValue(0);
  });

  describe('Cart Toggle Button', () => {
    it('should render cart toggle button', () => {
      render(<ShoppingCart {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /Shopping Cart/i });
      expect(toggleButton).toBeInTheDocument();
      expect(screen.getByText('🛒')).toBeInTheDocument();
    });

    it('should not show badge when cart is empty', () => {
      render(<ShoppingCart {...defaultProps} />);

      const badge = document.querySelector('.cart-badge');
      expect(badge).not.toBeInTheDocument();
    });

    it('should show badge with count when cart has items', () => {
      mockUseCart.getItemCount.mockReturnValue(3);
      render(<ShoppingCart {...defaultProps} />);

      const badge = screen.getByText('3');
      expect(badge).toHaveClass('cart-badge');
    });

    it('should toggle cart when clicking toggle button', async () => {
      const user = userEvent.setup();
      render(<ShoppingCart {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /Shopping Cart/i });
      await user.click(toggleButton);

      expect(mockUseCart.setIsCartOpen).toHaveBeenCalledWith(true);
    });

    it('should have has-items class when cart has items', () => {
      mockUseCart.getItemCount.mockReturnValue(2);
      render(<ShoppingCart {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /Shopping Cart/i });
      expect(toggleButton).toHaveClass('has-items');
    });
  });

  describe('Empty Cart State', () => {
    beforeEach(() => {
      mockUseCart.isCartOpen = true;
    });

    it('should show empty cart message when cart is empty', () => {
      render(<ShoppingCart {...defaultProps} />);

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(screen.getByText('🛍️')).toBeInTheDocument();
    });

    it('should have Continue Shopping button in empty state', () => {
      render(<ShoppingCart {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: /Continue Shopping/i });
      expect(continueButton).toBeInTheDocument();
    });

    it('should close cart when clicking Continue Shopping in empty state', async () => {
      const user = userEvent.setup();
      render(<ShoppingCart {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: /Continue Shopping/i });
      await user.click(continueButton);

      expect(mockUseCart.setIsCartOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('Cart with Items', () => {
    const mockItems = [
      {
        id: 1,
        name: 'Test Product 1',
        price: 19.99,
        quantity: 2,
        image: '/images/product1.jpg',
      },
      {
        id: 2,
        name: 'Test Product 2',
        price: 29.99,
        quantity: 1,
        options: { size: 'Large', color: 'Blue' },
      },
    ];

    beforeEach(() => {
      mockUseCart.isCartOpen = true;
      mockUseCart.cartItems = mockItems;
      mockUseCart.getItemCount.mockReturnValue(3);
      mockUseCart.getCartTotal.mockReturnValue(69.97);
    });

    it('should display all cart items', () => {
      render(<ShoppingCart {...defaultProps} />);

      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });

    it('should display item prices formatted as currency', () => {
      render(<ShoppingCart {...defaultProps} />);

      expect(screen.getByText('$19.99')).toBeInTheDocument();
      expect(screen.getByText('$29.99')).toBeInTheDocument();
    });

    it('should display item quantities', () => {
      render(<ShoppingCart {...defaultProps} />);

      const quantities = screen.getAllByText(/^[0-9]+$/).filter(el => 
        el.classList.contains('qty-display')
      );
      expect(quantities[0]).toHaveTextContent('2');
      expect(quantities[1]).toHaveTextContent('1');
    });

    it('should display item image when available', () => {
      render(<ShoppingCart {...defaultProps} />);

      const images = document.querySelectorAll('.cart-item-image img');
      expect(images[0]).toHaveAttribute('src', '/images/product1.jpg');
      expect(images[0]).toHaveAttribute('alt', 'Test Product 1');
    });

    it('should display item options when present', () => {
      render(<ShoppingCart {...defaultProps} />);

      expect(screen.getByText(/size: Large/i)).toBeInTheDocument();
      expect(screen.getByText(/color: Blue/i)).toBeInTheDocument();
    });

    it('should display cart total', () => {
      render(<ShoppingCart {...defaultProps} />);

      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
      expect(screen.getByText('$69.97')).toBeInTheDocument();
    });
  });

  describe('Quantity Controls', () => {
    beforeEach(() => {
      mockUseCart.isCartOpen = true;
      mockUseCart.cartItems = [{
        id: 1,
        name: 'Test Product',
        price: 1000,
        quantity: 2,
      }];
    });

    it('should increase quantity when clicking + button', async () => {
      const user = userEvent.setup();
      render(<ShoppingCart {...defaultProps} />);

      const increaseButtons = screen.getAllByRole('button', { name: /Increase quantity/i });
      await user.click(increaseButtons[0]);

      expect(mockUseCart.updateQuantity).toHaveBeenCalledWith(1, 3, undefined);
    });

    it('should decrease quantity when clicking - button', async () => {
      const user = userEvent.setup();
      render(<ShoppingCart {...defaultProps} />);

      const decreaseButtons = screen.getAllByRole('button', { name: /Decrease quantity/i });
      await user.click(decreaseButtons[0]);

      expect(mockUseCart.updateQuantity).toHaveBeenCalledWith(1, 1, undefined);
    });

    it('should have accessible quantity control buttons', () => {
      render(<ShoppingCart {...defaultProps} />);

      const increaseButton = screen.getAllByRole('button', { name: /Increase quantity/i })[0];
      const decreaseButton = screen.getAllByRole('button', { name: /Decrease quantity/i })[0];

      expect(increaseButton).toHaveAccessibleName('Increase quantity');
      expect(decreaseButton).toHaveAccessibleName('Decrease quantity');
    });
  });

  describe('Remove Item', () => {
    beforeEach(() => {
      mockUseCart.isCartOpen = true;
      mockUseCart.cartItems = [{
        id: 1,
        name: 'Test Product',
        price: 1000,
        quantity: 1,
      }];
    });

    it('should have remove button for each item', () => {
      render(<ShoppingCart {...defaultProps} />);

      const removeButton = screen.getByRole('button', { name: /Remove item/i });
      expect(removeButton).toBeInTheDocument();
      expect(screen.getByText('🗑️')).toBeInTheDocument();
    });

    it('should remove item when clicking remove button', async () => {
      const user = userEvent.setup();
      render(<ShoppingCart {...defaultProps} />);

      const removeButton = screen.getByRole('button', { name: /Remove item/i });
      await user.click(removeButton);

      expect(mockUseCart.removeFromCart).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('Clear Cart', () => {
    beforeEach(() => {
      mockUseCart.isCartOpen = true;
      mockUseCart.cartItems = [
        { id: 1, name: 'Product 1', price: 1000, quantity: 1 },
        { id: 2, name: 'Product 2', price: 2000, quantity: 1 },
      ];
    });

    it('should show Clear Cart button when cart has items', () => {
      render(<ShoppingCart {...defaultProps} />);

      const clearButton = screen.getByRole('button', { name: /Clear Cart/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear cart when clicking Clear Cart button', async () => {
      const user = userEvent.setup();
      render(<ShoppingCart {...defaultProps} />);

      const clearButton = screen.getByRole('button', { name: /Clear Cart/i });
      await user.click(clearButton);

      expect(mockUseCart.clearCart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Checkout', () => {
    beforeEach(() => {
      mockUseCart.isCartOpen = true;
      mockUseCart.cartItems = [{ id: 1, name: 'Product', price: 1000, quantity: 1 }];
    });

    it('should show checkout button when cart has items', () => {
      render(<ShoppingCart {...defaultProps} />);

      expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
    });

    it('should not show checkout button when cart is empty', () => {
      mockUseCart.cartItems = [];
      render(<ShoppingCart {...defaultProps} />);

      expect(screen.queryByText('Proceed to Checkout')).not.toBeInTheDocument();
    });

    it('should show Continue Shopping button in footer', () => {
      render(<ShoppingCart {...defaultProps} />);

      const continueButtons = screen.getAllByRole('button', { name: /Continue Shopping/i });
      expect(continueButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Cart Modal Controls', () => {
    beforeEach(() => {
      mockUseCart.isCartOpen = true;
    });

    it('should have close button in header', () => {
      render(<ShoppingCart {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /Close Cart/i });
      expect(closeButton).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('should close cart when clicking close button', async () => {
      const user = userEvent.setup();
      render(<ShoppingCart {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /Close Cart/i });
      await user.click(closeButton);

      expect(mockUseCart.setIsCartOpen).toHaveBeenCalledWith(false);
    });

    it('should close cart when clicking overlay', async () => {
      const user = userEvent.setup();
      render(<ShoppingCart {...defaultProps} />);

      const overlay = document.querySelector('.cart-overlay');
      await user.click(overlay);

      expect(mockUseCart.setIsCartOpen).toHaveBeenCalledWith(false);
    });

    it('should have open class when cart is open', () => {
      render(<ShoppingCart {...defaultProps} />);

      const sidebar = document.querySelector('.cart-sidebar');
      expect(sidebar).toHaveClass('open');
    });

    it('should not have open class when cart is closed', () => {
      mockUseCart.isCartOpen = false;
      render(<ShoppingCart {...defaultProps} />);

      const sidebar = document.querySelector('.cart-sidebar');
      expect(sidebar).not.toHaveClass('open');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseCart.isCartOpen = true;
      mockUseCart.cartItems = [{ id: 1, name: 'Product', price: 1000, quantity: 1 }];
    });

    it('should have accessible cart toggle button', () => {
      render(<ShoppingCart {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /Shopping Cart/i });
      expect(toggleButton).toHaveAccessibleName();
    });

    it('should have accessible close button', () => {
      render(<ShoppingCart {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /Close Cart/i });
      expect(closeButton).toHaveAccessibleName();
    });

    it('should have accessible quantity buttons', () => {
      render(<ShoppingCart {...defaultProps} />);

      const increaseButton = screen.getByRole('button', { name: /Increase quantity/i });
      const decreaseButton = screen.getByRole('button', { name: /Decrease quantity/i });

      expect(increaseButton).toHaveAccessibleName();
      expect(decreaseButton).toHaveAccessibleName();
    });

    it('should have accessible remove button', () => {
      render(<ShoppingCart {...defaultProps} />);

      const removeButton = screen.getByRole('button', { name: /Remove item/i });
      expect(removeButton).toHaveAccessibleName();
    });
  });

  describe('Price Formatting', () => {
    it('should format prices as USD currency', () => {
      mockUseCart.isCartOpen = true;
      mockUseCart.cartItems = [
        { id: 1, name: 'Product', price: 12.34, quantity: 1 },
      ];
      mockUseCart.getCartTotal.mockReturnValue(12.34);

      render(<ShoppingCart {...defaultProps} />);

      // Check for item price specifically (in cart-item-price div)
      const itemPrice = document.querySelector('.cart-item-price');
      expect(itemPrice).toHaveTextContent('$12.34');
    });

    it('should handle zero prices', () => {
      mockUseCart.isCartOpen = true;
      mockUseCart.cartItems = [
        { id: 1, name: 'Free Product', price: 0, quantity: 1 },
      ];
      mockUseCart.getCartTotal.mockReturnValue(0);

      render(<ShoppingCart {...defaultProps} />);

      // Check for subtotal specifically using getByRole or getByText with more context
      const subtotalSection = screen.getByText('Subtotal:').closest('.cart-total');
      const subtotalValue = subtotalSection.querySelector('strong');
      expect(subtotalValue).toHaveTextContent('$0.00');
    });
  });
});

