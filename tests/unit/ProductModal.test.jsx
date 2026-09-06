import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductModal from '@/components/products/ProductModal';
import { ToastProvider } from '../../src/context/ToastContext';

// Wrapper component for tests that need ToastProvider
const renderWithToast = (component) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('ProductModal', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock alert
    global.alert = vi.fn();
  });

  const renderAddProduct = (props = {}) => {
    renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} {...props} />);
    fireEvent.click(screen.getByTestId('product-photo-skip'));
  };

  describe('Rendering', () => {
    it('should render in create mode when no product provided', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      expect(screen.getByRole('heading', { name: /add product/i })).toBeInTheDocument();
      expect(screen.getByTestId('product-photo-gallery')).toBeInTheDocument();
    });

    it('should render in edit mode when product provided', () => {
      const product = {
        id: '1',
        name: 'Test Product',
        description: 'Test description',
        price: 19.99,
        category: 'Food',
        image: 'https://example.com/image.jpg',
        available: true
      };

      renderWithToast(<ProductModal product={product} onSave={mockOnSave} onClose={mockOnClose} />);
      
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('19.99')).toBeInTheDocument();
    });

    it('should show all required field markers', () => {
      renderAddProduct();
      
      expect(screen.getByText(/Product name \*/)).toBeInTheDocument();
      expect(screen.getByText(/Price \(\$\) \*/)).toBeInTheDocument();
    });

    it('should start add mode with separate gallery and camera inputs', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);

      expect(screen.getByTestId('product-photo-gallery')).toBeInTheDocument();
      expect(screen.getByTestId('product-photo-camera-input')).toHaveAttribute('capture', 'environment');
      expect(screen.getByTestId('image-file-input')).not.toHaveAttribute('capture');
    });

    it('should continue to details when photo is skipped', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('product-photo-skip'));

      expect(screen.getByTestId('product-name-input')).toBeInTheDocument();
      expect(screen.queryByTestId('product-photo-gallery')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should prevent submit with empty name', () => {
      renderAddProduct();
      
      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      // Component uses toast system, not alert, so just verify save wasn't called
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should prevent submit with empty price', () => {
      renderAddProduct();
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      fireEvent.change(nameInput, { target: { value: 'Test Product' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      // Component uses toast system, not alert, so just verify save wasn't called
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should accept zero price', () => {
      renderAddProduct();
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const priceInput = screen.getByPlaceholderText('0.00');
      
      fireEvent.change(nameInput, { target: { value: 'Free Sample' } });
      fireEvent.change(priceInput, { target: { value: '0' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Free Sample',
        price: 0
      }));
    });

    it('should reject negative prices', () => {
      renderAddProduct();
      
      const priceInput = screen.getByPlaceholderText('0.00');
      
      // HTML5 min="0" attribute should prevent negative values
      expect(priceInput).toHaveAttribute('min', '0');
    });

    it('should parse price as float', () => {
      renderAddProduct();
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const priceInput = screen.getByPlaceholderText('0.00');
      
      fireEvent.change(nameInput, { target: { value: 'Test Product' } });
      fireEvent.change(priceInput, { target: { value: '19.99' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        price: 19.99
      }));
    });
  });

  describe('Form Submission', () => {
    it('should submit valid product', () => {
      renderAddProduct();
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const descInput = screen.getByPlaceholderText('Describe your product...');
      const priceInput = screen.getByPlaceholderText('0.00');
      const categoryInput = screen.getByPlaceholderText('e.g. Pizzas, Drinks');

      fireEvent.change(nameInput, { target: { value: 'Test Product' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });
      fireEvent.change(priceInput, { target: { value: '19.99' } });
      fireEvent.change(categoryInput, { target: { value: 'Food' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Test Product',
        description: 'Test description',
        price: 19.99,
        category: 'Food',
        image: '',
        stock: null,
        available: true
      });
    });

    it('should default category to General if empty', () => {
      renderAddProduct();
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const priceInput = screen.getByPlaceholderText('0.00');

      fireEvent.change(nameInput, { target: { value: 'Test Product' } });
      fireEvent.change(priceInput, { target: { value: '10' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        category: 'General'
      }));
    });

    it('should include all form fields in submission', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByTestId('use-image-url-btn'));
      fireEvent.change(screen.getByTestId('image-url-input'), {
        target: { value: 'https://example.com/image.jpg' }
      });
      fireEvent.click(screen.getByTestId('apply-image-url-btn'));
      fireEvent.click(screen.getByTestId('product-photo-continue'));

      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const priceInput = screen.getByPlaceholderText('0.00');

      fireEvent.change(nameInput, { target: { value: 'Test Product' } });
      fireEvent.change(priceInput, { target: { value: '10' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Product',
        price: 10,
        image: 'https://example.com/image.jpg',
        available: true
      }));
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when close button clicked', () => {
      renderAddProduct();
      
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', () => {
      renderAddProduct();
      
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when clicking modal content', () => {
      renderAddProduct();
      
      const modal = document.querySelector('.modal-content');
      fireEvent.click(modal);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Availability Toggle', () => {
    it('should toggle availability checkbox', () => {
      renderAddProduct();
      
      const checkbox = screen.getByLabelText('Available for purchase');
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should include availability in submission', () => {
      renderAddProduct();
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const priceInput = screen.getByPlaceholderText('0.00');
      const checkbox = screen.getByLabelText('Available for purchase');

      fireEvent.change(nameInput, { target: { value: 'Test Product' } });
      fireEvent.change(priceInput, { target: { value: '10' } });
      fireEvent.click(checkbox); // Uncheck

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        available: false
      }));
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large prices', () => {
      renderAddProduct();
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const priceInput = screen.getByPlaceholderText('0.00');

      fireEvent.change(nameInput, { target: { value: 'Expensive Item' } });
      fireEvent.change(priceInput, { target: { value: '999999.99' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        price: 999999.99
      }));
    });

    it('should handle special characters in name', () => {
      renderAddProduct();
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const priceInput = screen.getByPlaceholderText('0.00');

      fireEvent.change(nameInput, { target: { value: 'Test & Product™ (special)' } });
      fireEvent.change(priceInput, { target: { value: '10' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test & Product™ (special)'
      }));
    });

    it('should handle very long descriptions', () => {
      renderAddProduct();
      
      const longDesc = 'A'.repeat(1000);
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const descInput = screen.getByPlaceholderText('Describe your product...');
      const priceInput = screen.getByPlaceholderText('0.00');

      fireEvent.change(nameInput, { target: { value: 'Test Product' } });
      fireEvent.change(descInput, { target: { value: longDesc } });
      fireEvent.change(priceInput, { target: { value: '10' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        description: longDesc
      }));
    });
  });

  describe('Product Updates', () => {
    it('should update existing product', () => {
      const existingProduct = {
        id: '123',
        name: 'Original Name',
        description: 'Original description',
        price: 10,
        category: 'Old Category',
        image: '',
        available: true
      };

      renderWithToast(<ProductModal product={existingProduct} onSave={mockOnSave} onClose={mockOnClose} />);
      
      const nameInput = screen.getByDisplayValue('Original Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const submitButton = screen.getByRole('button', { name: /Update Product/i });
      fireEvent.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        id: '123',
        name: 'Updated Name'
      }));
    });
  });
});

