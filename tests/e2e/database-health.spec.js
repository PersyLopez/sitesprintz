/**
 * E2E Tests: Database Health & Infrastructure
 * TDD RED Phase - Tests should fail initially
 */

import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3000';

test.describe('Database Health', () => {
  
  test('should connect to database on startup', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.database).toBe('connected');
  });

  test('should verify users table exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: `dbtest${Date.now()}@example.com`,
        password: 'Test123!@#'
      }
    });
    
    // Should not error with "table doesn't exist"
    expect([200, 201, 409]).toContain(response.status());
  });

  test('should verify sites table exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/templates`);
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Dashboard API Coverage', () => {
  
  test('dashboard should not have 404 API errors', async ({ page }) => {
    // Register and login
    const email = `dash${Date.now()}@example.com`;
    await page.goto('http://localhost:3000/register');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.fill('input[name="confirmPassword"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Monitor 404s
    const failed404s = [];
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('/api/')) {
        failed404s.push(response.url());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Should not have 404 errors
    expect(failed404s).toHaveLength(0);
  });
});

