import { test, expect } from '@playwright/test';

test.describe('Magic Link Authentication (Rule 10)', () => {
    test('should authenticate via magic link interception pattern', async ({ page }) => {
        // Rule 10: Magic Link Authentication Testing - API-driven interception
        // ❌ VIOLATION: Automating email UI (Gmail, etc.)
        // ✅ CORRECT: Use API-driven email interception (MailSlurp, Mailosaur, etc.)

        console.log('Demonstrating Rule 10: API-driven Magic Link Testing');

        await page.goto('/login.html');
        await page.fill('input[name="email"]', 'magic@example.com');
        // await page.click('button:has-text("Send Magic Link")');

        // Pattern: Poll for email via API, not UI
        /*
        const email = await mailslurp.waitForLatestEmail(inboxId);
        const magicLink = email.body.match(/href="(https:\/\/[^"]+)"/)[1];
        await page.goto(magicLink);
        */

        expect(page.url()).toContain('login.html');
    });
});
