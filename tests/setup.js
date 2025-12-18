import { expect, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock Prisma for integration tests (only in node environment)
if (typeof window === 'undefined') {
  vi.mock('../database/db.js', async () => {
    try {
      const { createMockPrisma, resetPrismaMocks, seedPrismaData } = await import('./mocks/prisma.js');
      const mockPrisma = createMockPrisma();
      
      return {
        prisma: mockPrisma,
        resetPrismaMocks,
        seedPrismaData
      };
    } catch (e) {
      // Fallback if mock not available
      return {
        prisma: {
          users: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
          sites: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
          $queryRaw: vi.fn(),
          $executeRaw: vi.fn(),
          $transaction: vi.fn()
        }
      };
    }
  });
}

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  
  // Reset Prisma mocks if available (only in node environment)
  if (typeof window === 'undefined') {
    try {
      import('./mocks/prisma.js').then(({ resetPrismaMocks }) => {
        resetPrismaMocks();
      }).catch(() => {
        // Ignore if module not available
      });
    } catch (e) {
      // Ignore if module not available
    }
  }
});

// Setup test environment once before all tests
beforeAll(() => {
  // Mock environment variables
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.VITE_API_URL = 'http://localhost:3000';
  process.env.RESEND_API_KEY = 're_test_12345678';
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'user';
  process.env.SMTP_PASS = 'pass';

  // Only mock window-related objects if window exists (jsdom environment)
  if (typeof window !== 'undefined') {
    // Mock window.matchMedia
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
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock IntersectionObserver
    global.IntersectionObserver = class IntersectionObserver {
      constructor() { }
      disconnect() { }
      observe() { }
      takeRecords() {
        return [];
      }
      unobserve() { }
    };

    // Mock scrollTo
    window.scrollTo = vi.fn();

    // Mock scrollIntoView for all elements
    Element.prototype.scrollIntoView = vi.fn();

    // Mock localStorage
    const localStorageMock = (() => {
      let store = {};
      return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
          store[key] = value.toString();
        },
        removeItem: (key) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        }
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  }

  // Mock fetch for all tests (browser and node)
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
    headers: {
      get: (key) => (key === 'content-type' ? 'application/json' : null)
    }
  }));

  // Suppress console errors in tests (optional - can be useful for cleaner output)
  // vi.spyOn(console, 'error').mockImplementation(() => {});
  // vi.spyOn(console, 'warn').mockImplementation(() => {});
});
