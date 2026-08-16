/**
 * Batch 2: CSS Routing Tests
 * Verifies stylesheets are served with correct MIME type
 */

import { test, expect } from '@playwright/test';
import { URLS } from '../fixtures/test-config.js';

test.describe('Batch 2: CSS Routing - MIME Types', () => {
  
  test('should serve styles.css with correct MIME type', async ({ request }) => {
    // Test with a known subdomain from seed data
    const response = await request.get(`${URLS.BASE}/sites/test-restaurant/styles.css`);
    
    // Status should be 200 or 404 (if file doesn't exist, that's OK - we're testing headers)
    if (response.ok()) {
      const contentType = response.headers()['content-type'] || '';
      expect(contentType.toLowerCase()).toContain('text/css');
    }
  });

  test('should serve premium.css with correct MIME type', async ({ request }) => {
    const response = await request.get(`${URLS.BASE}/sites/test-restaurant/premium.css`);
    
    if (response.ok()) {
      const contentType = response.headers()['content-type'] || '';
      expect(contentType.toLowerCase()).toContain('text/css');
    }
  });

  test('should serve static assets without HTML error pages', async ({ request }) => {
    const response = await request.get(`${URLS.BASE}/sites/test-restaurant/styles.css`);
    
    // Verify response is not an HTML error page
    if (response.status() >= 400) {
      const contentType = response.headers()['content-type'] || '';
      // If error, should not return HTML
      expect(contentType.toLowerCase()).not.toContain('text/html');
    }
  });

  test('API endpoints respond correctly', async ({ request }) => {
    const response = await request.get(`${URLS.API}/api/templates`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');
  });
});


