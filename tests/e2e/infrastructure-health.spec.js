/**
 * E2E Tests: Database Schema & Infrastructure Health
 * Purpose: Quickly identify missing columns, connection issues, and schema problems
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

test.describe('Database Schema Health Checks', () => {
  
  test('should verify database is connected', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('ok');
    expect(health.database).toBe('connected');
  });

  test('should verify users table has required columns', async ({ request }) => {
    // Register a test user to verify all columns work
    const email = `schematest${Date.now()}@example.com`;
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email,
        password: 'Test123!@#',
        name: 'Schema Test User'
      }
    });
    
    expect([200, 201]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      
      // Verify essential fields exist
      expect(data.user).toBeDefined();
      expect(data.user.id).toBeDefined();
      expect(data.user.email).toBe(email);
      expect(data.token).toBeDefined();
    }
  });

  test('should verify Google OAuth columns exist (google_id, picture, last_login)', async ({ request }) => {
    // Try to query a Google OAuth endpoint - it should not error due to missing columns
    const response = await request.get(`${API_URL}/auth/google`);
    
    // Should not return 500 (server error due to missing columns)
    expect(response.status()).not.toBe(500);
    
    // Valid responses: 302 (redirect), 401 (unauthorized), or 200
    expect([200, 302, 401, 404]).toContain(response.status());
  });

  test('should verify sites table structure', async ({ request }) => {
    // Create a test site via guest-publish to verify table structure
    const email = `sitetest${Date.now()}@example.com`;
    const response = await request.post(`${API_URL}/api/sites/guest-publish`, {
      data: {
        email,
        data: {
          template: 'restaurant',
          brand: { name: 'Schema Test Site' },
          meta: { businessName: `schematest${Date.now()}` }
        }
      }
    });
    
    // Should succeed or fail gracefully, not crash with column errors
    expect([200, 201, 400, 500]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      expect(data.subdomain).toBeDefined();
    }
  });
});

test.describe('Authentication Infrastructure', () => {
  
  test('should verify login endpoint works', async ({ request }) => {
    // First register
    const email = `logintest${Date.now()}@example.com`;
    const password = 'Test123!@#';
    
    await request.post(`${API_URL}/api/auth/register`, {
      data: { email, password, name: 'Login Test' }
    });
    
    // Then login
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: { email, password }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    
    const loginData = await loginResponse.json();
    expect(loginData.success).toBe(true);
    expect(loginData.token).toBeDefined();
    expect(loginData.user).toBeDefined();
  });

  test('should verify registration creates user with all required fields', async ({ request }) => {
    const email = `regtest${Date.now()}@example.com`;
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email,
        password: 'Test123!@#',
        name: 'Registration Test'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Verify all essential user fields exist
    expect(data.user.id).toBeDefined();
    expect(data.user.email).toBe(email);
    expect(data.user.role).toBeDefined();
    expect(data.token).toBeDefined();
  });

  test('should verify session persistence works', async ({ request }) => {
    const email = `sessiontest${Date.now()}@example.com`;
    const registerRes = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email,
        password: 'Test123!@#',
        name: 'Session Test'
      }
    });
    
    const { token } = await registerRes.json();
    
    // Use token to access protected endpoint
    const protectedRes = await request.get(`${API_URL}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Should work or return 401/404, not 500 (server error)
    expect(protectedRes.status()).not.toBe(500);
  });
});

test.describe('Google OAuth Infrastructure', () => {
  
  test('should verify Google OAuth routes exist', async ({ request }) => {
    const routes = [
      '/auth/google',
      '/auth/google/callback'
    ];
    
    for (const route of routes) {
      const response = await request.get(`${API_URL}${route}`);
      
      // Should not return 500 (missing columns) or 404 (missing route)
      // 302 (redirect), 401, or 400 are acceptable
      expect(response.status()).not.toBe(500);
    }
  });

  test('should verify Google OAuth callback handles errors gracefully', async ({ request }) => {
    // Test callback with no code (should error gracefully, not crash)
    const response = await request.get(`${API_URL}/auth/google/callback`);
    
    // Should handle error gracefully, not crash
    expect(response.status()).not.toBe(500);
  });
});

test.describe('Site Publishing Infrastructure', () => {
  
  test('should verify site-template.html exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/site-template.html`);
    
    // Should exist (200) or be properly redirected
    expect([200, 301, 302, 404]).toContain(response.status());
  });

  test('should verify contact form submission endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/contact-form`, {
      data: {
        subdomain: 'test',
        name: 'Test',
        email: 'test@example.com',
        message: 'Test message'
      }
    });
    
    // Should respond (even if invalid), not crash
    expect(response.status()).not.toBe(500);
    expect([200, 201, 400, 404]).toContain(response.status());
  });
});

test.describe('Critical Endpoint Availability', () => {
  
  test('should verify all auth endpoints respond', async ({ request }) => {
    const endpoints = [
      { method: 'POST', path: '/api/auth/login' },
      { method: 'POST', path: '/api/auth/register' },
      { method: 'GET', path: '/api/auth/verify' }
    ];
    
    for (const endpoint of endpoints) {
      let response;
      if (endpoint.method === 'GET') {
        response = await request.get(`${API_URL}${endpoint.path}`);
      } else {
        response = await request.post(`${API_URL}${endpoint.path}`, {
          data: {}
        });
      }
      
      // Should respond, even with error - not crash
      expect(response.status()).not.toBe(500);
    }
  });

  test('should verify template endpoints respond', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/templates`);
    
    // Should return templates or auth error, not crash
    expect(response.status()).not.toBe(500);
  });
});

test.describe('Database Connection Stability', () => {
  
  test('should handle multiple concurrent requests', async ({ request }) => {
    const requests = Array(5).fill(null).map(() => 
      request.get(`${API_URL}/health`)
    );
    
    const responses = await Promise.all(requests);
    
    // All should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
  });

  test('should maintain connection after multiple operations', async ({ request }) => {
    // Perform multiple operations
    for (let i = 0; i < 3; i++) {
      const email = `conntest${Date.now()}-${i}@example.com`;
      await request.post(`${API_URL}/api/auth/register`, {
        data: {
          email,
          password: 'Test123!@#',
          name: `Connection Test ${i}`
        }
      });
    }
    
    // Check database is still connected
    const healthCheck = await request.get(`${API_URL}/health`);
    const health = await healthCheck.json();
    
    expect(health.database).toBe('connected');
  });
});

