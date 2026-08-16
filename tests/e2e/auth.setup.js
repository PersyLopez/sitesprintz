import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
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
    const closeBtn = page.getByRole('button', { name: /Close dialog|I'll do this later/i });
    if (await closeBtn.isVisible()) {
        await closeBtn.click();
    }

    // End of authentication
    await page.context().storageState({ path: authFile });
});
