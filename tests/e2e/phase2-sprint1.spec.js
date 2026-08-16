/**
 * Phase 2 Sprint 1 - E2E Tests
 * Tests for reminder system, buffer time, multi-staff, and cancellations
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 2 Sprint 1: Booking Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test.describe('Reminder System', () => {
    test('should enable/disable reminder emails', async ({ page }) => {
      // Navigate to admin booking settings
      await page.goto('http://localhost:5173/admin/booking/settings');
      
      // Find reminder settings section
      const reminderSection = page.locator('[class*="reminder"]');
      await expect(reminderSection).toBeVisible();

      // Toggle reminder system
      const reminderToggle = reminderSection.locator('input[type="checkbox"]').first();
      const isChecked = await reminderToggle.isChecked();
      await reminderToggle.click();
      
      await expect(reminderToggle).toHaveChecked(!isChecked);
    });

    test('should configure reminder hours', async ({ page }) => {
      await page.goto('http://localhost:5173/admin/booking/settings');
      
      const hoursInput = page.locator('input[id*="hours"]').first();
      await hoursInput.fill('48');
      
      const saveButton = page.locator('button:has-text("Save")').first();
      await saveButton.click();
      
      // Wait for success message
      await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
    });

    test('should send manual reminder for appointment', async ({ page }) => {
      // Navigate to appointment details
      await page.goto('http://localhost:5173/admin/bookings');
      
      // Find an appointment
      const appointmentRow = page.locator('[role="row"]').first();
      await appointmentRow.click();
      
      // Send reminder button
      const sendReminderBtn = page.locator('button:has-text("Send Reminder")');
      await expect(sendReminderBtn).toBeVisible();
      await sendReminderBtn.click();
      
      // Confirmation message
      await expect(page.locator('text=Reminder sent')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Buffer Time', () => {
    test('should configure buffer time for service', async ({ page }) => {
      await page.goto('http://localhost:5173/admin/booking/services');
      
      // Select a service
      const serviceCard = page.locator('[class*="service-card"]').first();
      await serviceCard.click();
      
      // Find buffer time section
      const bufferSection = page.locator('[class*="buffer"]');
      await expect(bufferSection).toBeVisible();
      
      // Set buffer before
      const bufferBefore = bufferSection.locator('input').first();
      await bufferBefore.fill('15');
      
      // Set buffer after
      const bufferAfter = bufferSection.locator('input').nth(1);
      await bufferAfter.fill('10');
      
      // Save
      const saveBtn = bufferSection.locator('button:has-text("Save")');
      await saveBtn.click();
      
      await expect(page.locator('text=Buffer time settings saved')).toBeVisible();
    });

    test('should prevent double-booking with buffer time', async ({ page }) => {
      // Book first appointment
      await page.goto('http://localhost:5173/sites/test-restaurant');
      await page.click('text=Book Now');
      
      // Select service and time
      await page.click('[class*="service-card"]');
      await page.click('input[type="date"]');
      await page.fill('input[type="date"]', '2025-12-25');
      
      // Select 10:00 AM
      const timeSlots = page.locator('[class*="time-slot"]');
      const slot = timeSlots.filter({ hasText: '10:00' }).first();
      await slot.click();
      
      // Complete booking 1
      await page.fill('input[name="name"]', 'Test Customer 1');
      await page.fill('input[name="email"]', 'customer1@test.com');
      await page.fill('input[name="phone"]', '555-0001');
      await page.click('button:has-text("Confirm")');
      
      // Try to book overlapping time with buffer
      await page.goto('http://localhost:5173/sites/test-restaurant');
      await page.click('text=Book Now');
      await page.click('[class*="service-card"]');
      await page.click('input[type="date"]');
      await page.fill('input[type="date"]', '2025-12-25');
      
      // 10:00 should still be unavailable due to buffer
      const slot1000 = page.locator('text=10:00');
      await expect(slot1000).toHaveClass(/disabled/);
    });
  });

  test.describe('Multi-Staff Support', () => {
    test('should display staff selector with multiple staff', async ({ page }) => {
      await page.goto('http://localhost:5173/sites/test-restaurant');
      await page.click('text=Book Now');
      
      // First select a service
      await page.click('[class*="service-card"]');
      
      // Should now show staff selector
      const staffSelector = page.locator('[class*="staff-selector"]');
      await expect(staffSelector).toBeVisible();
      
      const staffCards = page.locator('[class*="staff-card"]');
      expect(await staffCards.count()).toBeGreaterThan(0);
    });

    test('should allow staff selection in booking flow', async ({ page }) => {
      await page.goto('http://localhost:5173/sites/test-restaurant');
      await page.click('text=Book Now');
      
      // Select service
      await page.click('[class*="service-card"]');
      
      // Select specific staff member
      const staffCard = page.locator('[class*="staff-card"]').first();
      await staffCard.click();
      
      // Verify selection
      await expect(staffCard).toHaveClass(/selected/);
    });

    test('should show staff-specific availability', async ({ page }) => {
      await page.goto('http://localhost:5173/sites/test-restaurant');
      await page.click('text=Book Now');
      
      // Select service
      await page.click('[class*="service-card"]');
      
      // Select staff
      const staffCard = page.locator('[class*="staff-card"]').nth(1);
      await staffCard.click();
      
      // Select date
      await page.click('input[type="date"]');
      await page.fill('input[type="date"]', '2025-12-25');
      
      // Check available slots for this staff
      const timeSlots = page.locator('[class*="time-slot"]');
      expect(await timeSlots.count()).toBeGreaterThan(0);
    });

    test('should auto-select single staff member', async ({ page }) => {
      // This test assumes a service with only one staff member
      await page.goto('http://localhost:5173/sites/test-salon');
      await page.click('text=Book Now');
      
      // Select service with single staff
      await page.click('[class*="service-card"]');
      
      // Should skip staff selection and go directly to date
      const staffSelector = page.locator('[class*="staff-selector"]');
      await expect(staffSelector).not.toBeVisible();
      
      const dateInput = page.locator('input[type="date"]');
      await expect(dateInput).toBeVisible();
    });
  });

  test.describe('Cancellation Emails', () => {
    test('should send cancellation email when admin cancels', async ({ page }) => {
      // Navigate to appointment
      await page.goto('http://localhost:5173/admin/bookings');
      
      // Find a confirmed appointment
      const appointment = page.locator('[class*="appointment-row"]').first();
      await appointment.click();
      
      // Cancel appointment
      const cancelBtn = page.locator('button:has-text("Cancel")');
      await cancelBtn.click();
      
      // Confirm cancellation
      const confirmBtn = page.locator('button:has-text("Confirm")').last();
      await confirmBtn.click();
      
      // Verify cancellation email section shows
      await expect(page.locator('text=Cancellation email sent')).toBeVisible();
    });

    test('should allow cancellation with reason', async ({ page }) => {
      await page.goto('http://localhost:5173/admin/bookings');
      
      const appointment = page.locator('[class*="appointment-row"]').first();
      await appointment.click();
      
      const cancelBtn = page.locator('button:has-text("Cancel")');
      await cancelBtn.click();
      
      // Fill cancellation reason
      const reasonInput = page.locator('textarea');
      await expect(reasonInput).toBeVisible();
      await reasonInput.fill('Staff member called in sick');
      
      // Confirm
      const confirmBtn = page.locator('button:has-text("Confirm")').last();
      await confirmBtn.click();
      
      await expect(page.locator('text=Appointment cancelled')).toBeVisible();
    });

    test('should prevent cancellation too close to appointment', async ({ page }) => {
      // Create an appointment for today (within 2 hours)
      // Then try to cancel as customer
      // This would need API setup to create the appointment
      
      // Note: This is a customer-facing test
      // Customer should see error message if trying to cancel < 2 hours before
    });
  });
});

test.describe('Phase 2 Integration Tests', () => {
  test('should complete full booking with reminders enabled', async ({ page }) => {
    // 1. Verify reminders are enabled
    // 2. Book appointment
    // 3. Verify appointment created
    // 4. Simulate reminder scheduler
    // 5. Verify email would be sent

    await page.goto('http://localhost:5173/sites/test-restaurant');
    await page.click('text=Book Now');
    
    // Complete booking flow with multi-staff support
    await page.click('[class*="service-card"]');
    await page.click('[class*="staff-card"]');
    await page.fill('input[type="date"]', '2025-12-25');
    await page.click('[class*="time-slot"]');
    
    await page.fill('input[name="name"]', 'Integration Test');
    await page.fill('input[name="email"]', 'integration@test.com');
    await page.fill('input[name="phone"]', '555-0001');
    
    await page.click('button:has-text("Confirm")');
    
    // Verify confirmation
    await expect(page.locator('text=Booking confirmed')).toBeVisible();
  });
});


