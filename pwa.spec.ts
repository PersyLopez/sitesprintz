import { test, expect, Page } from '@playwright/test';

test.describe('PWA Functionality', () => {
    // Helper function to wait for the service worker to be active
    const expectSwActivated = async (page: Page) => {
        const swURL = await page.evaluate(async () => {
            const registration = await navigator.serviceWorker.ready;
            return registration.active?.scriptURL;
        });
        console.log(`Service Worker URL: ${swURL}`);
        expect(swURL).toBeTruthy();
    };

    test('should load offline from service worker cache', async ({ page }) => {
        // 1. Go to the page and wait for the service worker to activate
        await page.goto('/');
        await expectSwActivated(page);

        // 2. Go offline
        await page.context().setOffline(true);

        // 3. Reload the page
        try {
            await page.reload({ waitUntil: 'load' });
        } catch (error) {
            // In offline mode, a network error is expected on reload, but the page should still load from the SW.
            // We can ignore this specific error.
        }

        // 4. Assert that the page is still accessible (e.g., check for a title or a key element)
        await expect(page).toHaveTitle(/SiteSprintz/); // Adjust the title to match your app's title
    });
});