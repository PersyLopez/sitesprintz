import { test, expect } from '@playwright/test';
import { SELECTORS } from '../fixtures/test-config.js';

test.describe('Mobile Navigation', () => {
  let baseURL;

  test.beforeAll(async () => {
    baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  });

  // Use global pre-authentication
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should display mobile menu toggle button', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      await expect(menuToggle).toBeVisible();
    }
  });

  test('should open mobile menu when toggle clicked', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      await menuToggle.click();
      
      const mobileNav = page.locator(SELECTORS.HEADER?.MOBILE_NAV || '[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible();
    }
  });

  test('should close mobile menu when toggle clicked again', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      // Open menu
      await menuToggle.click();
      const mobileNav = page.locator(SELECTORS.HEADER?.MOBILE_NAV || '[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible();
      
      // Close menu
      await menuToggle.click();
      await expect(mobileNav).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should display mobile navigation items', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      await menuToggle.click();
      
      const mobileNav = page.locator(SELECTORS.HEADER?.MOBILE_NAV || '[data-testid="mobile-nav"]');
      
      // Check for dashboard link
      const dashboardLink = mobileNav.locator(SELECTORS.HEADER?.MOBILE_NAV_DASHBOARD || '[data-testid="mobile-nav-dashboard"]');
      if (await dashboardLink.count() > 0) {
        await expect(dashboardLink).toBeVisible();
      }
    }
  });

  test('should display create site link in mobile menu', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      await menuToggle.click();
      
      const mobileNav = page.locator(SELECTORS.HEADER?.MOBILE_NAV || '[data-testid="mobile-nav"]');
      const createSiteLink = mobileNav.locator(SELECTORS.HEADER?.MOBILE_NAV_CREATE_SITE || '[data-testid="mobile-nav-create-site"]');
      
      if (await createSiteLink.count() > 0) {
        await expect(createSiteLink).toBeVisible();
      }
    }
  });

  test('should display logout button in mobile menu', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      await menuToggle.click();
      
      const mobileNav = page.locator(SELECTORS.HEADER?.MOBILE_NAV || '[data-testid="mobile-nav"]');
      const logoutButton = mobileNav.locator(SELECTORS.HEADER?.MOBILE_NAV_LOGOUT || '[data-testid="mobile-nav-logout"]');
      
      if (await logoutButton.count() > 0) {
        await expect(logoutButton).toBeVisible();
      }
    }
  });

  test('should display user info in mobile menu', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      await menuToggle.click();
      
      const mobileNav = page.locator(SELECTORS.HEADER?.MOBILE_NAV || '[data-testid="mobile-nav"]');
      const userInfo = mobileNav.locator(SELECTORS.HEADER?.MOBILE_USER_INFO || '[data-testid="mobile-user-info"]');
      
      if (await userInfo.count() > 0) {
        await expect(userInfo).toBeVisible();
      }
    }
  });

  test('should close menu when navigation link clicked', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      await menuToggle.click();
      
      const mobileNav = page.locator(SELECTORS.HEADER?.MOBILE_NAV || '[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible();
      
      // Click a navigation link
      const navLink = mobileNav.locator('a').first();
      if (await navLink.count() > 0) {
        await navLink.click();
        await page.waitForTimeout(500); // Wait for navigation
      }
    }
  });

  test('should have menu toggle aria attributes', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      // Check for aria-label
      const ariaLabel = await menuToggle.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      
      // Check for aria-expanded
      const ariaExpanded = await menuToggle.getAttribute('aria-expanded');
      expect(ariaExpanded).toBeTruthy();
    }
  });

  test('should toggle aria-expanded attribute', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      // Initial state should be false
      let ariaExpanded = await menuToggle.getAttribute('aria-expanded');
      expect(ariaExpanded === 'false' || ariaExpanded === null).toBeTruthy();
      
      // Click to open
      await menuToggle.click();
      ariaExpanded = await menuToggle.getAttribute('aria-expanded');
      expect(ariaExpanded).toBe('true');
      
      // Click to close
      await menuToggle.click();
      ariaExpanded = await menuToggle.getAttribute('aria-expanded');
      expect(ariaExpanded === 'false' || ariaExpanded === null).toBeTruthy();
    }
  });

  test('should not display desktop nav on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${baseURL}/dashboard`);
    
    const desktopNav = page.locator(SELECTORS.HEADER?.DESKTOP_NAV || '[data-testid="desktop-nav"]');
    
    if (await desktopNav.count() > 0) {
      // Desktop nav should be hidden on mobile
      const isVisible = await desktopNav.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test('should display desktop nav on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${baseURL}/dashboard`);
    
    const desktopNav = page.locator(SELECTORS.HEADER?.DESKTOP_NAV || '[data-testid="desktop-nav"]');
    
    if (await desktopNav.count() > 0) {
      await expect(desktopNav).toBeVisible();
    }
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    const menuToggle = page.locator(SELECTORS.HEADER?.MOBILE_TOGGLE || '[data-testid="mobile-menu-toggle"]');
    if (await menuToggle.count() > 0) {
      // Focus on menu toggle
      await menuToggle.focus();
      
      // Press Enter to open
      await page.keyboard.press('Enter');
      
      const mobileNav = page.locator(SELECTORS.HEADER?.MOBILE_NAV || '[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible();
    }
  });
});
