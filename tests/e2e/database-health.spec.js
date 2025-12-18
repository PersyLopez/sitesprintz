/**
 * E2E Tests: Database Health & Infrastructure
 * TDD RED Phase - Tests should fail initially
 */

import { test, expect } from '@playwright/test';
import { STRONG_PASSWORD, generateTestEmail } from '../fixtures/test-credentials.js';
import { URLS, TIMEOUTS, SELECTORS, API_PATTERNS } from '../fixtures/test-config.js';

const API_URL = URLS.API;

test.describe('Database Health', () => {

  test('should connect to database on startup', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.database).toBe('connected');
  });

  test('should verify users table exists', async ({ request }) => {
    const csrfRes = await request.get(`${API_URL}${API_PATTERNS.CSRF}`);
    const { csrfToken } = await csrfRes.json();

    const response = await request.post(`${API_URL}${API_PATTERNS.REGISTER}`, {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        email: generateTestEmail('dbtest'),
        password: STRONG_PASSWORD,
        confirmPassword: STRONG_PASSWORD
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
    const email = generateTestEmail('dash');
    await page.goto(`${URLS.BASE}/register`);
    await page.fill(SELECTORS.AUTH.EMAIL_INPUT, email);
    await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, STRONG_PASSWORD);
    await page.fill('#confirmPassword', STRONG_PASSWORD);
    await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);

    await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.LONG });

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

