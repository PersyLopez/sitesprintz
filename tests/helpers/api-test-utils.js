import { vi } from 'vitest';

/**
 * Create a mock Express request object
 */
export const mockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    session: {},
    ...overrides
  };
};

/**
 * Create a mock Express response object
 */
export const mockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendFile: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    locals: {}
  };
  return res;
};

/**
 * Create a mock Express next function
 */
export const mockNext = () => vi.fn();

/**
 * Mock database query result
 */
export const mockDbQuery = (rows = [], fields = []) => {
  return Promise.resolve({ rows, fields });
};

/**
 * Mock database client
 */
export const mockDbClient = (queryResults = []) => {
  let queryIndex = 0;
  
  return {
    query: vi.fn(() => {
      const result = queryResults[queryIndex] || { rows: [], rowCount: 0 };
      queryIndex++;
      return Promise.resolve(result);
    }),
    connect: vi.fn(() => Promise.resolve()),
    end: vi.fn(() => Promise.resolve()),
    release: vi.fn()
  };
};

/**
 * Create mock authenticated user for middleware
 */
export const mockAuthUser = (overrides = {}) => {
  return {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user',
    ...overrides
  };
};

/**
 * Create mock JWT token
 */
export const createMockJWT = (payload = {}) => {
  const defaultPayload = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user',
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  const fullPayload = { ...defaultPayload, ...payload };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64');
  
  return `header.${encodedPayload}.signature`;
};

/**
 * Mock Stripe client
 */
export const mockStripe = () => {
  return {
    checkout: {
      sessions: {
        create: vi.fn(() => Promise.resolve({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test'
        })),
        retrieve: vi.fn(() => Promise.resolve({
          id: 'cs_test_123',
          payment_status: 'paid'
        }))
      }
    },
    webhooks: {
      constructEvent: vi.fn((body, sig, secret) => {
        return {
          id: 'evt_test_123',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              payment_status: 'paid',
              metadata: {}
            }
          }
        };
      })
    },
    products: {
      create: vi.fn(() => Promise.resolve({ id: 'prod_test_123' })),
      retrieve: vi.fn(() => Promise.resolve({ id: 'prod_test_123' })),
      update: vi.fn(() => Promise.resolve({ id: 'prod_test_123' })),
      delete: vi.fn(() => Promise.resolve({ id: 'prod_test_123', deleted: true }))
    },
    prices: {
      create: vi.fn(() => Promise.resolve({ id: 'price_test_123' }))
    }
  };
};

/**
 * Mock email service
 */
export const mockEmailService = () => {
  return {
    sendEmail: vi.fn(() => Promise.resolve({ success: true })),
    sendWelcomeEmail: vi.fn(() => Promise.resolve({ success: true })),
    sendResetPasswordEmail: vi.fn(() => Promise.resolve({ success: true })),
    sendOrderConfirmation: vi.fn(() => Promise.resolve({ success: true }))
  };
};

/**
 * Mock file upload (multer)
 */
export const mockFileUpload = (filename = 'test.jpg') => {
  return {
    fieldname: 'image',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    destination: '/tmp/uploads',
    filename: `${Date.now()}-${filename}`,
    path: `/tmp/uploads/${Date.now()}-${filename}`,
    size: 1024
  };
};

/**
 * Wait for async operations to complete
 */
export const flushPromises = () => {
  return new Promise(resolve => setImmediate(resolve));
};

/**
 * Mock bcrypt for password hashing
 */
export const mockBcrypt = () => {
  return {
    hash: vi.fn((password) => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn((password, hash) => 
      Promise.resolve(hash === `hashed_${password}`)
    )
  };
};

/**
 * Mock JWT utilities
 */
export const mockJWT = () => {
  return {
    sign: vi.fn((payload) => createMockJWT(payload)),
    verify: vi.fn((token) => {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token');
      return JSON.parse(Buffer.from(parts[1], 'base64').toString());
    }),
    decode: vi.fn((token) => {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(Buffer.from(parts[1], 'base64').toString());
    })
  };
};

/**
 * Create test database connection
 */
export const createTestDb = async () => {
  // This would connect to a test database
  // For now, returns a mock
  return mockDbClient();
};

/**
 * Seed test data
 */
export const seedTestData = async (db, data = {}) => {
  const {
    users = [],
    sites = [],
    products = [],
    orders = []
  } = data;
  
  // Mock seeding
  return {
    users,
    sites,
    products,
    orders
  };
};

/**
 * Clean test database
 */
export const cleanTestDb = async (db) => {
  // Mock cleanup
  return Promise.resolve();
};

/**
 * Generate random test data
 */
export const generateTestData = {
  email: () => `test${Date.now()}@example.com`,
  subdomain: () => `site${Date.now()}`,
  password: () => 'TestPassword123!',
  businessName: () => `Business ${Date.now()}`,
  productName: () => `Product ${Date.now()}`,
  uuid: () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};

