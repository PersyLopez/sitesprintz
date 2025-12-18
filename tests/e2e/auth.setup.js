import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
    // Use baseURL from config
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');

    // Fill login form using stable data-testid
    await page.fill('[data-testid="login-email"]', TEST_USERS.PRO_USER.email);
    await page.fill('[data-testid="login-password"]', TEST_USERS.PRO_USER.password);

    // Click submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard.html
    await page.waitForURL(/\/dashboard\.html/, { timeout: 15000 });

    // End of authentication
    await page.context().storageState({ path: authFile });
});
