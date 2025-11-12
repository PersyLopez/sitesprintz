import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from '../../src/components/ecommerce/ProductCard';

// Mock useCart hook
const mockAddToCart = vi.fn();
vi.mock('../../src/hooks/useCart', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
  }),
}));

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 'prod-1',
    name: 'Test Product',
    description: 'This is a test product',
    price: 29.99,
    category: 'Electronics',
    image: '/images/product.jpg',
    stock: 15,
    available: true,
  };

  const renderProductCard = (product = mockProduct, showActions = true) => {
    return render(<ProductCard product={product} showActions={showActions} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display', () => {
    it('should render product card', () => {
    renderProductCard();
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('This is a test product')).toBeInTheDocument();
    });

    it('should display product name', () => {
      renderProductCard();

      expect(screen.getByRole('heading', { name: 'Test Product' })).toBeInTheDocument();
  });

  it('should display product description', () => {
    renderProductCard();
    
      expect(screen.getByText('This is a test product')).toBeInTheDocument();
  });

  it('should display product image', () => {
    renderProductCard();
    
      const image = screen.getByRole('img', { name: 'Test Product' });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/images/product.jpg');
  });

  it('should show placeholder when no image', () => {
      const noImageProduct = { ...mockProduct, image: null };
      renderProductCard(noImageProduct);
    
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

    it('should display category', () => {
      renderProductCard();

      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });
  });

  describe('Price Display', () => {
  it('should format price as currency', () => {
    renderProductCard();
    
    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

    it('should show recurring billing period', () => {
      const recurringProduct = {
        ...mockProduct,
        billingPeriod: 'monthly',
      };
      const { container } = renderProductCard(recurringProduct);

      // Check for recurring badge
      expect(screen.getByText('🔁 monthly')).toBeInTheDocument();
      
      // Check for price period
      const pricePeriod = container.querySelector('.price-period');
      expect(pricePeriod).toHaveTextContent('/ monthly');
    });

    it('should show compare at price when available', () => {
      const discountedProduct = {
        ...mockProduct,
        compareAtPrice: 39.99,
      };
      renderProductCard(discountedProduct);

      expect(screen.getByText('$39.99')).toBeInTheDocument();
    });

    it('should not show compare price if lower than actual price', () => {
      const invalidDiscountProduct = {
        ...mockProduct,
        price: 39.99,
        compareAtPrice: 29.99,
      };
      renderProductCard(invalidDiscountProduct);

      expect(screen.queryByText('$29.99')).not.toBeInTheDocument();
    });
  });

  describe('Badges', () => {
    it('should show featured badge', () => {
      const featuredProduct = { ...mockProduct, featured: true };
      renderProductCard(featuredProduct);

      expect(screen.getByText('⭐ Featured')).toBeInTheDocument();
    });

    it('should show out of stock badge', () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      const { container } = renderProductCard(outOfStockProduct);

      // Check for the badge specifically
      const badge = container.querySelector('.badge-out-of-stock');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Out of Stock');
    });

    it('should show recurring badge', () => {
      const recurringProduct = {
        ...mockProduct,
        billingPeriod: 'monthly',
      };
      renderProductCard(recurringProduct);

      expect(screen.getByText('🔁 monthly')).toBeInTheDocument();
    });
  });

  describe('Stock Status', () => {
    it('should show low stock warning', () => {
      const lowStockProduct = { ...mockProduct, stock: 5 };
      renderProductCard(lowStockProduct);

      expect(screen.getByText(/only 5 left in stock/i)).toBeInTheDocument();
    });

    it('should not show warning for sufficient stock', () => {
      renderProductCard();
    
    expect(screen.queryByText(/left in stock/i)).not.toBeInTheDocument();
  });

    it('should disable actions when out of stock', () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      renderProductCard(outOfStockProduct);
    
      expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
  });

    it('should disable actions when not available', () => {
      const unavailableProduct = { ...mockProduct, available: false };
      renderProductCard(unavailableProduct);
    
      expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled();
    });
  });

  describe('Quantity Selector', () => {
    it('should show quantity controls', () => {
      renderProductCard();
    
      expect(screen.getByLabelText('Decrease quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('Increase quantity')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
  });

    it('should increase quantity when + clicked', async () => {
    const user = userEvent.setup();
    renderProductCard();
    
      const increaseBtn = screen.getByLabelText('Increase quantity');
      await user.click(increaseBtn);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

    it('should decrease quantity when - clicked', async () => {
    const user = userEvent.setup();
    renderProductCard();
    
      const increaseBtn = screen.getByLabelText('Increase quantity');
      const decreaseBtn = screen.getByLabelText('Decrease quantity');
    
      await user.click(increaseBtn); // Go to 2
      await user.click(decreaseBtn); // Back to 1
    
      expect(screen.getByText('1')).toBeInTheDocument();
  });

    it('should not go below 1', async () => {
    const user = userEvent.setup();
    renderProductCard();
    
      const decreaseBtn = screen.getByLabelText('Decrease quantity');
      await user.click(decreaseBtn);
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });
  });

  describe('Add to Cart', () => {
    it('should have add to cart button', () => {
      renderProductCard();

      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });

    it('should call addToCart with product and quantity', async () => {
    const user = userEvent.setup();
    renderProductCard();
    
      const addButton = screen.getByRole('button', { name: /add to cart/i });
    await user.click(addButton);
    
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 1, {});
  });

    it('should call addToCart with correct quantity', async () => {
      const user = userEvent.setup();
      renderProductCard();

      const increaseBtn = screen.getByLabelText('Increase quantity');
      await user.click(increaseBtn);
      await user.click(increaseBtn); // Quantity = 3

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);

      expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 3, {});
    });

  it('should reset quantity after adding to cart', async () => {
    const user = userEvent.setup();
    renderProductCard();
    
      const increaseBtn = screen.getByLabelText('Increase quantity');
      await user.click(increaseBtn); // Quantity = 2
    
      const addButton = screen.getByRole('button', { name: /add to cart/i });
    await user.click(addButton);
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });
  });

  describe('Product Options', () => {
    it('should show product options', () => {
      const productWithOptions = {
        ...mockProduct,
        options: [
          {
            name: 'Size',
            values: ['Small', 'Medium', 'Large'],
          },
        ],
      };
      renderProductCard(productWithOptions);

      expect(screen.getByText('Size:')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should allow selecting options', async () => {
      const user = userEvent.setup();
      const productWithOptions = {
        ...mockProduct,
        options: [
          {
            name: 'Size',
            values: ['Small', 'Medium', 'Large'],
          },
        ],
      };
      renderProductCard(productWithOptions);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'Medium');

      expect(select).toHaveValue('Medium');
    });

    it('should include options when adding to cart', async () => {
      const user = userEvent.setup();
      const productWithOptions = {
        ...mockProduct,
        options: [
          {
            name: 'Size',
            values: ['Small', 'Medium', 'Large'],
          },
        ],
      };
      renderProductCard(productWithOptions);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'Large');

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);

      expect(mockAddToCart).toHaveBeenCalledWith(
        productWithOptions,
        1,
        { Size: 'Large' }
      );
    });

    it('should handle multiple options', async () => {
      const user = userEvent.setup();
      const productWithMultipleOptions = {
        ...mockProduct,
        options: [
          {
            name: 'Size',
            values: ['Small', 'Medium', 'Large'],
          },
          {
            name: 'Color',
            values: ['Red', 'Blue', 'Green'],
          },
        ],
      };
      renderProductCard(productWithMultipleOptions);

      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[0], 'Medium');
      await user.selectOptions(selects[1], 'Blue');

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);

      expect(mockAddToCart).toHaveBeenCalledWith(
        productWithMultipleOptions,
        1,
        { Size: 'Medium', Color: 'Blue' }
      );
    });
  });

  describe('Show Actions Prop', () => {
  it('should hide actions when showActions is false', () => {
      renderProductCard(mockProduct, false);

      expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Increase quantity')).not.toBeInTheDocument();
    });

    it('should show actions when showActions is true', () => {
      renderProductCard(mockProduct, true);

      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Increase quantity')).toBeInTheDocument();
    });

    it('should hide options when showActions is false', () => {
      const productWithOptions = {
        ...mockProduct,
        options: [
          {
            name: 'Size',
            values: ['Small', 'Medium', 'Large'],
          },
        ],
      };
      renderProductCard(productWithOptions, false);

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });
});
