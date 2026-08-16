/**
 * Test Utilities - Shared helper functions for E2E tests
 * 
 * Provides:
 * - Retry logic for flaky API calls
 * - Wait utilities with proper error handling
 * - Network request helpers
 */

import { TIMEOUTS, API_PATTERNS } from './test-config.js';

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.initialDelay=500] - Initial delay in ms
 * @param {number} [options.maxDelay=5000] - Maximum delay in ms
 * @param {string} [options.operationName='operation'] - Name for logging
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} If all retries fail
 */
export async function retryWithBackoff(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 5000,
    operationName = 'operation'
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`${operationName} failed (attempt ${attempt}/${maxRetries}): ${error.message}`);

      if (attempt < maxRetries) {
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  throw new Error(`${operationName} failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for an element to be visible with better error messaging
 * @param {Page} page - Playwright page
 * @param {string} selector - Element selector
 * @param {object} options - Wait options
 * @returns {Promise<Locator>} The visible element
 * @throws {Error} With helpful context if element not found
 */
export async function waitForElement(page, selector, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, state = 'visible' } = options;
  
  try {
    const element = page.locator(selector);
    await element.waitFor({ state, timeout });
    return element;
  } catch (error) {
    const currentUrl = page.url();
    throw new Error(
      `Element "${selector}" not ${state} within ${timeout}ms on page ${currentUrl}. ` +
      `Original error: ${error.message}`
    );
  }
}

/**
 * Wait for network to be idle with timeout
 * @param {Page} page - Playwright page
 * @param {number} [timeout] - Timeout in ms
 */
export async function waitForNetworkIdle(page, timeout = TIMEOUTS.LONG) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    console.log(`Network didn't become idle within ${timeout}ms - continuing anyway`);
  }
}

/**
 * Make an API request with CSRF token handling
 * @param {APIRequestContext} request - Playwright request context
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {object} [data] - Request body
 * @returns {Promise<{response: APIResponse, csrfToken: string}>}
 */
export async function apiRequestWithCsrf(request, method, endpoint, data = null) {
  // Get CSRF token first
  const csrfResponse = await request.get(API_PATTERNS.CSRF);
  if (!csrfResponse.ok()) {
    throw new Error(`Failed to get CSRF token: ${csrfResponse.status()}`);
  }
  const { csrfToken } = await csrfResponse.json();

  // Make the actual request
  const options = {
    headers: { 'X-CSRF-Token': csrfToken }
  };
  
  if (data) {
    options.data = data;
  }

  let response;
  if (method.toUpperCase() === 'GET') {
    response = await request.get(endpoint, options);
  } else if (method.toUpperCase() === 'POST') {
    response = await request.post(endpoint, options);
  } else if (method.toUpperCase() === 'PUT') {
    response = await request.put(endpoint, options);
  } else if (method.toUpperCase() === 'DELETE') {
    response = await request.delete(endpoint, options);
  } else {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }

  return { response, csrfToken };
}

/**
 * Assert API response is successful and return JSON body
 * @param {APIResponse} response - API response
 * @param {string} [context='API call'] - Context for error message
 * @returns {Promise<object>} Parsed JSON body
 * @throws {Error} If response is not successful
 */
export async function assertApiSuccess(response, context = 'API call') {
  if (!response.ok()) {
    const body = await response.text().catch(() => 'Could not read body');
    throw new Error(
      `${context} failed with status ${response.status()}: ${body}`
    );
  }
  return response.json();
}

/**
 * Generate a unique subdomain for testing
 * @param {string} [prefix='test'] - Prefix for subdomain
 * @returns {string} Unique subdomain
 */
export function generateSubdomain(prefix = 'test') {
  return `${prefix}${Date.now()}`.toLowerCase();
}

/**
 * Dismiss welcome modal if present
 * @param {Page} page - Playwright page
 */
export async function dismissWelcomeModalIfPresent(page) {
  const modal = page.locator('.welcome-modal .btn-primary, [data-testid="welcome-modal-close"]');
  if (await modal.count() > 0 && await modal.isVisible().catch(() => false)) {
    await modal.click();
    await sleep(300); // Brief wait for modal animation
  }
}

export default {
  retryWithBackoff,
  sleep,
  waitForElement,
  waitForNetworkIdle,
  apiRequestWithCsrf,
  assertApiSuccess,
  generateSubdomain,
  dismissWelcomeModalIfPresent
};




