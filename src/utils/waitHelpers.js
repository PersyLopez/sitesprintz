// src/utils/waitHelpers.js
// Helper functions to make Playwright tests more reliable

/**
 * Wait for an element to become visible.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector CSS selector or test id
 * @param {number} timeout Optional timeout in ms (default 15000)
 */
export async function waitForVisible(page, selector, timeout = 15000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Wait for an element to become enabled (not disabled).
 * Useful for buttons that become enabled after async loading.
 */
export async function waitForEnabled(page, selector, timeout = 15000) {
    await page.waitForFunction(
        (sel) => {
            const el = document.querySelector(sel);
            return el && !el.disabled;
        },
        selector,
        { timeout }
    );
}

/**
 * Dismiss the welcome modal if it appears.
 * The modal overlay has class 'modal-overlay' and a close button.
 */
export async function dismissWelcomeModal(page) {
    const overlay = await page.$('.modal-overlay');
    if (overlay) {
        // Try clicking the close button first
        const closeBtn = await overlay.$('button.close-btn');
        if (closeBtn) {
            await closeBtn.click();
        } else {
            // Fallback: click anywhere on overlay
            await overlay.click();
        }
        // Ensure overlay is gone
        await page.waitForSelector('.modal-overlay', { state: 'detached', timeout: 5000 }).catch(() => { });
    }
}
