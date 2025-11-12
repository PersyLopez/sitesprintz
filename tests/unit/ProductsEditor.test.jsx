import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsEditor from '../../src/components/setup/forms/ProductsEditor';

// Mock dependencies
vi.mock('../../src/hooks/useSite', () => ({
  useSite: vi.fn(),
}));

vi.mock('../../src/components/setup/forms/ImageUploader', () => ({
  default: ({ value, onChange }) => (
    <div data-testid="image-uploader">
      <button onClick={() => onChange('https://example.com/image.jpg')}>
        Upload
      </button>
      {value && <span>Image: {value}</span>}
    </div>
  ),
}));

import { useSite } from '../../src/hooks/useSite';

describe('ProductsEditor Component', () => {
  let mockUpdateNestedField;
  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test description',
    price: '29.99',
    category: 'Services',
    image: '',
    stock: 10,
    available: true,
  };

  beforeEach(() => {
    mockUpdateNestedField = vi.fn();
    vi.clearAllMocks();

    // Mock window.confirm
    global.window.confirm = vi.fn(() => true);
  });

  // Empty State Test (1 test)
  describe('Empty State', () => {
    it('should show empty state when no products', () => {
      useSite.mockReturnValue({
        siteData: { products: [] },
        updateNestedField: mockUpdateNestedField,
      });

      render(<ProductsEditor />);

      expect(screen.getByText(/no products yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first product/i })).toBeInTheDocument();
    });
  });

  // Add Product Test (1 test)
  describe('Add Product', () => {
    it('should add new product', async () => {
      const user = userEvent.setup();
      useSite.mockReturnValue({
        siteData: { products: [] },
        updateNestedField: mockUpdateNestedField,
      });

      render(<ProductsEditor />);

      const addButton = screen.getByRole('button', { name: /add your first product/i });
      await user.click(addButton);

      expect(mockUpdateNestedField).toHaveBeenCalled();
      const call = mockUpdateNestedField.mock.calls[0];
      expect(call[0]).toBe('products');
      expect(call[1]).toHaveLength(1);
      expect(call[1][0]).toMatchObject({
        name: '',
        description: '',
        price: '',
        available: true,
      });
    });
  });

  // Product List Tests (2 tests)
  describe('Product List', () => {
    it('should display existing products', () => {
      useSite.mockReturnValue({
        siteData: { products: [mockProduct] },
        updateNestedField: mockUpdateNestedField,
      });

      render(<ProductsEditor />);

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('$29.99')).toBeInTheDocument();
    });

    it('should expand product on click', async () => {
      const user = userEvent.setup();
      useSite.mockReturnValue({
        siteData: { products: [mockProduct] },
        updateNestedField: mockUpdateNestedField,
      });

      render(<ProductsEditor />);

      // Initially collapsed - no form visible
      expect(screen.queryByPlaceholderText(/e.g., Premium Package/i)).not.toBeInTheDocument();

      // Click to expand
      const productHeader = screen.getByText('Test Product');
      await user.click(productHeader);

      // Now expanded - form visible
      expect(screen.getByPlaceholderText(/e.g., Premium Package/i)).toBeInTheDocument();
    });
  });

  // Delete Product Test (1 test)
  describe('Delete Product', () => {
    it('should delete product with confirmation', async () => {
      const user = userEvent.setup();
      useSite.mockReturnValue({
        siteData: { products: [mockProduct] },
        updateNestedField: mockUpdateNestedField,
      });

      render(<ProductsEditor />);

      // Expand product
      await user.click(screen.getByText('Test Product'));

      // Delete
      const deleteButton = screen.getByRole('button', { name: /delete product/i });
      await user.click(deleteButton);

      expect(global.window.confirm).toHaveBeenCalled();
      expect(mockUpdateNestedField).toHaveBeenCalledWith('products', []);
    });
  });
});
