import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const authFile = 'tests/e2e/.auth/user.json';

test('authenticate and save state', async ({ page }) => {
    // Use baseURL from config
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill login form using stable data-testid
    await page.fill('[data-testid="login-email"]', TEST_USERS.PRO_USER.email);
    await page.fill('[data-testid="login-password"]', TEST_USERS.PRO_USER.password);

    // Click submit
    await page.click('[data-testid="login-submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Dismiss welcome modal if it appears
    await page.evaluate(() => localStorage.setItem('hasVisitedDashboard', 'true'));

    // Save state
    await page.context().storageState({ path: authFile });
    console.log('Saved auth state to ' + authFile);
});
