import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

const PLACES_KEY_MESSAGE =
  'Set GOOGLE_PLACES_API_KEY to search Places. You can still add people by hand.';
const ADMIN_STATE = 'tests/e2e/.auth/admin.json';
const USER_STATE = 'tests/e2e/.auth/user.json';
const MANUAL_NAME = 'E2E Manual Candidate';

const QUEUED_CANDIDATE = {
  id: 'cand-e2e-seed',
  name: 'Queued Salon',
  address: '1 Main St',
  phone: '555-0100',
  niche: 'salon',
  score: 80,
  status: 'queued',
};

// Playwright config baseURL is :3000 (API). Local SPA is Vite on :5173.
test.use({ baseURL: 'http://localhost:5173' });

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(TEST_USERS.ADMIN.email);
  await page.getByTestId('login-password').fill(TEST_USERS.ADMIN.password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/(admin|dashboard)/, { timeout: 15000 });
  await page.evaluate(() => localStorage.setItem('hasVisitedDashboard', 'true'));
  const closeBtn = page.getByRole('button', { name: /Close dialog|I'll do this later/i });
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }
}

async function stubOutreachApis(page, posted) {
  await page.route(/\/api\/outreach\/search(?:\?|$)/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY is not set' }),
    });
  });

  await page.route(/\/api\/outreach\/candidates(?:\?|$)/, async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'POST') {
      const body = request.postDataJSON() || {};
      posted.value = body;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cand-e2e-manual',
          source: 'manual',
          status: 'queued',
          name: body.name,
        }),
      });
      return;
    }

    if (method === 'GET') {
      const candidates = posted.value?.name
        ? [
            {
              id: 'cand-e2e-manual',
              name: posted.value.name,
              address: posted.value.city || '',
              phone: '',
              niche: posted.value.niche || 'salon',
              score: 0,
              status: 'queued',
            },
          ]
        : [QUEUED_CANDIDATE];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Admin candidates — non-admin', () => {
  test.use({ storageState: USER_STATE });

  test('redirects away from /admin/candidates', async ({ page }) => {
    await page.goto('/admin/candidates');
    await page.waitForURL(
      (url) => /\/(dashboard|login)\/?$/.test(url.pathname),
      { timeout: 15000 }
    );

    const { pathname } = new URL(page.url());
    expect(pathname).toMatch(/^\/(dashboard|login)\/?$/);
    expect(pathname).not.toContain('/admin/candidates');
    await expect(page.getByRole('heading', { name: 'Finder' })).toHaveCount(0);
  });
});

test.describe('Admin candidates — admin happy path', () => {
  test.use({
    storageState: existsSync(ADMIN_STATE) ? ADMIN_STATE : { cookies: [], origins: [] },
  });

  test('Finder search shows Places-key message and manual add POSTs name', async ({ page }) => {
    const posted = { value: null };
    await stubOutreachApis(page, posted);

    await page.goto('/admin/candidates');
    const finder = page.getByRole('heading', { name: 'Finder' });
    const loginEmail = page.getByTestId('login-email');
    await expect(finder.or(loginEmail)).toBeVisible({ timeout: 15000 });
    if (!(await finder.isVisible().catch(() => false))) {
      await loginAsAdmin(page);
      await page.goto('/admin/candidates');
    }

    await expect(page).toHaveURL(/\/admin\/candidates/);
    await expect(finder).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Someone I found' })).toBeVisible();

    await page.locator('#finder-city').fill('Miami');
    await page.getByTestId('candidates-search').click();
    await expect(page.getByRole('status')).toHaveText(PLACES_KEY_MESSAGE);

    await page.locator('#manual-name').fill(MANUAL_NAME);
    await page.locator('#manual-city').fill('Miami');

    const postPromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        /\/api\/outreach\/candidates(?:\?|$)/.test(req.url())
    );
    await page.getByTestId('candidates-manual-submit').click();
    const postRequest = await postPromise;
    const body = postRequest.postDataJSON();

    expect(body).toEqual(expect.objectContaining({ name: MANUAL_NAME }));
    expect(posted.value?.name).toBe(MANUAL_NAME);
    await expect(page.getByTestId('candidates-queue')).toBeVisible();
  });
});
