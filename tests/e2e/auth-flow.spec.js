import { test, expect } from '@playwright/test';
import { TEST_USERS, STRONG_PASSWORD } from '../fixtures/test-credentials.js';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-config.js';

test.describe('User Authentication Flow', () => {
  // Ensure we start with a clean state for auth tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // Listen for consoles and errors
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
    page.on('requestfailed', request => {
      console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText || 'No error text'}`);
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`RESPONSE ERROR: ${response.url()} - ${response.status()}`);
      }
    });

    await page.goto('/');
  });

  test('should display homepage with login button', async ({ page }) => {
    await expect(page).toHaveTitle(/SiteSprintz|Home/i);
    // Homepage uses a link to login.html
    const loginButton = page.locator('a[href="/login"], a[href="/login.html"], a[href="login.html"]').first();
    await expect(loginButton).toBeVisible();
  });

  test('should navigate to registration page from login', async ({ page }) => {
    // Navigate via Login page directly
    await page.goto('/login.html');

    // Click "Create one" or "Register" on login page
    await page.click('a[href*="register"]');
    await page.waitForURL(/\/register(\.html)?/);
    await expect(page.getByRole('heading', { name: 'Get Started' })).toBeVisible();
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    await page.goto('/register.html');

    // Remove minlength attribute to test JS validation
    await page.evaluate(() => {
      document.getElementById('password').removeAttribute('minlength');
    });

    // Fill valid email but short password
    await page.fill('[data-testid="register-email"]', 'valid@example.com');
    await page.fill('[data-testid="register-password"]', '123');
    await page.fill('[data-testid="register-confirm-password"]', '123');
    await page.check('[data-testid="register-accept-terms"]');

    await page.click('[data-testid="register-submit"]');

    // Check for password length error
    const passwordError = page.locator('[data-testid="register-password-error"]');
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toHaveText(/at least 6 characters/i);
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/register.html');

    const email = `newuser-${Date.now()}@example.com`;
    await page.fill('[data-testid="register-email"]', email);
    await page.fill('[data-testid="register-password"]', STRONG_PASSWORD);
    await page.fill('[data-testid="register-confirm-password"]', STRONG_PASSWORD);
    await page.check('[data-testid="register-accept-terms"]');

    await page.click('[data-testid="register-submit"]');

    // Should redirect to dashboard (React route or legacy)
    await page.waitForURL(/\/dashboard(\.html)?/, { timeout: TIMEOUTS.LONG });
  });

  test('should fail registration with existing email', async ({ page }) => {
    await page.goto('/register.html');

    // Use seeded user (PRO_USER)
    await page.fill('[data-testid="register-email"]', TEST_USERS.PRO_USER.email);
    await page.fill('[data-testid="register-password"]', STRONG_PASSWORD);
    await page.fill('[data-testid="register-confirm-password"]', STRONG_PASSWORD);
    await page.check('[data-testid="register-accept-terms"]');

    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/register')),
      page.click('[data-testid="register-submit"]')
    ]);

    expect(response.status()).toBe(409); // Conflict

    // Check for error message
    const emailError = page.locator('[data-testid="register-email-error"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toHaveText(/already exists/i);
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login.html');

    // Use seeded PRO_USER
    await page.fill('[data-testid="login-email"]', TEST_USERS.PRO_USER.email);
    await page.fill('[data-testid="login-password"]', TEST_USERS.PRO_USER.password);

    await page.click('[data-testid="login-submit"]');

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard(\.html)?/, { timeout: TIMEOUTS.LONG });
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login.html');

    await page.fill('[data-testid="login-email"]', TEST_USERS.PRO_USER.email);
    await page.fill('[data-testid="login-password"]', 'WrongPass123!');

    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login')),
      page.click('[data-testid="login-submit"]')
    ]);

    console.log('Login failure status:', response.status());
    // If rate limited, might be 429

    // Should show error
    const passwordError = page.locator('[data-testid="login-password-error"]');
    await expect(passwordError).toBeVisible({ timeout: TIMEOUTS.LONG });
    await expect(passwordError).toHaveText(/invalid|incorrect|connection/i);
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login.html');
    await page.fill('[data-testid="login-email"]', TEST_USERS.PRO_USER.email);
    await page.fill('[data-testid="login-password"]', TEST_USERS.PRO_USER.password);
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/dashboard(\.html)?/, { timeout: TIMEOUTS.LONG });

    // Verify we're logged in
    await expect(page).toHaveURL(/dashboard/);

    // Close welcome modal if it appears (first-time users)
    // Wait for potential modal to appear
    await page.waitForTimeout(1000);
    
    // Try multiple strategies to close the modal
    const modalCloseBtn = page.locator('[data-testid="modal-close-btn"]').first();
    const welcomeDismiss = page.locator('[data-testid="welcome-dismiss"]').first();
    const laterBtn = page.locator('.modal-overlay button:has-text("later")').first();
    
    try {
      // Strategy 1: Click the "I'll do this later" button
      if (await welcomeDismiss.isVisible({ timeout: 1000 })) {
        await welcomeDismiss.click();
        await page.waitForTimeout(500);
      }
      // Strategy 2: Click the modal close (X) button
      else if (await modalCloseBtn.isVisible({ timeout: 1000 })) {
        await modalCloseBtn.click();
        await page.waitForTimeout(500);
      }
      // Strategy 3: Click any "later" button in modal
      else if (await laterBtn.isVisible({ timeout: 1000 })) {
        await laterBtn.click();
        await page.waitForTimeout(500);
      }
      // Strategy 4: Press Escape to close modal
      else {
        const modalOverlay = page.locator('.modal-overlay');
        if (await modalOverlay.isVisible({ timeout: 500 })) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    } catch (e) {
      // If all else fails, try pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    await expect(logoutButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await logoutButton.click();

    // Should be redirected to login or home page
    await page.waitForURL(/login|\/$/i, { timeout: TIMEOUTS.MEDIUM });
    expect(page.url()).toMatch(/login|\//);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Ensure we have no auth token
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to access dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Should redirect to login or home (unauth users can't access dashboard)
    const url = page.url();
    expect(url).toMatch(/login|auth|\/$/i);
  });

  test('should redirect to login when auth token is expired', async ({ page }) => {
    // Login first
    await page.goto('/login.html');
    await page.fill('[data-testid="login-email"]', TEST_USERS.PRO_USER.email);
    await page.fill('[data-testid="login-password"]', TEST_USERS.PRO_USER.password);
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.LONG });

    // Simulate expired token by clearing auth
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      sessionStorage.clear();
    });

    // Try to access dashboard again
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Should redirect away from dashboard
    await page.waitForTimeout(2000); // Give page time to react
    const url = page.url();
    expect(url).not.toMatch(/dashboard/);
  });
});
