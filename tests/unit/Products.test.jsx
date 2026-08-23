import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Products from '../../src/pages/Products';
import { renderWithAllProviders } from '../utils/testWrapper.jsx';
import { api } from '../../src/services/api';
import { useSiteWorkspace } from '../../src/context/SiteWorkspaceContext';

vi.mock('../../src/context/SiteWorkspaceContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSiteWorkspace: vi.fn(),
  };
});

// Mock dependencies
vi.mock('../../src/services/api', async () => {
  const actual = await vi.importActual('../../src/services/api');
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
  };
});

vi.mock('../../src/hooks/usePlan', () => ({
  usePlan: vi.fn(() => ({
    plan: 'growth',
    features: { payments: true }
  }))
}));

vi.mock('../../src/components/products/ProductModal', () => ({
  default: ({ product, onSave, onClose }) => (
    <div data-testid="product-modal">
      <h2>{product ? 'Edit Product' : 'Add Product'}</h2>
      <button onClick={onClose} data-testid="cancel-product-btn">Cancel</button>
      <button onClick={() => onSave({ name: 'New Product', price: 99.99, stock: 10 })} data-testid="save-product-btn">
        Save
      </button>
    </div>
  )
}));

vi.mock('../../src/components/products/ImportModal', () => ({
  default: ({ onImport, onClose }) => (
    <div data-testid="import-modal">
      <h2>Import Products</h2>
      <button onClick={onClose}>Cancel</button>
      <button onClick={() => onImport([{ name: 'Imported Product', price: 50 }])} data-testid="import-confirm-btn">
        Import
      </button>
    </div>
  )
}));

vi.mock('../../src/components/products/DeleteConfirmModal', () => ({
  default: ({ product, onConfirm, onCancel }) => (
    <div data-testid="delete-modal">
      <p>Delete {product?.name || 'product'}?</p>
      <button onClick={onCancel} data-testid="cancel-delete-btn">Cancel</button>
      <button onClick={onConfirm} data-testid="confirm-delete-btn">Delete Product</button>
    </div>
  )
}));

vi.mock('../../src/components/ecommerce/PaymentStatusCard', () => ({
  default: () => <div data-testid="payment-status-card">Payment Status</div>
}));

vi.mock('../../src/components/common/OptimizedImage', () => ({
  OptimizedImage: ({ src, alt }) => <img src={src} alt={alt} />
}));

vi.mock('../../src/components/layout/Header', () => ({
  default: () => <header data-testid="header">Header</header>
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>
}));

const mockSites = [
  {
    id: 'site-123',
    businessName: 'Test Store',
    name: 'Test Store',
    status: 'published',
    plan: 'growth'
  }
];

const mockProducts = [
  {
    id: '1',
    name: 'Premium Widget',
    description: 'High-quality widget',
    price: 99.99,
    stock: 50,
    category: 'Electronics',
    image: 'https://example.com/widget.jpg',
    available: true
  },
  {
    id: '2',
    name: 'Basic Gadget',
    description: 'Entry-level gadget',
    price: 29.99,
    stock: 0,
    category: 'Accessories',
    image: null,
    available: false
  },
  {
    id: '3',
    name: 'Deluxe Tool',
    description: 'Professional tool',
    price: 149.99,
    stock: 25,
    category: 'Tools',
    image: 'https://example.com/tool.jpg',
    available: true
  }
];

function setupApiMocks(overrides = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/api/sites') {
      return Promise.resolve({ sites: overrides.sites || mockSites });
    }
    if (url === '/api/sites/site-123/products') {
      return Promise.resolve({ products: overrides.products || mockProducts });
    }
    if (url === '/api/sites/site-123') {
      return Promise.resolve({ name: 'Test Store', businessName: 'Test Store' });
    }
    return Promise.resolve({});
  });

  api.put.mockImplementation((url) => {
    if (url === '/api/sites/site-123/products') {
      return Promise.resolve({ products: overrides.productsAfterSave || mockProducts });
    }
    return Promise.resolve({});
  });
}

const renderProducts = (initialEntries = ['/products?siteId=site-123']) =>
  renderWithAllProviders(<Products />, { initialEntries });

describe('Products Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks();
    useSiteWorkspace.mockReturnValue({
      embedded: false,
      siteId: null,
      site: null,
    });
    global.localStorage = {
      getItem: vi.fn((key) => {
        if (['token', 'authToken', 'accessToken'].includes(key)) return 'mock-token';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  describe('Page Display', () => {
    it('should render products page with header and payment status', async () => {
      renderProducts();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Products/i })).toBeInTheDocument();
      });

      expect(screen.getByTestId('payment-status-card')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should show loading state while fetching products', async () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderProducts();

      expect(screen.getByText(/Loading products/i)).toBeInTheDocument();
    });

    it('should show empty state when no products exist', async () => {
      setupApiMocks({ products: [] });
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText(/No products yet/i)).toBeInTheDocument();
      });

      expect(screen.getAllByRole('button', { name: /Add Product/i })[0]).toBeInTheDocument();
    });
  });

  describe('Products Display', () => {
    it('should display all products', async () => {
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
        expect(screen.getByText('Basic Gadget')).toBeInTheDocument();
        expect(screen.getByText('Deluxe Tool')).toBeInTheDocument();
      });
    });

    it('should format prices correctly with two decimals', async () => {
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('$99.99')).toBeInTheDocument();
        expect(screen.getByText('$29.99')).toBeInTheDocument();
        expect(screen.getByText('$149.99')).toBeInTheDocument();
      });
    });

    it('should show product images when available', async () => {
      renderProducts();

      await waitFor(() => {
        const image = screen.getByAltText('Premium Widget');
        expect(image).toHaveAttribute('src', 'https://example.com/widget.jpg');
      });
    });

    it('should show availability status', async () => {
      renderProducts();

      await waitFor(() => {
        expect(screen.getAllByText('Available').length).toBeGreaterThan(0);
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Product Management', () => {
    it('should open product modal when add button clicked', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Product/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('product-modal')).toBeInTheDocument();
      });
    });

    it('should save new product successfully', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Product/i });
      await user.click(addButton);

      const saveButton = screen.getByTestId('save-product-btn');
      await user.click(saveButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          '/api/sites/site-123/products',
          expect.objectContaining({ products: expect.any(Array) })
        );
      });
    });

    it('should close modal when cancel clicked', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Product/i });
      await user.click(addButton);

      const cancelButton = screen.getByTestId('cancel-product-btn');
      await user.click(cancelButton);

      expect(screen.queryByTestId('product-modal')).not.toBeInTheDocument();
    });
  });

  describe('Delete Product', () => {
    it('should show delete confirmation modal before deleting', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTestId('delete-product-1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
      });
      expect(screen.getByText(/Delete Premium Widget/i)).toBeInTheDocument();
    });

    it('should delete product after confirmation', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTestId('delete-product-1');
      await user.click(deleteButton);

      const confirmButton = screen.getByTestId('confirm-delete-btn');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          '/api/sites/site-123/products',
          expect.objectContaining({
            products: expect.arrayContaining([expect.not.objectContaining({ id: '1' })])
          })
        );
      });
    });

    it('should not delete product when cancelled', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTestId('delete-product-1');
      await user.click(deleteButton);

      const cancelButton = screen.getByTestId('cancel-delete-btn');
      await user.click(cancelButton);

      expect(api.put).not.toHaveBeenCalled();
    });
  });

  describe('Import Products', () => {
    it('should open import modal when import button clicked', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const importButton = screen.getByTestId('import-csv-btn');
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByTestId('import-modal')).toBeInTheDocument();
      });
    });

    it('should import products from CSV successfully', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const importButton = screen.getByTestId('import-csv-btn');
      await user.click(importButton);

      const importConfirmButton = screen.getByTestId('import-confirm-btn');
      await user.click(importConfirmButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          '/api/sites/site-123/products',
          expect.objectContaining({ products: expect.any(Array) })
        );
      });
    });
  });

  describe('Search and Filter', () => {
    it('should search products by name', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('product-search-input');
      await user.type(searchInput, 'Premium');

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
        expect(screen.queryByText('Basic Gadget')).not.toBeInTheDocument();
        expect(screen.queryByText('Deluxe Tool')).not.toBeInTheDocument();
      });
    });

    it('should filter products by category', async () => {
      const user = userEvent.setup();
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByTestId('product-category-filter');
      await user.selectOptions(categoryFilter, 'Electronics');

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
        expect(screen.queryByText('Basic Gadget')).not.toBeInTheDocument();
        expect(screen.queryByText('Deluxe Tool')).not.toBeInTheDocument();
      });
    });
  });

  describe('Embedded workspace', () => {
    beforeEach(() => {
      useSiteWorkspace.mockReturnValue({
        embedded: true,
        siteId: 'site-123',
        site: { id: 'site-123', subdomain: 'test-store' },
      });
    });

    it('does not render a nested main landmark or page h1', async () => {
      renderProducts();

      await waitFor(() => {
        expect(screen.getByText('Premium Widget')).toBeInTheDocument();
      });

      expect(screen.queryByRole('main')).toBeNull();
      expect(screen.queryByRole('heading', { level: 1, name: /Products/i })).toBeNull();
      expect(screen.getByRole('heading', { level: 2, name: 'Products' })).toBeInTheDocument();
      expect(screen.queryByTestId('header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
    });
  });
});
