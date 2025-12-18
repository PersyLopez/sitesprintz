/**
 * Test Fixtures - Barrel Export
 * 
 * Single import point for all test fixtures and utilities.
 * 
 * Usage:
 *   import { TEST_USERS, STRONG_PASSWORD, URLS, TIMEOUTS, retryWithBackoff } from '../fixtures';
 */

// Credentials
export { 
  TEST_USERS, 
  STRONG_PASSWORD, 
  generateTestEmail, 
  getTestUser 
} from './test-credentials.js';

// Configuration
export { 
  URLS, 
  TIMEOUTS, 
  SELECTORS, 
  API_PATTERNS, 
  TEST_DATA 
} from './test-config.js';

// Utilities
export { 
  retryWithBackoff, 
  sleep, 
  waitForElement, 
  waitForNetworkIdle,
  apiRequestWithCsrf,
  assertApiSuccess,
  generateSubdomain,
  dismissWelcomeModalIfPresent
} from './test-utils.js';

// API Mocks
export {
  MOCK_RESPONSES,
  mockAuthEndpoints,
  mockTemplateEndpoints,
  mockSiteEndpoints,
  mockBookingEndpoints,
  mockNetworkFailure,
  mockNetworkDelay,
  clearAllMocks,
  mockAllEndpoints
} from './api-mocks.js';

