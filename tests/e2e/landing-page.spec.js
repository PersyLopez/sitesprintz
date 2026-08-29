import { test, expect } from '@playwright/test';

test.describe('Landing page storytelling', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows the story-driven hero and primary CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /They love what you make/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Your Page Free/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Your Page Free/i }).first()).toHaveAttribute('href', '/register');
  });

  test('jump nav covers stories, templates, and gallery', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: /Page sections/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stories', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'How it works', exact: true })).toBeVisible();
    await expect(page.getByTestId('jump-nav-gallery')).toHaveAttribute('href', '/showcase');
  });

  test('customer stories use named businesses without workshop labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /They had regulars\. Tomorrow nobody could find them/i })).toBeVisible();
    await expect(page.getByText('Maria')).toBeVisible();
    await expect(page.getByText('James')).toBeVisible();
    await expect(page.getByText('Aisha')).toBeVisible();
    await expect(page.getByText('Normal', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Turning point', { exact: true })).toHaveCount(0);
    await expect(page.getByText('New Normal', { exact: true })).toHaveCount(0);
  });
});

test.describe('Showcase gallery after rewrite', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('loads the public gallery headline', async ({ page }) => {
    await page.goto('/showcase');
    await expect(page).toHaveTitle(/Showcase.*SiteSprintz|Gallery — See how your SiteSprintz/i);
    await expect(page.getByRole('heading', { name: /See how your site could look/i })).toBeVisible();
  });
});
