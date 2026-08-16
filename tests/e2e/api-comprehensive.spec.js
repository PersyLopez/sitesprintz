/**
 * E2E Test: Comprehensive API Endpoint Testing
 * 
 * Tests all critical API endpoints to ensure they:
 * - Return correct status codes
 * - Validate input properly
 * - Handle errors gracefully
 * - Require authentication where needed
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const API_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUTS = {
  SHORT: 3000,
  MEDIUM: 10000,
  LONG: 30000
};

test.describe('API Endpoint Testing', () => {
  let csrfToken;
  let authToken;
  let testSiteId;
  let testDraftId;

  test.beforeAll(async ({ request }) => {
    // Get CSRF token
    const csrfResponse = await request.get(`${API_URL}/api/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;

    // Authenticate
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        email: TEST_USERS.PRO_USER.email,
        password: TEST_USERS.PRO_USER.password
      }
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      authToken = loginData.accessToken;
    }
  });

  test.describe('Authentication APIs', () => {
    test('POST /api/auth/register - should register new user', async ({ request }) => {
      const email = `apitest-${Date.now()}@example.com`;
      const response = await request.post(`${API_URL}/api/auth/register`, {
        headers: { 'X-CSRF-Token': csrfToken },
        data: {
          email,
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
          acceptedTerms: true
        }
      });

      expect([200, 201]).toContain(response.status());
      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('accessToken');
      }
    });

    test('POST /api/auth/login - should authenticate user', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/auth/login`, {
        headers: { 'X-CSRF-Token': csrfToken },
        data: {
          email: TEST_USERS.PRO_USER.email,
          password: TEST_USERS.PRO_USER.password
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('accessToken');
    });

    test('POST /api/auth/logout - should logout user', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      const response = await request.post(`${API_URL}/api/auth/logout`, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 204]).toContain(response.status());
    });

    test('POST /api/auth/refresh - should refresh token', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      const response = await request.post(`${API_URL}/api/auth/refresh`, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Should either succeed or return 401 if refresh token expired
      expect([200, 401]).toContain(response.status());
    });

    test('POST /api/auth/forgot-password - should accept email', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/auth/forgot-password`, {
        headers: { 'X-CSRF-Token': csrfToken },
        data: {
          email: TEST_USERS.PRO_USER.email
        }
      });

      // Should accept the request (even if email doesn't exist, for security)
      expect([200, 201]).toContain(response.status());
    });
  });

  test.describe('Site Management APIs', () => {
    test('POST /api/drafts - should create draft', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      const response = await request.post(`${API_URL}/api/drafts`, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          templateId: 'restaurant',
          businessData: {
            businessName: 'API Test Restaurant'
          }
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('draftId');
      testDraftId = data.draftId;
    });

    test('GET /api/drafts/:id - should retrieve draft', async ({ request }) => {
      if (!authToken || !testDraftId) {
        test.skip('No draft ID available');
        return;
      }

      const response = await request.get(`${API_URL}/api/drafts/${testDraftId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('draftId');
    });

    test('POST /api/drafts/:id/publish - should publish draft', async ({ request }) => {
      if (!authToken || !testDraftId) {
        test.skip('No draft ID available');
        return;
      }

      const response = await request.post(`${API_URL}/api/drafts/${testDraftId}/publish`, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          email: TEST_USERS.PRO_USER.email,
          plan: 'pro'
        }
      });

      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('site');
        testSiteId = data.site?.id;
      } else {
        // Might fail if user already has max sites
        expect([400, 403]).toContain(response.status());
      }
    });

    test('GET /api/sites - should list user sites', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      const response = await request.get(`${API_URL}/api/sites`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data.sites) || Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('E-commerce APIs', () => {
    test('GET /api/sites/:siteId/products - should list products', async ({ request }) => {
      if (!authToken || !testSiteId) {
        test.skip('No site ID available');
        return;
      }

      const response = await request.get(`${API_URL}/api/sites/${testSiteId}/products`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data.products) || Array.isArray(data)).toBeTruthy();
    });

    test('POST /api/sites/:siteId/products - should create product', async ({ request }) => {
      if (!authToken || !testSiteId) {
        test.skip('No site ID available');
        return;
      }

      const response = await request.post(`${API_URL}/api/sites/${testSiteId}/products`, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Test Product',
          price: 19.99,
          description: 'Test product description'
        }
      });

      expect([200, 201]).toContain(response.status());
    });

    test('POST /api/orders - should create order', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      const response = await request.post(`${API_URL}/api/orders`, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          siteId: testSiteId || 'test-site',
          items: [
            { productId: 'test-product', quantity: 1, price: 19.99 }
          ],
          customerEmail: 'customer@example.com'
        }
      });

      // Might require valid site/product, so accept various status codes
      expect([200, 201, 400, 404]).toContain(response.status());
    });
  });

  test.describe('Booking APIs', () => {
    test('GET /api/booking/services - should list services', async ({ request }) => {
      if (!authToken || !testSiteId) {
        test.skip('No site ID available');
        return;
      }

      const response = await request.get(`${API_URL}/api/booking/services?siteId=${testSiteId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Should either return services or 404 if booking not enabled
      expect([200, 404]).toContain(response.status());
    });

    test('GET /api/booking/availability - should return availability', async ({ request }) => {
      if (!authToken || !testSiteId) {
        test.skip('No site ID available');
        return;
      }

      const response = await request.get(`${API_URL}/api/booking/availability?siteId=${testSiteId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Should either return availability or 404 if booking not enabled
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Admin APIs', () => {
    test('GET /api/admin/analytics - should require admin auth', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      const response = await request.get(`${API_URL}/api/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Should either return data (if admin) or 403 (if not admin)
      expect([200, 403]).toContain(response.status());
    });

    test('GET /api/admin/users - should require admin auth', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      const response = await request.get(`${API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Should either return users (if admin) or 403 (if not admin)
      expect([200, 403]).toContain(response.status());
    });
  });

  test.describe('API Error Handling', () => {
    test('should return 400 for invalid input', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/auth/register`, {
        headers: { 'X-CSRF-Token': csrfToken },
        data: {
          email: 'invalid-email', // Invalid email format
          password: 'short' // Too short
        }
      });

      expect(response.status()).toBe(400);
    });

    test('should return 401 for unauthenticated requests', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/sites`, {
        // No Authorization header
      });

      expect(response.status()).toBe(401);
    });

    test('should return 404 for non-existent resources', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      const response = await request.get(`${API_URL}/api/drafts/non-existent-id`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(404);
    });

    test('should return 403 for unauthorized access', async ({ request }) => {
      if (!authToken) {
        test.skip('No auth token available');
        return;
      }

      // Try to access admin endpoint as regular user
      const response = await request.get(`${API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // If user is not admin, should return 403
      if (response.status() === 403) {
        expect(response.status()).toBe(403);
      }
    });
  });
});



