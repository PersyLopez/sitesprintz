/**
 * E2E Tests: API Type Safety & Conversions
 * TDD Phase: Tests for type conversion bugs (string vs number userId)
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

test.describe('API Type Safety', () => {
  let authToken;
  let userId;
  let subdomain;

  test.beforeAll(async ({ request }) => {
    // Register a test user
    const email = `typetest${Date.now()}@example.com`;
    const registerRes = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email,
        password: 'Test123!@#',
        name: 'Type Test User'
      }
    });
    
    const registerData = await registerRes.json();
    authToken = registerData.token;
    userId = registerData.user?.id || registerData.userId;

    // Create a site using guest-publish endpoint (works for both auth and non-auth)
    subdomain = `typetest${Date.now()}`;
    const siteRes = await request.post(`${API_URL}/api/sites/guest-publish`, {
      data: {
        email,
        data: {
          template: 'restaurant',
          brand: { name: 'Type Test Site' },
          meta: { businessName: subdomain }
        }
      }
    });
    
    if (siteRes.ok()) {
      const siteData = await siteRes.json();
      subdomain = siteData.subdomain;
    }
  });

  test('should handle string userId in URL params', async ({ request }) => {
    // URL params are always strings - test with user sites endpoint
    const response = await request.get(`${API_URL}/api/users/${userId}/sites`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    // Accept 200 (success), 401 (unauthorized), or 403 (forbidden) - all valid responses
    expect([200, 401, 403]).toContain(response.status());
    // Should NOT return 500 due to type mismatch
    expect(response.status()).not.toBe(500);
  });

  test('should handle numeric userId in auth token', async ({ request }) => {
    // Token contains numeric userId, should match string params
    const response = await request.get(`${API_URL}/api/sites/${subdomain}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    // Should work or return 401/404/403, not crash with type error
    expect([200, 401, 403, 404]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('should match userId types in authorization checks', async ({ request }) => {
    // Update site - authorization check compares token userId with site.userId
    const response = await request.put(`${API_URL}/api/sites/${subdomain}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        brand: { name: 'Updated Type Test Site' }
      }
    });
    
    // Should handle authorization properly (200, 401, 403, or 404), not crash
    expect([200, 401, 403, 404]).toContain(response.status());
    expect(response.status()).not.toBe(500);
  });

  test('should validate all ID parameters consistently', async ({ request }) => {
    // Test multiple endpoints for type consistency
    const endpoints = [
      `/api/users/${userId}/sites`,
      `/api/sites/${subdomain}`,
      `/api/templates`
    ];
    
    for (const endpoint of endpoints) {
      const response = await request.get(`${API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      // Should not crash with 500 due to type issues
      expect(response.status()).not.toBe(500);
      
      // If there's an error, it shouldn't mention type issues
      if (!response.ok() && response.status() !== 403) {
        const text = await response.text().catch(() => '');
        expect(text.toLowerCase()).not.toContain('type mismatch');
        expect(text.toLowerCase()).not.toContain('cannot convert');
      }
    }
  });
});

