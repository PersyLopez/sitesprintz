/**
 * API Mock Utilities
 * 
 * Reusable API mocking patterns for E2E tests.
 * Provides consistent mock responses for common API endpoints.
 */

import { API_PATTERNS } from './test-config.js';

/**
 * Mock response generators
 */
export const MOCK_RESPONSES = {
  // Auth responses
  successfulLogin: {
    success: true,
    accessToken: 'mock-jwt-token-' + Date.now(),
    user: {
      id: 'mock-user-id',
      email: 'test@example.com',
      role: 'user',
      plan: 'free'
    }
  },

  successfulRegister: {
    success: true,
    accessToken: 'mock-jwt-token-' + Date.now(),
    user: {
      id: 'mock-new-user-id',
      email: 'newuser@example.com',
      role: 'user',
      plan: 'free'
    }
  },

  authError: {
    success: false,
    error: 'Invalid credentials'
  },

  // Template responses
  templates: [
    { id: 'restaurant', name: 'Restaurant', tier: 'starter', category: 'food' },
    { id: 'salon', name: 'Salon & Spa', tier: 'starter', category: 'services' },
    { id: 'gym', name: 'Gym & Fitness', tier: 'starter', category: 'fitness' },
    { id: 'consultant', name: 'Consultant', tier: 'pro', category: 'professional' }
  ],

  // Site responses
  sites: [
    { id: 'site-1', subdomain: 'test-site-1', status: 'published', template: 'restaurant' },
    { id: 'site-2', subdomain: 'test-site-2', status: 'draft', template: 'salon' }
  ],

  // Booking responses
  services: [
    { id: 'service-1', name: 'Haircut', duration: 30, price: 25 },
    { id: 'service-2', name: 'Hair Color', duration: 90, price: 75 }
  ],

  appointments: [
    {
      id: 'appt-1',
      customerName: 'John Doe',
      email: 'john@example.com',
      serviceId: 'service-1',
      date: new Date().toISOString(),
      status: 'confirmed'
    }
  ],

  // Empty states
  emptyArray: [],
  emptyObject: {}
};

/**
 * Mock route handlers
 */
export async function mockAuthEndpoints(page, options = {}) {
  const { shouldFail = false } = options;

  // Mock CSRF token
  await page.route(`**${API_PATTERNS.CSRF}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'mock-csrf-token-' + Date.now() })
    });
  });

  // Mock login
  await page.route(`**${API_PATTERNS.LOGIN}`, async route => {
    if (shouldFail) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.authError)
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.successfulLogin)
      });
    }
  });

  // Mock register
  await page.route(`**${API_PATTERNS.REGISTER}`, async route => {
    if (shouldFail) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Email already exists' })
      });
    } else {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.successfulRegister)
      });
    }
  });
}

/**
 * Mock template endpoints
 */
export async function mockTemplateEndpoints(page, options = {}) {
  const { templates = MOCK_RESPONSES.templates, shouldFail = false } = options;

  await page.route(`**${API_PATTERNS.TEMPLATES}`, async route => {
    if (shouldFail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to fetch templates' })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(templates)
      });
    }
  });
}

/**
 * Mock site endpoints
 */
export async function mockSiteEndpoints(page, options = {}) {
  const { sites = MOCK_RESPONSES.sites, shouldFail = false } = options;

  await page.route(`**${API_PATTERNS.SITES}**`, async route => {
    const method = route.request().method();

    if (shouldFail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Site operation failed' })
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sites)
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          site: { id: 'new-site-id', subdomain: 'new-site', status: 'draft' }
        })
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock booking endpoints
 */
export async function mockBookingEndpoints(page, options = {}) {
  const {
    services = MOCK_RESPONSES.services,
    appointments = MOCK_RESPONSES.appointments,
    shouldFail = false
  } = options;

  await page.route(`**${API_PATTERNS.BOOKING}/**`, async route => {
    const url = route.request().url();

    if (shouldFail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Booking service unavailable' })
      });
      return;
    }

    if (url.includes('/services')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(services)
      });
    } else if (url.includes('/appointments')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(appointments)
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    }
  });
}

/**
 * Mock network failure for all API calls
 */
export async function mockNetworkFailure(page) {
  await page.route('**/api/**', route => route.abort('failed'));
}

/**
 * Mock network delay
 */
export async function mockNetworkDelay(page, delayMs = 2000) {
  await page.route('**/api/**', async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

/**
 * Clear all route mocks
 */
export async function clearAllMocks(page) {
  await page.unroute('**/api/**');
}

/**
 * Mock all common endpoints for isolation testing
 */
export async function mockAllEndpoints(page, options = {}) {
  await mockAuthEndpoints(page, options);
  await mockTemplateEndpoints(page, options);
  await mockSiteEndpoints(page, options);
  await mockBookingEndpoints(page, options);
}

export default {
  MOCK_RESPONSES,
  mockAuthEndpoints,
  mockTemplateEndpoints,
  mockSiteEndpoints,
  mockBookingEndpoints,
  mockNetworkFailure,
  mockNetworkDelay,
  clearAllMocks,
  mockAllEndpoints
};

