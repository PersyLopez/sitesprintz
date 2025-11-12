import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display homepage with login button', async ({ page }) => {
    await expect(page).toHaveTitle(/SiteSprintz|Home/i);
    const loginButton = page.getByRole('link', { name: /login|sign in/i });
    await expect(loginButton).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.click('text=Register');
    await expect(page).toHaveURL(/register/);
    await expect(page.getByRole('heading', { name: /register|sign up/i })).toBeVisible();
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    await page.goto('/register.html');
    
    // Submit with empty fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=/email.*required/i')).toBeVisible({ timeout: 3000 });
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/register.html');
    
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or show success
    await page.waitForURL(/dashboard|success/, { timeout: 5000 });
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login.html');
    
    // Use test credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login.html');
    
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid.*credentials|error/i')).toBeVisible({ timeout: 3000 });
  });
});

