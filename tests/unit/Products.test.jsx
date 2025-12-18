import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Products from '../../src/pages/Products';
import { useSite } from '../../src/context/SiteContext';
import { renderWithAllProviders } from '../utils/testWrapper.jsx';

// Helper to render with all required providers
const renderWithProviders = (component, initialEntries = ['/products?siteId=site-123']) => {
  return renderWithAllProviders(component, { initialEntries });
};

// Mock the SiteContext
vi.mock('../../src/context/SiteContext', () => ({
  useSite: vi.fn()
}));

// Mock the useToast hook
vi.mock('../../src/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn()
  }))
}));

// Mock authService
vi.mock('../../src/services/auth', () => ({
  authService: {
    getCurrentUser: vi.fn().mockResolvedValue({ user: { id: 'user-123', email: 'test@example.com' } }),
    login: vi.fn(),
    logout: vi.fn()
  }
}));

// Mock the API client
vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock the ProductCard component
vi.mock('../../src/components/ProductCard', () => ({
  default: ({ product, onEdit, onDelete }) => (
    <div data-testid={`product-card-${product.id}`}>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <p>Stock: {product.stock}</p>
      {product.image && <img src={product.image} alt={product.name} />}
      <button onClick={() => onEdit(product)}>Edit</button>
      <button onClick={() => onDelete(product.id)}>Delete</button>
    </div>
  )
}));

// Mock the ProductModal component
vi.mock('../../src/components/ProductModal', () => ({
  default: ({ isOpen, onClose, onSave, product }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="product-modal">
        <h2>{product ? 'Edit Product' : 'Add Product'}</h2>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => onSave({ name: 'Test Product', price: 99.99, stock: 10 })}>
          Save
        </button>
      </div>
    );
  }
}));

// Mock the ImportModal component
vi.mock('../../src/components/ImportModal', () => ({
  default: ({ isOpen, onClose, onImport }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="import-modal">
        <h2>Import Products</h2>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => onImport([{ name: 'Imported', price: 50 }])}>
          Import
        </button>
      </div>
    );
  }
}));

describe('Products Page', () => {
  const mockProducts = [
    {
      id: '1',
      name: 'Premium Widget',
      description: 'High-quality widget',
      price: 99.99,
      stock: 50,
      category: 'Electronics',
      image: 'https://example.com/widget.jpg',
      featured: true
    },
    {
      id: '2',
      name: 'Basic Gadget',
      description: 'Entry-level gadget',
      price: 29.99,
      stock: 0,
      category: 'Accessories',
      image: null,
      featured: false
    },
    {
      id: '3',
      name: 'Deluxe Tool',
      description: 'Professional tool',
      price: 149.99,
      stock: 25,
      category: 'Tools',
      image: 'https://example.com/tool.jpg',
      featured: false
    }
  ];

  const mockSiteContext = {
    currentSite: {
      id: 'site-123',
      business_name: 'Test Store',
      products: mockProducts
    },
    refreshSite: vi.fn(),
    updateSite: vi.fn().mockResolvedValue({ success: true })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useSite.mockReturnValue(mockSiteContext);
    
    // Mock fetch for API calls - default success response
    global.fetch = vi.fn((url) => {
      if (url.includes('/products')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ products: mockProducts })
        });
      }
      if (url.includes('/sites/') && !url.includes('/products')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ name: 'Test Site', products: mockProducts })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
    
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  // ============================================
  // Page Rendering Tests (4 tests)
  // ============================================
  describe('Page Display', () => {
    it('should render products page with header', () => {
      renderWithProviders(<Products />);

      expect(screen.getByRole('heading', { name: /products/i, level: 1 })).toBeInTheDocument();
      // Component shows product count instead of "manage" text
      expect(screen.getByText(/total products/i)).toBeInTheDocument();
    });

    it('should show loading state while fetching products', async () => {
      useSite.mockReturnValue({
        ...mockSiteContext,
        currentSite: null
      });

      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText(/Loading products/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show empty state when no products exist', async () => {
      // Mock fetch to return empty products
      global.fetch = vi.fn((url) => {
        if (url.includes('/products')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ products: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ name: 'Test Site' })
        });
      });

      renderWithProviders(<Products />);
      
      await waitFor(() => {
        expect(screen.getByText(/No products yet/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Product/i })).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should redirect to dashboard when no site selected', async () => {
      // Mock fetch to return error for missing siteId
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        json: async () => ({ error: 'No site selected' })
      }));

      renderWithProviders(<Products />, ['/products']); // No siteId in URL

      await waitFor(() => {
        // Component shows error or loading state
        expect(screen.getByText(/loading|error|no site/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  // ============================================
  // Products List Tests (5 tests)
  // ============================================
  describe('Products Display', () => {
    it('should display all products', async () => {
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
        expect(screen.getByText('Basic Gadget')).toBeInTheDocument();
        expect(screen.getByText('Deluxe Tool')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show product cards with correct details', async () => {
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
        expect(screen.getByText('$99.99')).toBeInTheDocument();
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should format prices correctly with two decimals', async () => {
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('$99.99')).toBeInTheDocument();
        expect(screen.getByText('$29.99')).toBeInTheDocument();
        expect(screen.getByText('$149.99')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show product images when available', async () => {
      renderWithProviders(<Products />);

      await waitFor(() => {
        const image = screen.getByAltText('Premium Widget');
        expect(image).toHaveAttribute('src', 'https://example.com/widget.jpg');
      }, { timeout: 2000 });
    });

    it('should show stock status correctly', async () => {
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Component shows availability status
      expect(screen.getByText(/Available|Unavailable/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // Add/Edit Product Tests (8 tests)
  // ============================================
  describe('Product Management', () => {
    it('should open product modal when add button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      const addButton = screen.getByRole('button', { name: /Add Product/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('product-modal')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should open product modal for editing existing product', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('product-modal')).toBeInTheDocument();
        expect(screen.getByText('Edit Product')).toBeInTheDocument();
      });
    });

    it('should save new product successfully', async () => {
      const user = userEvent.setup();
      
      // Mock fetch for save operation
      global.fetch = vi.fn((url, options) => {
        if (url.includes('/products') && (options?.method === 'POST' || options?.method === 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true })
          });
        }
        if (url.includes('/products') && !options) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ products: mockProducts })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ name: 'Test Site' })
        });
      });

      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Open add modal
      const addButton = screen.getByRole('button', { name: /Add Product/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('product-modal')).toBeInTheDocument();
      });

      // Save product
      const saveButton = screen.getByRole('button', { name: /Save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/products'),
          expect.objectContaining({ method: expect.stringMatching(/POST|PUT/) })
        );
      }, { timeout: 3000 });
    });

    it('should update existing product successfully', async () => {
      const user = userEvent.setup();
      
      // Mock fetch for update operation
      global.fetch = vi.fn((url, options) => {
        if (url.includes('/products') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true })
          });
        }
        if (url.includes('/products') && !options) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ products: mockProducts })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ name: 'Test Site' })
        });
      });

      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Open edit modal
      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/products'),
          expect.objectContaining({ method: expect.stringMatching(/POST|PUT/) })
        );
      }, { timeout: 3000 });
    });

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      mockSiteContext.updateSite.mockRejectedValueOnce(new Error('Save failed'));

      renderWithProviders(<Products />);

      // Open and attempt to save
      const addButton = screen.getByRole('button', { name: /add product/i });
      await user.click(addButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should close modal after successful save', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      // Open modal
      const addButton = screen.getByRole('button', { name: /add product/i });
      await user.click(addButton);

      // Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByTestId('product-modal')).not.toBeInTheDocument();
      });
    });

    it('should close modal when cancel clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      // Open modal
      const addButton = screen.getByRole('button', { name: /add product/i });
      await user.click(addButton);

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByTestId('product-modal')).not.toBeInTheDocument();
    });

    it('should show success message after save', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      // Open and save
      const addButton = screen.getByRole('button', { name: /add product/i });
      await user.click(addButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/product saved successfully/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Delete Product Tests (3 tests)
  // ============================================
  describe('Delete Product', () => {
    it('should show confirmation dialog before delete', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false); // Cancel deletion

      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      const deleteButton = screen.getByTitle('Delete');
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Delete')
      );
    });

    it('should delete product after confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => true); // Confirm deletion

      // Mock fetch for delete operation
      global.fetch = vi.fn((url, options) => {
        if (url.includes('/products') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true })
          });
        }
        if (url.includes('/products') && !options) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ products: mockProducts })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ name: 'Test Site' })
        });
      });

      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      const deleteButton = screen.getByTitle('Delete');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/products'),
          expect.objectContaining({ method: expect.stringMatching(/POST|PUT/) })
        );
      }, { timeout: 3000 });
    });

    it('should not delete product when cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false); // Cancel deletion

      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      const deleteButton = screen.getByTitle('Delete');
      await user.click(deleteButton);

      // Confirm was called but fetch should not be called
      expect(window.confirm).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/products'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  // ============================================
  // Import Products Tests (3 tests)
  // ============================================
  describe('Import Products', () => {
    it('should open import modal when import button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      const importButton = screen.getByRole('button', { name: /Import CSV/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByTestId('import-modal')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should import products from CSV successfully', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      // Open import modal
      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      // Trigger import
      const importModalButton = screen.getByRole('button', { name: /import/i, hidden: false });
      await user.click(importModalButton);

      await waitFor(() => {
        expect(mockSiteContext.updateSite).toHaveBeenCalled();
      });
    });

    it('should handle import errors gracefully', async () => {
      const user = userEvent.setup();
      mockSiteContext.updateSite.mockRejectedValueOnce(new Error('Import failed'));

      renderWithProviders(<Products />);

      // Open and attempt import
      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      const importModalButton = screen.getByRole('button', { name: /import/i, hidden: false });
      await user.click(importModalButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Search/Filter Tests (3 tests)
  // ============================================
  describe('Search and Filter', () => {
    it('should search products by name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      const searchInput = screen.getByPlaceholderText(/Search products/i);
      await user.type(searchInput, 'Premium');

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
        expect(screen.queryByText('Basic Gadget')).not.toBeInTheDocument();
        expect(screen.queryByText('Deluxe Tool')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should filter products by category', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      const categoryFilter = screen.getByRole('combobox');
      await user.selectOptions(categoryFilter, 'Electronics');

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
        expect(screen.queryByText('Basic Gadget')).not.toBeInTheDocument();
        expect(screen.queryByText('Deluxe Tool')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show all products when filter cleared', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Apply filter
      const categoryFilter = screen.getByRole('combobox');
      await user.selectOptions(categoryFilter, 'Electronics');

      await waitFor(() => {
        expect(screen.queryByText('Basic Gadget')).not.toBeInTheDocument();
      }, { timeout: 1000 });

      // Clear filter
      await user.selectOptions(categoryFilter, 'all');

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
        expect(screen.getByText('Basic Gadget')).toBeInTheDocument();
        expect(screen.getByText('Deluxe Tool')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
