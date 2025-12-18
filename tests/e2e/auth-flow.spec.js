import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
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
    await page.fill('#email', 'valid@example.com');
    await page.fill('#password', '123');
    await page.fill('#confirmPassword', '123');

    await page.click('button[type="submit"]');

    // Check for password length error
    const passwordError = page.locator('#passwordError');
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toHaveText(/at least 6 characters/i);
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/register.html');

    const email = `newuser-${Date.now()}@example.com`;
    await page.fill('#email', email);
    await page.fill('#password', 'StrictPwd!2024');
    await page.fill('#confirmPassword', 'StrictPwd!2024');

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard\.html/, { timeout: 10000 });
  });

  test('should fail registration with existing email', async ({ page }) => {
    await page.goto('/register.html');

    // Use seeded user
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'StrictPwd!2024');
    await page.fill('#confirmPassword', 'StrictPwd!2024');

    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/register')),
      page.click('button[type="submit"]')
    ]);

    expect(response.status()).toBe(409); // Conflict

    // Check for error message
    const emailError = page.locator('#emailError');
    await expect(emailError).toBeVisible();
    await expect(emailError).toHaveText(/already exists/i);
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login.html');

    // Use seeded user
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123'); // Seeded password

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard(\.html)?/);
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login.html');

    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'WrongPass123!');

    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login')),
      page.click('button[type="submit"]')
    ]);

    console.log('Login failure status:', response.status());
    // If rate limited, might be 429

    // Should show error
    const passwordError = page.locator('#passwordError');
    // Wait for it to become visible with longer timeout if needed?
    await expect(passwordError).toBeVisible({ timeout: 10000 });
    await expect(passwordError).toHaveText(/invalid|incorrect|connection/i);
  });
});
