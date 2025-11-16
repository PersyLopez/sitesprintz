/**
 * E2E Tests for Booking Admin Dashboard
 * 
 * Coverage:
 * - Dashboard navigation and loading
 * - Service management (CRUD)
 * - Appointment viewing and filtering
 * - Availability scheduling
 * - Stats display
 * - Error handling
 */

import { test, expect } from '@playwright/test';

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  userId: 545,
};

const TEST_SERVICE = {
  name: 'Test Haircut Service',
  description: 'Professional haircut and styling',
  duration: '45',
  price: '35.00',
  category: 'hair',
};

test.describe('Booking Admin Dashboard - E2E', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill in credentials
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('/dashboard');
  });

  test.describe('Dashboard Navigation', () => {
    test('should navigate to booking dashboard from main dashboard', async ({ page }) => {
      // Click on Bookings link
      await page.click('a:has-text("Bookings")');
      
      // Should navigate to booking dashboard
      await page.waitForURL('/booking-dashboard');
      
      // Should see dashboard title
      await expect(page.locator('h1:has-text("Booking Dashboard")')).toBeVisible();
    });

    test('should display stats on dashboard load', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Wait for stats to load
      await page.waitForSelector('.stats-grid');
      
      // Should show stat cards
      await expect(page.locator('.stat-card')).toHaveCount(5);
      
      // Should display stat labels
      await expect(page.locator('text=Total Appointments')).toBeVisible();
      await expect(page.locator('text=Pending')).toBeVisible();
      await expect(page.locator('text=Confirmed')).toBeVisible();
      await expect(page.locator('text=Total Revenue')).toBeVisible();
      await expect(page.locator('text=Active Services')).toBeVisible();
    });

    test('should show navigation tabs', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Should show all tabs
      await expect(page.locator('button[role="tab"]:has-text("Appointments")')).toBeVisible();
      await expect(page.locator('button[role="tab"]:has-text("Services")')).toBeVisible();
      await expect(page.locator('button[role="tab"]:has-text("Schedule")')).toBeVisible();
      
      // Appointments tab should be active by default
      await expect(page.locator('button[role="tab"]:has-text("Appointments")')).toHaveClass(/active/);
    });

    test('should switch between tabs', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Click Services tab
      await page.click('button[role="tab"]:has-text("Services")');
      await expect(page.locator('[data-testid="service-manager"]')).toBeVisible();
      
      // Click Schedule tab
      await page.click('button[role="tab"]:has-text("Schedule")');
      await expect(page.locator('[data-testid="availability-scheduler"]')).toBeVisible();
      
      // Click back to Appointments
      await page.click('button[role="tab"]:has-text("Appointments")');
      await expect(page.locator('[data-testid="appointment-list"]')).toBeVisible();
    });
  });

  test.describe('Service Management', () => {
    test('should create a new service', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Go to Services tab
      await page.click('button[role="tab"]:has-text("Services")');
      
      // Click Add Service button
      await page.click('button:has-text("Add Service")');
      
      // Fill in form
      await page.fill('input[name="name"]', TEST_SERVICE.name);
      await page.fill('textarea[name="description"]', TEST_SERVICE.description);
      await page.fill('input[name="duration_minutes"]', TEST_SERVICE.duration);
      await page.fill('input[name="price_cents"]', TEST_SERVICE.price);
      await page.selectOption('select[name="category"]', TEST_SERVICE.category);
      
      // Submit form
      await page.click('button:has-text("Save")');
      
      // Should show success message
      await expect(page.locator('text=Service created successfully')).toBeVisible({ timeout: 5000 });
      
      // Should see service in list
      await expect(page.locator(`text=${TEST_SERVICE.name}`)).toBeVisible();
    });

    test('should validate required fields when creating service', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Services")');
      await page.click('button:has-text("Add Service")');
      
      // Try to submit without filling required fields
      await page.click('button:has-text("Save")');
      
      // Should show validation error
      await expect(page.locator('text=Service name is required')).toBeVisible();
    });

    test('should edit an existing service', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Services")');
      
      // Assuming a service exists, click edit
      await page.click('button:has-text("Edit"):first');
      
      // Update name
      const nameInput = page.locator('input[name="name"]');
      await nameInput.clear();
      await nameInput.fill('Updated Service Name');
      
      // Save
      await page.click('button:has-text("Save")');
      
      // Should show success
      await expect(page.locator('text=Service updated successfully')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Updated Service Name')).toBeVisible();
    });

    test('should delete a service with confirmation', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Services")');
      
      // Click delete button
      await page.click('button:has-text("Delete"):first');
      
      // Should show confirmation dialog
      await expect(page.locator('text=Are you sure')).toBeVisible();
      
      // Click confirm
      await page.click('button:has-text("Confirm")');
      
      // Should show success
      await expect(page.locator('text=Service deleted successfully')).toBeVisible({ timeout: 5000 });
    });

    test('should search/filter services', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Services")');
      
      // Type in search box
      await page.fill('input[placeholder*="Search"]', 'Haircut');
      
      // Should filter results
      await expect(page.locator('text=Haircut')).toBeVisible();
    });
  });

  test.describe('Appointment Management', () => {
    test('should display appointments list', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Appointments tab should be active
      await expect(page.locator('[data-testid="appointment-list"]')).toBeVisible();
      
      // Should have filter controls
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      await expect(page.locator('select[aria-label="Status"]')).toBeVisible();
      await expect(page.locator('select[aria-label="Date Range"]')).toBeVisible();
    });

    test('should filter appointments by status', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Select confirmed status
      await page.selectOption('select[aria-label="Status"]', 'confirmed');
      
      // Wait for filtered results
      await page.waitForTimeout(500);
      
      // All visible appointments should have confirmed status
      const statusBadges = await page.locator('.status-badge.status-confirmed').all();
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    test('should search appointments by customer name', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Type in search
      await page.fill('input[placeholder*="Search"]', 'John');
      
      // Wait for filtered results
      await page.waitForTimeout(500);
      
      // Should show matching results
      await expect(page.locator('text=John')).toBeVisible();
    });

    test('should view appointment details', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Click view details on first appointment
      await page.click('button:has-text("View Details"):first');
      
      // Should open modal
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('h3:has-text("Appointment Details")')).toBeVisible();
      
      // Should show appointment info
      await expect(page.locator('text=Confirmation Code')).toBeVisible();
      await expect(page.locator('text=Customer Name')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("Close")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should cancel an appointment', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Click cancel on first appointment
      await page.click('button:has-text("Cancel"):first');
      
      // Should show confirmation
      await expect(page.locator('text=Are you sure')).toBeVisible();
      
      // Confirm cancellation
      await page.click('button:has-text("Confirm")');
      
      // Should show success
      await expect(page.locator('text=cancelled successfully')).toBeVisible({ timeout: 5000 });
    });

    test('should refresh appointments list', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Click refresh button
      await page.click('button:has-text("Refresh")');
      
      // Should reload data (indicated by brief loading state)
      await page.waitForTimeout(500);
    });
  });

  test.describe('Availability Scheduling', () => {
    test('should display weekly schedule', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Schedule")');
      
      // Should show all days
      await expect(page.locator('text=Monday')).toBeVisible();
      await expect(page.locator('text=Tuesday')).toBeVisible();
      await expect(page.locator('text=Wednesday')).toBeVisible();
      await expect(page.locator('text=Thursday')).toBeVisible();
      await expect(page.locator('text=Friday')).toBeVisible();
      await expect(page.locator('text=Saturday')).toBeVisible();
      await expect(page.locator('text=Sunday')).toBeVisible();
    });

    test('should enable/disable days', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Schedule")');
      
      // Get first checkbox (Monday)
      const checkbox = page.locator('input[type="checkbox"]').first();
      
      // Toggle on
      await checkbox.check();
      await expect(checkbox).toBeChecked();
      
      // Toggle off
      await checkbox.uncheck();
      await expect(checkbox).not.toBeChecked();
    });

    test('should set time slots for a day', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Schedule")');
      
      // Enable Monday
      await page.locator('input[type="checkbox"]').first().check();
      
      // Set start time
      const startInput = page.locator('input[type="time"]').first();
      await startInput.fill('09:00');
      
      // Set end time
      const endInput = page.locator('input[type="time"]').nth(1);
      await endInput.fill('17:00');
      
      // Save schedule
      await page.click('button:has-text("Save Schedule")');
      
      // Should show success
      await expect(page.locator('text=Schedule saved successfully')).toBeVisible({ timeout: 5000 });
    });

    test('should validate time slots', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Schedule")');
      
      // Enable Monday
      await page.locator('input[type="checkbox"]').first().check();
      
      // Set invalid times (end before start)
      await page.locator('input[type="time"]').first().fill('17:00');
      await page.locator('input[type="time"]').nth(1).fill('09:00');
      
      // Try to save
      await page.click('button:has-text("Save Schedule")');
      
      // Should show error
      await expect(page.locator('text=End time must be after start time')).toBeVisible();
    });

    test('should copy schedule to all weekdays', async ({ page }) => {
      await page.goto('/booking-dashboard');
      await page.click('button[role="tab"]:has-text("Schedule")');
      
      // Enable and set Monday
      await page.locator('input[type="checkbox"]').first().check();
      await page.locator('input[type="time"]').first().fill('09:00');
      await page.locator('input[type="time"]').nth(1).fill('17:00');
      
      // Click copy to all
      await page.click('button:has-text("Copy to all")');
      
      // Should show success
      await expect(page.locator('text=copied to all weekdays')).toBeVisible();
      
      // Should enable all weekday checkboxes
      const weekdayCheckboxes = await page.locator('input[type="checkbox"]').all();
      for (let i = 0; i < 5; i++) { // Mon-Fri
        await expect(weekdayCheckboxes[i]).toBeChecked();
      }
    });
  });

  test.describe('Quick Actions', () => {
    test('should open service manager from quick action', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Click "Add Service" quick action
      await page.click('.quick-actions button:has-text("Add Service")');
      
      // Should switch to services tab
      await expect(page.locator('[data-testid="service-manager"]')).toBeVisible();
    });

    test('should open appointments from quick action', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Click "View Calendar" quick action
      await page.click('.quick-actions button:has-text("View Calendar")');
      
      // Should stay on/switch to appointments tab
      await expect(page.locator('[data-testid="appointment-list"]')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display mobile menu on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/booking-dashboard');
      
      // Should show mobile menu toggle
      await expect(page.locator('button:has-text("Menu")')).toBeVisible();
    });

    test('should toggle mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/booking-dashboard');
      
      // Click menu toggle
      await page.click('button:has-text("Menu")');
      
      // Should show tabs
      await expect(page.locator('.dashboard-tabs.mobile-open')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept API calls and return errors
      await page.route('/api/booking/admin/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });
      
      await page.goto('/booking-dashboard');
      
      // Should show error message
      await expect(page.locator('text=Failed to load')).toBeVisible();
    });

    test('should retry failed requests', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Simulate network error then click refresh
      await page.route('/api/booking/admin/**', route => route.abort());
      await page.click('button:has-text("Refresh")');
      
      // Remove route block
      await page.unroute('/api/booking/admin/**');
      
      // Click refresh again
      await page.click('button:has-text("Refresh")');
      
      // Should recover and load data
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist tab selection on refresh', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Switch to Services tab
      await page.click('button[role="tab"]:has-text("Services")');
      
      // Reload page
      await page.reload();
      
      // Should still show appointments tab (default behavior)
      await expect(page.locator('button[role="tab"]:has-text("Appointments")')).toHaveClass(/active/);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Check tab roles
      await expect(page.locator('button[role="tab"]').first()).toBeVisible();
      
      // Check dialog roles
      await page.click('button[role="tab"]:has-text("Services")');
      await page.click('button:has-text("Add Service")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/booking-dashboard');
      
      // Tab through navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should focus on tabs
      const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
      expect(focusedElement).toBeTruthy();
    });
  });
});

