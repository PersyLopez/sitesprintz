/**
 * Node.js Test Setup
 * For backend/server-side tests that don't need DOM
 */

import { expect, afterEach, beforeAll, vi } from 'vitest';

// Cleanup after each test case
afterEach(() => {
  vi.clearAllMocks();
});

// Setup test environment once before all tests
beforeAll(() => {
  // Mock environment variables for tests
  process.env.JWT_SECRET = 'test-secret-key-for-jwt';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.CSRF_SECRET = 'test-csrf-secret';
  process.env.LOG_LEVEL = 'error'; // Quiet logs during tests
});

export { expect, vi };


