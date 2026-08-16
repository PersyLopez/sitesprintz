import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const adminAuthFile = 'tests/e2e/.auth/admin.json';

setup('authenticate admin', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill login form using data-testid
    await page.fill('[data-testid="login-email"]', TEST_USERS.ADMIN.email);
    await page.fill('[data-testid="login-password"]', TEST_USERS.ADMIN.password);

    // Click submit
    await page.click('[data-testid="login-submit"]');

    // Wait for redirect to admin or dashboard
    // Note: Admin might redirect to dashboard first then they navigate to /admin
    await page.waitForURL(/\/dashboard|\/admin/, { timeout: 15000 });

    // Dismiss welcome modal if it appears
    await page.evaluate(() => localStorage.setItem('hasVisitedDashboard', 'true'));
    const closeBtn = page.getByRole('button', { name: /Close dialog|I'll do this later/i });
    if (await closeBtn.isVisible()) {
        await closeBtn.click();
    }

    // Save authentication state
    await page.context().storageState({ path: adminAuthFile });
});
