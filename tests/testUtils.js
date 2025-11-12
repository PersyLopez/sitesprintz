/**
 * Common Test Utilities
 * Shared helpers for writing consistent, maintainable tests
 */

import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../src/context/AuthContext';
import { ToastContext } from '../src/context/ToastContext';
import { SiteContext } from '../src/context/SiteContext';
import { CartContext } from '../src/context/CartContext';

/**
 * Mock User Objects
 */
export const mockUsers = {
  regular: {
    id: 'user-123',
    email: 'user@test.com',
    role: 'user',
    plan: 'starter',
    subscription: null
  },
  pro: {
    id: 'user-456',
    email: 'pro@test.com',
    role: 'user',
    plan: 'pro',
    subscription: { status: 'active', plan: 'pro' }
  },
  admin: {
    id: 'admin-789',
    email: 'admin@test.com',
    role: 'admin',
    plan: 'premium',
    subscription: { status: 'active', plan: 'premium' }
  }
};

/**
 * Mock Site Data
 */
export const mockSiteData = {
  id: 'site-123',
  businessName: 'Test Business',
  template: 'restaurant',
  brand: {
    name: 'Test Business',
    tagline: 'Great food, great service'
  },
  colors: {
    primary: '#06b6d4',
    secondary: '#14b8a6'
  },
  content: {
    hero: {
      title: 'Welcome',
      subtitle: 'Test subtitle'
    }
  }
};

/**
 * Default Context Values
 */
export const defaultContextValues = {
  auth: {
    user: mockUsers.regular,
    token: 'test-token',
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn()
  },
  toast: {
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
    showToast: vi.fn()
  },
  site: {
    siteData: mockSiteData,
    updateField: vi.fn(),
    updateNestedField: vi.fn(),
    resetSite: vi.fn(),
    previewKey: 0
  },
  cart: {
    cartItems: [],
    isCartOpen: false,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    getCartTotal: vi.fn(() => 0),
    getItemCount: vi.fn(() => 0),
    toggleCart: vi.fn()
  }
};

/**
 * Render component with all context providers
 */
export const renderWithProviders = (
  component,
  {
    authValue = defaultContextValues.auth,
    toastValue = defaultContextValues.toast,
    siteValue = defaultContextValues.site,
    cartValue = defaultContextValues.cart,
    routerType = 'memory', // 'memory' or 'browser'
    initialEntries = ['/']
  } = {}
) => {
  const Router = routerType === 'memory' ? MemoryRouter : BrowserRouter;
  const routerProps = routerType === 'memory' ? { initialEntries } : {};

  return render(
    <Router {...routerProps}>
      <AuthContext.Provider value={authValue}>
        <ToastContext.Provider value={toastValue}>
          <SiteContext.Provider value={siteValue}>
            <CartContext.Provider value={cartValue}>
              {component}
            </CartContext.Provider>
          </SiteContext.Provider>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </Router>
  );
};

/**
 * Render with just Auth and Toast contexts (most common)
 */
export const renderWithAuth = (
  component,
  authValue = defaultContextValues.auth,
  toastValue = defaultContextValues.toast
) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <ToastContext.Provider value={toastValue}>
          {component}
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

/**
 * Mock fetch responses
 */
export const mockFetchSuccess = (data) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => data
    })
  );
};

export const mockFetchError = (status = 500, message = 'Server error') => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: async () => ({ error: message })
    })
  );
};

export const mockFetchNetworkError = () => {
  global.fetch = vi.fn(() =>
    Promise.reject(new Error('Network error'))
  );
};

/**
 * Mock localStorage
 */
export const createMockLocalStorage = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return { ...store };
    }
  };
};

/**
 * Mock window.location
 */
export const createMockLocation = (initialHref = 'https://example.com') => {
  return {
    href: initialHref,
    origin: 'https://example.com',
    pathname: '/',
    search: '',
    hash: '',
    reload: vi.fn(),
    replace: vi.fn()
  };
};

/**
 * Mock console methods (useful for suppressing expected errors)
 */
export const mockConsole = () => {
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  return {
    mock: () => {
      console.log = vi.fn();
      console.error = vi.fn();
      console.warn = vi.fn();
      console.info = vi.fn();
    },
    restore: () => {
      console.log = original.log;
      console.error = original.error;
      console.warn = original.warn;
      console.info = original.info;
    },
    original
  };
};

/**
 * Wait for async operations with timeout
 */
export const waitForAsync = (callback, timeout = 3000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    callback()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

/**
 * Create mock product data
 */
export const createMockProduct = (overrides = {}) => ({
  id: `product-${Date.now()}`,
  name: 'Test Product',
  description: 'Test description',
  price: 29.99,
  image: '/images/test.jpg',
  category: 'General',
  available: true,
  stock: 10,
  ...overrides
});

/**
 * Create mock order data
 */
export const createMockOrder = (overrides = {}) => ({
  id: `order-${Date.now()}`,
  userId: 'user-123',
  items: [
    {
      id: 'item-1',
      name: 'Test Product',
      price: 29.99,
      quantity: 2
    }
  ],
  total: 59.98,
  status: 'pending',
  createdAt: new Date().toISOString(),
  ...overrides
});

/**
 * Create mock template data
 */
export const createMockTemplate = (overrides = {}) => ({
  id: `template-${Date.now()}`,
  name: 'Test Template',
  category: 'General',
  tier: 'Starter',
  preview: '/images/preview.jpg',
  icon: '🎨',
  ...overrides
});

/**
 * Suppress console errors for specific test
 * Useful when testing error handling
 */
export const suppressConsoleError = (callback) => {
  const originalError = console.error;
  console.error = vi.fn();
  
  try {
    return callback();
  } finally {
    console.error = originalError;
  }
};

/**
 * Create a file mock for upload testing
 */
export const createMockFile = (
  name = 'test.jpg',
  type = 'image/jpeg',
  size = 1024
) => {
  const content = 'x'.repeat(size);
  return new File([content], name, { type });
};

/**
 * Mock Stripe object
 */
export const createMockStripe = () => ({
  redirectToCheckout: vi.fn().mockResolvedValue({}),
  createPaymentMethod: vi.fn().mockResolvedValue({
    paymentMethod: { id: 'pm_test123' }
  }),
  confirmPayment: vi.fn().mockResolvedValue({
    paymentIntent: { status: 'succeeded' }
  })
});

export default {
  mockUsers,
  mockSiteData,
  defaultContextValues,
  renderWithProviders,
  renderWithAuth,
  mockFetchSuccess,
  mockFetchError,
  mockFetchNetworkError,
  createMockLocalStorage,
  createMockLocation,
  mockConsole,
  waitForAsync,
  createMockProduct,
  createMockOrder,
  createMockTemplate,
  suppressConsoleError,
  createMockFile,
  createMockStripe
};

