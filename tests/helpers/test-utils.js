import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';

/**
 * Render a component with Router context
 */
export const renderWithRouter = (component, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return {
    ...render(<BrowserRouter>{component}</BrowserRouter>)
  };
};

/**
 * Render a component with Auth context
 */
export const renderWithAuth = (
  component,
  authValue = {
    isAuthenticated: true,
    loading: false,
    user: { id: '1', email: 'test@example.com', role: 'user' }
  }
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      {component}
    </AuthContext.Provider>
  );
};

/**
 * Render a component with both Router and Auth context
 */
export const renderWithAuthAndRouter = (
  component,
  {
    route = '/',
    authValue = {
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com', role: 'user' }
    }
  } = {}
) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

/**
 * Create a mock user object
 */
export const createMockUser = (overrides = {}) => {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  };
};

/**
 * Create a mock site object
 */
export const createMockSite = (overrides = {}) => {
  return {
    id: 'site-1',
    businessName: 'Test Business',
    subdomain: 'testbusiness',
    template: 'restaurant-casual',
    status: 'draft',
    plan: 'starter',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    userId: 'user-1',
    content: {
      hero: {
        heading: 'Welcome',
        subheading: 'To our business'
      }
    },
    ...overrides
  };
};

/**
 * Create a mock product object
 */
export const createMockProduct = (overrides = {}) => {
  return {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test product description',
    price: 29.99,
    inventory: 100,
    image: 'https://example.com/product.jpg',
    siteId: 'site-1',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  };
};

/**
 * Create a mock order object
 */
export const createMockOrder = (overrides = {}) => {
  return {
    id: 'order-1',
    siteId: 'site-1',
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    status: 'pending',
    total: 99.99,
    items: [
      {
        productId: 'product-1',
        name: 'Test Product',
        quantity: 2,
        price: 49.99
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  };
};

/**
 * Mock localStorage
 */
export const mockLocalStorage = () => {
  const storage = {};
  
  return {
    getItem: vi.fn((key) => storage[key] || null),
    setItem: vi.fn((key, value) => {
      storage[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    })
  };
};

/**
 * Mock fetch for API calls
 */
export const mockFetch = (response = {}, status = 200) => {
  return vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response))
    })
  );
};

/**
 * Wait for element to be removed (useful for loading states)
 */
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved } = await import('@testing-library/react');
  const spinner = document.querySelector('.loading-spinner, [data-testid="loading"]');
  if (spinner) {
    await waitForElementToBeRemoved(spinner);
  }
};

/**
 * Fill form inputs by label
 */
export const fillForm = async (fields) => {
  const { screen } = await import('@testing-library/react');
  const userEvent = (await import('@testing-library/user-event')).default;
  const user = userEvent.setup();

  for (const [label, value] of Object.entries(fields)) {
    const input = screen.getByLabelText(new RegExp(label, 'i'));
    await user.clear(input);
    await user.type(input, value);
  }
};

/**
 * Create mock auth token
 */
export const createMockToken = (payload = {}) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(
    JSON.stringify({
      id: 'user-1',
      email: 'test@example.com',
      role: 'user',
      exp: Date.now() / 1000 + 3600,
      ...payload
    })
  );
  const signature = btoa('mock-signature');
  return `${header}.${body}.${signature}`;
};

/**
 * Setup common test environment
 */
export const setupTestEnvironment = () => {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage(),
    writable: true
  });

  // Mock window.matchMedia (for responsive tests)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  };

  // Mock scrollTo
  window.scrollTo = vi.fn();
};

/**
 * Clean up after tests
 */
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks();
  localStorage.clear();
};

