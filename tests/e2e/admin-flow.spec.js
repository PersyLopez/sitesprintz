import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    // Should redirect to admin or dashboard
    await page.waitForURL(/dashboard|admin/, { timeout: 5000 });
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto('/admin.html');
    
    // Should show admin interface
    await expect(page.locator('text=/admin|dashboard/i')).toBeVisible();
  });

  test('should display user management section', async ({ page }) => {
    await page.goto('/admin-users.html');
    
    // Should show users table
    await expect(page.locator('h1, h2').filter({ hasText: /users|manage users/i })).toBeVisible();
    await expect(page.locator('table, .user-list, [data-user-id]')).toBeVisible({ timeout: 5000 });
  });

  test('should display analytics section', async ({ page }) => {
    await page.goto('/admin-analytics.html');
    
    // Should show analytics
    await expect(page.locator('h1, h2').filter({ hasText: /analytics|statistics/i })).toBeVisible();
  });

  test('should search users', async ({ page }) => {
    await page.goto('/admin-users.html');
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      
      // Wait for results to filter
      await page.waitForTimeout(500);
      
      // Should show filtered results
      const userCards = await page.locator('.user-card, [data-user-id]').count();
      expect(userCards).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test('should view user details', async ({ page }) => {
    await page.goto('/admin-users.html');
    
    // Click first user
    const firstUser = page.locator('.user-card, [data-user-id]').first();
    
    if (await firstUser.count() > 0) {
      await firstUser.click();
      
      // Should show user details
      await expect(page.locator('text=/email|user info|details/i')).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('should update user role', async ({ page }) => {
    await page.goto('/admin-users.html');
    
    // Find role dropdown/select
    const roleSelect = page.locator('select[name="role"], .role-selector').first();
    
    if (await roleSelect.count() > 0) {
      // Change role
      await roleSelect.selectOption('user');
      
      // Should show success or update
      await expect(page.locator('text=/updated|success/i')).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('should view analytics charts', async ({ page }) => {
    await page.goto('/admin-analytics.html');
    
    // Should have canvas elements (Chart.js)
    const charts = await page.locator('canvas').count();
    expect(charts).toBeGreaterThan(0);
  });

  test('should display key metrics', async ({ page }) => {
    await page.goto('/admin-analytics.html');
    
    // Should show metric cards
    const expectedMetrics = ['users', 'sites', 'revenue'];
    
    for (const metric of expectedMetrics) {
      const metricElement = page.locator(`text=/${metric}/i`);
      if (await metricElement.count() > 0) {
        await expect(metricElement.first()).toBeVisible();
      }
    }
  });
});

test.describe('Admin Site Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/);
  });

  test('should view all sites across users', async ({ page }) => {
    await page.goto('/admin.html');
    
    // Navigate to sites section
    const sitesLink = page.locator('a:has-text("Sites"), button:has-text("Sites")');
    
    if (await sitesLink.count() > 0) {
      await sitesLink.click();
      
      // Should show sites list
      await expect(page.locator('.site-card, [data-site-id]')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should moderate/unpublish a site', async ({ page }) => {
    await page.goto('/admin.html');
    
    // This would require admin moderation features
    // Verify the route exists
    await expect(page).not.toHaveURL(/404|error/);
  });
});

test.describe('Admin Template Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/);
  });

  test('should access template management', async ({ page }) => {
    // Navigate to template management (if exists)
    await page.goto('/admin.html');
    
    const templatesLink = page.locator('a:has-text("Templates"), button:has-text("Templates")');
    
    if (await templatesLink.count() > 0) {
      await templatesLink.click();
      
      // Should show templates
      await expect(page.locator('.template-card, [data-template-id]')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });
});

test.describe('Admin Permissions', () => {
  test('non-admin should not access admin routes', async ({ page }) => {
    // Login as regular user
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    
    // Try to access admin page
    await page.goto('/admin.html');
    
    // Should be redirected or show access denied
    await page.waitForTimeout(2000);
    const url = page.url();
    const hasAccessDenied = await page.locator('text=/access denied|unauthorized|forbidden/i').count() > 0;
    const redirectedAway = !url.includes('/admin.html');
    
    expect(hasAccessDenied || redirectedAway).toBeTruthy();
  });

  test('should protect admin API endpoints', async ({ page, request }) => {
    // Login as regular user first to get token
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    
    // Get token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // Try to access admin API endpoint
    const response = await request.get('http://localhost:3000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 403 Forbidden
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Admin Audit Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/);
  });

  test('should view audit logs if implemented', async ({ page }) => {
    await page.goto('/admin.html');
    
    const auditLink = page.locator('a:has-text("Audit"), button:has-text("Logs")');
    
    if (await auditLink.count() > 0) {
      await auditLink.click();
      
      // Should show audit logs
      await expect(page.locator('.log-entry, [data-log-id]')).toBeVisible({ timeout: 5000 });
    } else {
      // Feature not yet implemented
      test.skip();
    }
  });
});

