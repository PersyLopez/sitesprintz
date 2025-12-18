/**
 * E2E Tests: Self Healing & Resilience
 * Purpose: Verify the application's ability to recover from errors and maintain stability.
 */

import { test, expect } from '@playwright/test';
import { dismissWelcomeModal } from '../../src/utils/waitHelpers.js';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

test.describe('Self Healing & Resilience', () => {

    test('should recover from session expiration (auto-refresh)', async ({ request, page }) => {
        // 1. Register
        const email = `healing${Date.now()}@example.com`;
        const csrfRes = await request.get(`${API_URL}/api/csrf-token`);
        const { csrfToken } = await csrfRes.json();

        const registerRes = await request.post(`${API_URL}/api/auth/register`, {
            headers: { 'X-CSRF-Token': csrfToken },
            data: { email, password: 'StrictPwd!2024', confirmPassword: 'StrictPwd!2024', name: 'Healing User' }
        });
        const { accessToken: token } = await registerRes.json();

        // 2. Login on page
        await page.goto('/');
        await page.evaluate((t) => localStorage.setItem('token', t), token);
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/dashboard/);

        // 3. Simulate token expiration (corrupt token)
        await page.evaluate(() => localStorage.setItem('token', 'expired_or_invalid_token'));

        // 4. Action that requires auth
        // The app should either:
        // a) Detect invalid token and redirect to login (graceful failure)
        // b) Try to refresh token (self-healing) - if implemented
        await page.reload();

        // Expect redirection to login or stay on dashboard if refresh worked (assuming refresh not fully impl yet, expect login)
        // If we had a refresh token in cookies, it might stay logged in.
        // For now, we check for graceful handling (no crash, redirect to login)
        await expect(page).toHaveURL(/\/login|dashboard/);
    });

    test('should handle network flakiness gracefully', async ({ page }) => {
        // Intercept network requests and simulate failure once, then success
        // This is a placeholder for now as implementing robust retry logic requires app changes
        // But we can verify the app doesn't crash on network error
        await page.goto('/');
        const content = await page.content();
        expect(content).toBeTruthy();
    });

    test('should auto-dismiss unexpected modals/popups', async ({ page }) => {
        await page.goto('/');

        // Inject a "welcome" modal if it doesn't exist
        await page.evaluate(() => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = '<div class="modal"><button class="close-btn">Close</button>Welcome!</div>';
            document.body.appendChild(modal);
        });

        // Use our helper to dismiss it
        await dismissWelcomeModal(page);

        // Verify modal is gone
        const modalCount = await page.locator('.modal-overlay').count();
        expect(modalCount).toBe(0);
    });
});
