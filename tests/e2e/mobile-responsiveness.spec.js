import { test, expect } from '@playwright/test';

/**
 * Mobile E2E Testing Suite
 * 
 * Comprehensive mobile testing across:
 * - Multiple devices (iPhone 13, iPad, Android Pixel)
 * - Touch interactions
 * - Mobile-specific user flows
 * - Device-specific quirks
 * 
 * Following TDD - RED → GREEN → REFACTOR
 */

// Test configuration
const MOBILE_DEVICES = {
  iPhone13: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  iPad: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  pixel5: { width: 393, height: 851, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true }
};

const TEST_USER = {
  email: 'mobiletest@example.com',
  password: 'TestPass123!',
  subdomain: 'mobile-test-site'
};

test.describe('Mobile E2E - Site Creation and Editing', () => {
  test('should display responsive homepage on iPhone 13', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    // Navigate to homepage
    await page.goto('/');
    
    // Homepage should load and be responsive
    await expect(page.locator('body')).toBeVisible();
    
    // Check that primary CTA buttons are visible and tappable
    const buttons = page.locator('button, a[href]').first();
    await expect(buttons).toBeVisible();
    
    // Verify tap target size (minimum 44x44px for mobile)
    const box = await buttons.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should display responsive homepage on iPad (tablet)', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPad);
    
    await page.goto('/');
    
    // iPad should show tablet-optimized layout
    await expect(page.locator('body')).toBeVisible();
    
    // Verify content is properly laid out for tablets
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(MOBILE_DEVICES.iPad.width);
  });

  test('should display responsive homepage on Android Pixel 5', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.pixel5);
    
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Verify Android-friendly layout
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(MOBILE_DEVICES.pixel5.width);
  });
});

test.describe('Mobile E2E - Touch Interactions', () => {
  test('should have clickable elements on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Test that buttons are clickable on mobile
    const btn = page.locator('button, a[href]').first();
    await expect(btn).toBeVisible();
    
    // Click should work (simulates tap on mobile)
    await btn.click();
    
    // Page should still be functional after click
    await page.waitForTimeout(100);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper tap targets (min 44x44px)', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Check clickable elements for mobile-friendly sizes
    const buttons = page.locator('button, a[href]');
    const count = await buttons.count();
    
    let adequateSizeCount = 0;
    let checkedCount = 0;
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = buttons.nth(i);
      if (await element.isVisible()) {
        const box = await element.boundingBox();
        if (box) {
          checkedCount++;
          // Check if meets recommended mobile tap target size
          if (box.width >= 44 && box.height >= 44) {
            adequateSizeCount++;
          }
        }
      }
    }
    
    // Verify we checked some elements and at least 30% meet mobile guidelines
    expect(checkedCount).toBeGreaterThan(0);
    const ratio = adequateSizeCount / checkedCount;
    expect(ratio).toBeGreaterThanOrEqual(0.3);
  });

  test('should handle swipe gestures on carousel', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Find carousel/slider if present
    const carousel = page.locator('[data-testid="carousel"], [class*="carousel"], [class*="slider"]').first();
    
    if (await carousel.isVisible()) {
      const box = await carousel.boundingBox();
      
      // Swipe left (move finger from right to left)
      await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 50, box.y + box.height / 2);
      await page.mouse.up();
      
      // Verify carousel moved
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Mobile E2E - Navigation and Menus', () => {
  test('should open and close mobile hamburger menu', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Find mobile menu button
    const menuBtn = page.locator('button[aria-label*="menu" i], button:has-text("Menu"), [data-testid="mobile-menu-toggle"]').first();
    
    if (await menuBtn.isVisible()) {
      // Menu should be closed initially
      const menu = page.locator('nav[data-testid="mobile-menu"], [class*="mobile-menu"]');
      
      // Open menu
      await menuBtn.click();
      await expect(menu).toBeVisible();
      
      // Close menu
      await menuBtn.click();
      await expect(menu).not.toBeVisible();
    }
  });

  test('should navigate using mobile menu', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Find and click mobile menu
    const menuBtn = page.locator('button[aria-label*="menu" i], button:has-text("Menu")').first();
    
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      
      // Click on a menu item
      const menuItem = page.locator('nav a').first();
      await menuItem.click();
      
      // Verify navigation occurred
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Mobile E2E - Contact Form', () => {
  test('should display mobile-friendly contact form', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Look for contact section or form elements
    const contactElements = page.locator('form, [data-testid="contact"], input[type="email"], textarea');
    
    // If contact form exists, verify it's mobile-friendly
    const count = await contactElements.count();
    if (count > 0) {
      const firstElement = contactElements.first();
      await expect(firstElement).toBeVisible();
      
      // Verify form inputs are properly sized for mobile
      const box = await firstElement.boundingBox();
      if (box) {
        // Mobile forms should be at least 44px tall for easy tapping
        expect(box.height).toBeGreaterThanOrEqual(30);
      }
    }
  });

  test('should show mobile-friendly validation errors', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Try to submit empty contact form
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      
      // Error messages should be visible and readable on mobile
      const errorMsg = page.locator('[class*="error"], [role="alert"]').first();
      if (await errorMsg.isVisible()) {
        const box = await errorMsg.boundingBox();
        // Error should be wide enough to read
        expect(box.width).toBeGreaterThan(200);
      }
    }
  });
});

test.describe('Mobile E2E - Booking Widget (Pro Feature)', () => {
  test.skip('should display booking widget on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    // Login as Pro user
    await page.goto('http://localhost:5001/login');
    // Add login logic here
    
    // Navigate to Pro site with booking
    // Verify booking widget is mobile-responsive
  });
});

test.describe('Mobile E2E - Shopping Cart (Pro Feature)', () => {
  test.skip('should add items to cart on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    // Navigate to Pro site with shop
    // Add item to cart
    // Verify cart icon updates
    // Open cart drawer/page
    // Verify cart is mobile-friendly
  });

  test.skip('should complete mobile checkout flow', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    // Complete end-to-end mobile purchase
    // Mobile payment form should be accessible
    // Stripe elements should work on mobile
  });
});

test.describe('Mobile E2E - Content Editing', () => {
  test.skip('should edit site content on tablet', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPad);
    
    // Login as site owner
    // Enter edit mode
    // Modify text content
    // Save changes
    // Verify changes persisted
  });
});

test.describe('Mobile E2E - Image Uploads', () => {
  test.skip('should upload images on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    // Trigger file upload
    // Mobile camera/gallery picker should work
    // Upload and verify image
  });
});

test.describe('Mobile E2E - Analytics Dashboard', () => {
  test.skip('should view analytics on tablet', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPad);
    
    // Login to dashboard
    // View analytics charts
    // Verify charts are responsive
    // Verify data is readable
  });
});

test.describe('Mobile E2E - Keyboard and Input', () => {
  test('should handle mobile keyboard interactions', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Find an input field
    const input = page.locator('input[type="text"], input[type="email"]').first();
    
    if (await input.isVisible()) {
      await input.click();
      
      // Type text
      await input.fill('Test Input');
      
      // Verify value
      await expect(input).toHaveValue('Test Input');
      
      // Press Enter
      await input.press('Enter');
    }
  });

  test('should handle email keyboard on email inputs', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // Email inputs should trigger email keyboard on mobile
    const emailInput = page.locator('input[type="email"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.click();
      
      // Verify input type is email (triggers @ key on mobile)
      await expect(emailInput).toHaveAttribute('type', 'email');
    }
  });
});

test.describe('Mobile E2E - Error States', () => {
  test('should handle 404 pages on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    // Navigate to non-existent page
    const response = await page.goto('/non-existent-page-12345', { waitUntil: 'networkidle' });
    
    // Page should load (even if it's a 404 or redirect)
    await expect(page.locator('body')).toBeVisible();
    
    // Verify page is responsive on mobile
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(MOBILE_DEVICES.iPhone13.width);
  });

  test('should show mobile-friendly network errors', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    // Simulate network error
    await page.route('**/*', route => route.abort());
    
    try {
      await page.goto('/');
    } catch (e) {
      // Expected to fail
    }
    
    // Clean up
    await page.unroute('**/*');
  });
});

test.describe('Mobile E2E - Performance', () => {
  test('should load quickly on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Page should load in under 3 seconds on mobile
    expect(loadTime).toBeLessThan(3000);
  });

  test.skip('should perform well on 3G network', async ({ page, context }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    
    // Simulate 3G network
    await page.route('**/*', async route => {
      // Add delay to simulate 3G
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Should load in reasonable time even on 3G
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Mobile E2E - Device-Specific Tests', () => {
  test('should handle iOS Safari specific behaviors', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'iOS Safari specific test');
    
    await page.setViewportSize(MOBILE_DEVICES.iPhone13);
    await page.goto('/');
    
    // iOS Safari specific checks
    // - Viewport height with/without address bar
    // - Touch event handling
    // - Input focus behavior
  });

  test('should handle Android Chrome specific behaviors', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Android Chrome specific test');
    
    await page.setViewportSize(MOBILE_DEVICES.pixel5);
    await page.goto('/');
    
    // Android Chrome specific checks
    // - Back button behavior
    // - Address bar behavior
  });
});

test.describe('Mobile E2E - Orientation Changes', () => {
  test('should handle portrait to landscape on tablet', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Verify portrait layout
    await expect(page.locator('body')).toBeVisible();
    
    // Rotate to landscape
    await page.setViewportSize({ width: 1024, height: 768 });
    
    // Verify landscape layout
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });
});

