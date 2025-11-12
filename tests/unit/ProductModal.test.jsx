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

  describe('Rendering', () => {
    it('should render in create mode when no product provided', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      expect(screen.getByRole('heading', { name: /add product/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. Margherita Pizza')).toBeInTheDocument();
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
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      expect(screen.getByText(/Product Name \*/)).toBeInTheDocument();
      expect(screen.getByText(/Price \(\$\) \*/)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should prevent submit with empty name', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      // Component uses toast system, not alert, so just verify save wasn't called
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should prevent submit with empty price', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      fireEvent.change(nameInput, { target: { value: 'Test Product' } });

      const submitButton = screen.getByRole('button', { name: /Add Product/i });
      fireEvent.click(submitButton);

      // Component uses toast system, not alert, so just verify save wasn't called
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should accept zero price', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
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
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      const priceInput = screen.getByPlaceholderText('0.00');
      
      // HTML5 min="0" attribute should prevent negative values
      expect(priceInput).toHaveAttribute('min', '0');
    });

    it('should parse price as float', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
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
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
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
        available: true
      });
    });

    it('should default category to General if empty', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
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
      
      const nameInput = screen.getByPlaceholderText('e.g. Margherita Pizza');
      const priceInput = screen.getByPlaceholderText('0.00');
      const imageInput = screen.getByLabelText('Image URL');

      fireEvent.change(nameInput, { target: { value: 'Test Product' } });
      fireEvent.change(priceInput, { target: { value: '10' } });
      fireEvent.change(imageInput, { target: { value: 'https://example.com/image.jpg' } });

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
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when clicking modal content', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      const modal = document.querySelector('.modal-content');
      fireEvent.click(modal);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Availability Toggle', () => {
    it('should toggle availability checkbox', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
      const checkbox = screen.getByLabelText('Available for purchase');
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should include availability in submission', () => {
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
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
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
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
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
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
      renderWithToast(<ProductModal onSave={mockOnSave} onClose={mockOnClose} />);
      
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

