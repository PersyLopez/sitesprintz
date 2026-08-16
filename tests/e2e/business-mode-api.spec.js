/**
 * E2E Tests: Business Mode API
 * 
 * Tests the Business Mode API endpoints directly without UI dependencies.
 * Uses API request context for faster, more reliable testing.
 */

import { test, expect } from '@playwright/test';
import { URLS, TIMEOUTS } from '../fixtures/test-config.js';
import fs from 'fs';
import path from 'path';

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);

const baseURL = URLS.BASE;

test.describe('Business Mode API Tests', () => {
  let csrfToken;
  let accessToken;
  let userId;
  let tenantId;
  let staffId;
  let serviceId;
  let secondStaffId;

  test.beforeAll(async ({ request }) => {
    // Get CSRF token
    const csrfResponse = await request.get(`${baseURL}/api/csrf-token`);
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;

    // Read seed data for user IDs
    const seedPath = path.resolve(process.cwd(), 'tests/e2e/.seed/seed-data.json');
    if (fs.existsSync(seedPath)) {
      const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      userId = seed?.users?.proUserId;
      console.log(`Using seeded user ID: ${userId}`);
    }

    // Login to get access token
    const loginResponse = await request.post(`${baseURL}/api/auth/login`, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      },
      data: {
        email: 'test@example.com',
        password: 'SecurePass!2024'
      }
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      accessToken = loginData.accessToken;
      userId = loginData.user?.id || userId;
      console.log('Login successful');
    } else {
      console.log('Login failed, using seed data');
    }
  });

  // ============================================
  // 1. GET TENANT AND SETUP
  // ============================================

  test('1.1: should get or create booking tenant', async ({ request }) => {
    // First, get services which will auto-create tenant
    const response = await request.get(`${baseURL}/api/booking/tenants/${userId}/services`);
    expect(response.ok()).toBeTruthy();

    // Get tenant ID from database
    const { prisma } = await import('../../database/db.js');
    const tenant = await prisma.booking_tenants.findFirst({
      where: { user_id: userId }
    });

    expect(tenant).toBeDefined();
    tenantId = tenant.id;
    console.log(`Got tenant ID: ${tenantId}`);
  });

  test('1.2: should get staff for tenant', async ({ request }) => {
    const { prisma } = await import('../../database/db.js');
    const staff = await prisma.booking_staff.findFirst({
      where: { tenant_id: tenantId }
    });

    expect(staff).toBeDefined();
    staffId = staff.id;
    console.log(`Got staff ID: ${staffId}`);
  });

  test('1.3: should get service for tenant', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/booking/tenants/${userId}/services`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.services).toBeDefined();
    expect(data.services.length).toBeGreaterThan(0);

    serviceId = data.services[0].id;
    console.log(`Got service ID: ${serviceId}`);
  });

  // ============================================
  // 2. BUSINESS MODE CONFIG API
  // ============================================

  test('2.1: should get business mode config', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/business-mode/${tenantId}/config`, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.config).toBeDefined();
    expect(data.config.tenantId).toBe(tenantId);
    expect(data.config.configuredMode).toBeDefined();
    expect(data.config.staffCount).toBeGreaterThanOrEqual(1);
    console.log(`Current mode: ${data.config.configuredMode}, Staff count: ${data.config.staffCount}`);
  });

  test('2.2: should get business mode suggestions', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/business-mode/${tenantId}/suggest`, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.suggestion).toBeDefined();
    expect(data.suggestion.suggestedMode).toBeDefined();
    expect(data.suggestion.recommendation).toBeDefined();
    console.log(`Suggested mode: ${data.suggestion.suggestedMode}`);
  });

  test('2.3: should update no-preference text', async ({ request }) => {
    const response = await request.put(`${baseURL}/api/business-mode/${tenantId}/config`, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        noPreferenceText: 'Any Available Provider'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.config.noPreferenceText).toBe('Any Available Provider');
  });

  test('2.4: should reject invalid business mode', async ({ request }) => {
    const response = await request.put(`${baseURL}/api/business-mode/${tenantId}/config`, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        businessMode: 'invalid_mode'
      }
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  // ============================================
  // 3. ADD SECOND STAFF FOR TEAM MODE TESTING
  // ============================================

  test('3.1: should add second staff member', async ({ request }) => {
    const { prisma } = await import('../../database/db.js');

    const newStaff = await prisma.booking_staff.create({
      data: {
        tenant_id: tenantId,
        name: 'Alex Rodriguez',
        email: 'alex@test.com',
        title: 'Senior Stylist',
        specialties: 'Color, Highlights',
        status: 'active',
        is_primary: false
      }
    });

    secondStaffId = newStaff.id;
    expect(secondStaffId).toBeDefined();
    console.log(`Created second staff: ${secondStaffId}`);

    // Set availability
    const availResponse = await request.post(
      `${baseURL}/api/booking/admin/${userId}/staff/${secondStaffId}/availability`,
      {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          scheduleRules: [
            { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
            { day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
            { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
            { day_of_week: 4, start_time: '09:00', end_time: '17:00', is_available: true },
            { day_of_week: 5, start_time: '09:00', end_time: '17:00', is_available: true }
          ]
        }
      }
    );

    expect(availResponse.ok()).toBeTruthy();
  });

  // ============================================
  // 4. TEAM MODE CONFIGURATION
  // ============================================

  test('4.1: should switch to team mode', async ({ request }) => {
    const response = await request.put(`${baseURL}/api/business-mode/${tenantId}/config`, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        businessMode: 'team',
        staffSelectionEnabled: true,
        allowNoPreference: true,
        noPreferenceText: 'Any Available Stylist'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.config.configuredMode).toBe('team');
    expect(data.config.staffSelectionEnabled).toBe(true);
    expect(data.config.allowNoPreference).toBe(true);
    expect(data.config.noPreferenceText).toBe('Any Available Stylist');
  });

  test('4.2: should get staff for service in team mode', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/business-mode/${tenantId}/services/${serviceId}/staff`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.staff).toBeDefined();
    expect(data.staff.length).toBe(2); // Original + new staff
    expect(data.showStaffSelection).toBe(true);
    expect(data.allowNoPreference).toBe(true);
    expect(data.businessMode).toBe('team');
  });

  // ============================================
  // 5. STAFF RESOLUTION API
  // ============================================

  test('5.1: should resolve no_preference to staff', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const response = await request.post(`${baseURL}/api/business-mode/${tenantId}/resolve-staff`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        serviceId,
        staffId: 'no_preference',
        date: dateStr,
        timezone: 'America/New_York'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.staff).toBeDefined();
    expect(data.staff.id).toBeDefined();
    expect(data.wasAutoAssigned).toBe(true);
    console.log(`Auto-assigned staff: ${data.staff.name}`);
  });

  test('5.2: should resolve specific staff selection', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const response = await request.post(`${baseURL}/api/business-mode/${tenantId}/resolve-staff`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        serviceId,
        staffId: secondStaffId,
        date: dateStr,
        timezone: 'America/New_York'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.staff.id).toBe(secondStaffId);
    expect(data.wasAutoAssigned).toBe(false);
  });

  // ============================================
  // 6. SERVICE-STAFF ASSIGNMENTS
  // ============================================

  test('6.1: should assign specific staff to service', async ({ request }) => {
    const response = await request.put(
      `${baseURL}/api/business-mode/${tenantId}/services/${serviceId}/staff`,
      {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          assignments: [
            { staffId: secondStaffId, isPrimary: true }
          ]
        }
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.assignments).toBeDefined();
    expect(data.assignments.length).toBe(1);
    expect(data.assignments[0].staffId).toBe(secondStaffId);
    expect(data.assignments[0].isPrimary).toBe(true);
  });

  test('6.2: should only return assigned staff for service', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/business-mode/${tenantId}/services/${serviceId}/staff`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Should only return the assigned staff
    expect(data.staff.length).toBe(1);
    expect(data.staff[0].id).toBe(secondStaffId);
  });

  test('6.3: should reject non-assigned staff in resolve', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const response = await request.post(`${baseURL}/api/business-mode/${tenantId}/resolve-staff`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        serviceId,
        staffId, // Original staff (not assigned anymore)
        date: dateStr,
        timezone: 'America/New_York'
      }
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test('6.4: should restore all staff to service', async ({ request }) => {
    const response = await request.put(
      `${baseURL}/api/business-mode/${tenantId}/services/${serviceId}/staff`,
      {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          assignments: [
            { staffId, isPrimary: true },
            { staffId: secondStaffId, isPrimary: false }
          ]
        }
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.assignments.length).toBe(2);
  });

  // ============================================
  // 7. HYBRID MODE
  // ============================================

  test('7.1: should switch to hybrid mode', async ({ request }) => {
    const response = await request.put(`${baseURL}/api/business-mode/${tenantId}/config`, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        businessMode: 'hybrid',
        staffSelectionEnabled: false,
        allowNoPreference: true
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.config.configuredMode).toBe('hybrid');
    expect(data.config.staffSelectionEnabled).toBe(false);
  });

  test('7.2: hybrid mode should have staff but no selection UI', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/business-mode/${tenantId}/services/${serviceId}/staff`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.staff.length).toBe(2);
    expect(data.businessMode).toBe('hybrid');
    // showStaffSelection should be false in hybrid mode
    expect(data.showStaffSelection).toBe(false);
  });

  // ============================================
  // 8. COMPLETE BOOKING WITH RESOLVED STAFF
  // ============================================

  test('8.1: should complete booking with auto-assigned staff', async ({ request }) => {
    // Reset to team mode first
    await request.put(`${baseURL}/api/business-mode/${tenantId}/config`, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        businessMode: 'team',
        staffSelectionEnabled: true,
        allowNoPreference: true
      }
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // 1. Resolve staff with no preference
    const resolveResponse = await request.post(`${baseURL}/api/business-mode/${tenantId}/resolve-staff`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        serviceId,
        staffId: 'no_preference',
        date: dateStr,
        timezone: 'America/New_York'
      }
    });

    expect(resolveResponse.ok()).toBeTruthy();
    const resolvedData = await resolveResponse.json();
    const resolvedStaffId = resolvedData.staff.id;
    expect(resolvedData.wasAutoAssigned).toBe(true);

    // 2. Get availability
    const availResponse = await request.get(
      `${baseURL}/api/booking/tenants/${userId}/availability?service_id=${serviceId}&staff_id=${resolvedStaffId}&date=${dateStr}`
    );

    expect(availResponse.ok()).toBeTruthy();
    const availData = await availResponse.json();

    // 3. Create appointment if slots available
    if (availData.slots && availData.slots.length > 0) {
      const slot = availData.slots[0];

      const bookingResponse = await request.post(
        `${baseURL}/api/booking/tenants/${userId}/appointments`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            service_id: serviceId,
            staff_id: resolvedStaffId,
            start_time: `${dateStr}T${slot.time}:00`,
            customer_name: 'Auto Test Customer',
            customer_email: 'autotest@example.com',
            customer_phone: '555-AUTO',
            customer_notes: 'E2E test with auto-assigned staff',
            timezone: 'America/New_York'
          }
        }
      );

      expect(bookingResponse.ok()).toBeTruthy();
      const bookingData = await bookingResponse.json();

      expect(bookingData.appointment).toBeDefined();
      expect(bookingData.appointment.confirmation_code).toBeDefined();
      expect(bookingData.appointment.staff_id).toBe(resolvedStaffId);
      console.log(`Booking created: ${bookingData.appointment.confirmation_code}`);
    }
  });

  // ============================================
  // CLEANUP
  // ============================================

  test.afterAll(async () => {
    try {
      const { prisma } = await import('../../database/db.js');

      // Delete second staff if created
      if (secondStaffId) {
        // First delete any service_staff assignments
        await prisma.service_staff.deleteMany({
          where: { staff_id: secondStaffId }
        }).catch(() => {});

        // Then delete the staff
        await prisma.booking_staff.delete({
          where: { id: secondStaffId }
        }).catch(() => {});
      }

      // Reset business mode to solo
      if (tenantId) {
        await prisma.booking_tenants.update({
          where: { id: tenantId },
          data: {
            business_mode: 'solo',
            staff_selection_enabled: false,
            allow_no_preference: true
          }
        }).catch(() => {});
      }

      console.log('Test cleanup complete');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  });
});


