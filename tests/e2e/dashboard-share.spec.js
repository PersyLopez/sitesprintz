import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const USER_STATE = 'tests/e2e/.auth/user.json';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const STUB_USER = {
  id: 'user-share-e2e',
  email: TEST_USERS.PRO_USER.email,
  role: 'user',
  status: 'active',
  subscriptionStatus: 'active',
  subscriptionPlan: 'starter',
  name: 'Share Tester',
};

const PUBLISHED = {
  id: 'site-published',
  subdomain: 'share-demo',
  name: 'Published Share Site',
  businessName: 'Published Share Site',
  url: '/sites/share-demo/',
  status: 'published',
  plan: 'starter',
  template: 'salon',
  publishedAt: '2024-01-02T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
};

const DRAFT = {
  id: 'site-draft',
  subdomain: 'share-draft',
  name: 'Draft Share Site',
  businessName: 'Draft Share Site',
  url: '/sites/share-draft/',
  status: 'draft',
  plan: 'starter',
  template: 'salon',
  createdAt: '2024-01-01T00:00:00Z',
};

test.use({
  baseURL: 'http://localhost:5173',
  storageState: existsSync(USER_STATE) ? USER_STATE : { cookies: [], origins: [] },
});

async function stubShareDashboardApis(page) {
  await page.route(/\/api\/csrf-token(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'e2e-csrf' }),
    });
  });

  await page.route(/\/api\/auth\/me(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user: STUB_USER }),
    });
  });

  await page.route(/\/api\/auth\/login(?:\?|$)/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        accessToken: 'e2e-share-token',
        refreshToken: 'e2e-share-refresh',
        user: STUB_USER,
      }),
    });
  });

  await page.route(/\/api\/auth\/refresh(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        accessToken: 'e2e-share-token',
        refreshToken: 'e2e-share-refresh',
      }),
    });
  });

  await page.route(/\/api\/users\/[^/]+\/sites(?:\?|$)/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, sites: [PUBLISHED, DRAFT] }),
    });
  });

  await page.route(/\/api\/sites\/[^/?]+(?:\?|$)/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, site: PUBLISHED }),
    });
  });

  await page.route(/\/api\/share\//, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: PNG,
    });
  });

  await page.route(/\/api\/analytics\/conversion(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function loginIfNeeded(page) {
  await page.evaluate(() => localStorage.setItem('hasVisitedDashboard', 'true'));
  const loginEmail = page.getByTestId('login-email');
  const dashboard = page.getByTestId('dashboard-header');
  await expect(dashboard.or(loginEmail)).toBeVisible({ timeout: 15000 });
  if (await loginEmail.isVisible().catch(() => false)) {
    await loginEmail.fill(TEST_USERS.PRO_USER.email);
    await page.getByTestId('login-password').fill(TEST_USERS.PRO_USER.password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.evaluate(() => localStorage.setItem('hasVisitedDashboard', 'true'));
  }
  const closeBtn = page.getByRole('button', { name: /Close dialog|I'll do this later/i });
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }
  const dismiss = page.getByTestId('welcome-dismiss');
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

async function openDashboard(page) {
  await stubShareDashboardApis(page);
  await page.goto('/dashboard');
  await loginIfNeeded(page);
  if (!/\/dashboard/.test(new URL(page.url()).pathname)) {
    await page.goto('/dashboard');
  }
  await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 15000 });
}

test.describe('Dashboard share + QR', () => {
  test('published card Share opens modal with WhatsApp, IG, TikTok, and Download QR', async ({ page }) => {
    await openDashboard(page);

    const published = page.locator('[data-testid="site-card"][data-subdomain="share-demo"]');
    const draft = page.locator('[data-testid="site-card"][data-subdomain="share-draft"]');
    await expect(published).toBeVisible();
    await expect(draft).toBeVisible();

    await expect(published.getByTestId('share-site-button')).toBeEnabled();
    await expect(draft.getByTestId('share-site-button')).toBeDisabled();

    await published.getByTestId('share-site-button').click();
    await expect(page.getByRole('heading', { name: 'Share Your Site' })).toBeVisible();
    await expect(page.getByTestId('share-whatsapp')).toBeVisible();
    await expect(page.getByTestId('share-instagram')).toBeVisible();
    await expect(page.getByTestId('share-tiktok')).toBeVisible();
    await expect(page.getByTestId('share-download-qr')).toBeVisible();
  });

  test('site dashboard Share opens the same modal', async ({ page }) => {
    await openDashboard(page);
    await page.goto('/dashboard/sites/site-published');
    await expect(page.getByTestId('site-dashboard')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('site-dashboard-share')).toBeEnabled();
    await page.getByTestId('site-dashboard-share').click();
    await expect(page.getByRole('heading', { name: 'Share Your Site' })).toBeVisible();
    await expect(page.getByTestId('share-whatsapp')).toBeVisible();
    await expect(page.getByTestId('share-download-qr')).toBeVisible();
  });
});
