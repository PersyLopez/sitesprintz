import { expect } from '@playwright/test';

/**
 * Setup booking data via API for a specific user
 * @param {import('@playwright/test').APIRequestContext} request - Playwright request context
 * @param {string} userId - ID of the user to setup data for
 * @param {string} csrfToken - CSRF token for the request
 * @param {string} accessToken - Access token for authentication
 */
export async function setupBookingData(request, userId, csrfToken, accessToken) {
    const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';

    const headers = {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    };

    // 1. Create a test service
    const serviceRes = await request.post(`${baseURL}/api/booking/admin/${userId}/services`, {
        headers,
        data: {
            name: 'Test Service',
            description: 'A test service for E2E',
            duration_minutes: 60,
            price_cents: 5000, // $50.00
            online_booking_enabled: true
        }
    });

    if (!serviceRes.ok()) {
        const text = await serviceRes.text();
        console.error(`Failed to create service: ${serviceRes.status()} ${text}`);
    }
    expect(serviceRes.ok()).toBeTruthy();
    const serviceData = await serviceRes.json();
    const serviceId = serviceData.service.id;

    // 2. Set availability for the default staff
    // We use 'default' as a special identifier for the account owner
    const availabilityRes = await request.post(`${baseURL}/api/booking/admin/${userId}/staff/default/availability`, {
        headers,
        data: {
            scheduleRules: [
                { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
                { day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
                { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
                { day_of_week: 4, start_time: '09:00', end_time: '17:00', is_available: true },
                { day_of_week: 5, start_time: '09:00', end_time: '17:00', is_available: true },
                { day_of_week: 6, start_time: '09:00', end_time: '17:00', is_available: true },
                { day_of_week: 0, start_time: '09:00', end_time: '17:00', is_available: true }
            ]
        }
    });

    if (!availabilityRes.ok()) {
        const text = await availabilityRes.text();
        console.error(`Failed to set availability: ${availabilityRes.status()} ${text}`);
    }
    expect(availabilityRes.ok()).toBeTruthy();

    // Get tenant and staff IDs from database
    let tenantId = null;
    let staffId = null;
    
    try {
        const { prisma } = await import('../../database/db.js');
        
        // Get tenant from service
        const service = await prisma.booking_services.findUnique({
            where: { id: serviceId },
            select: { tenant_id: true }
        });
        
        if (service) {
            tenantId = service.tenant_id;
            
            // Get staff for this tenant
            const staff = await prisma.booking_staff.findFirst({
                where: { tenant_id: tenantId },
                select: { id: true }
            });
            
            if (staff) {
                staffId = staff.id;
            }
        }
    } catch (error) {
        console.warn('Could not get tenant/staff IDs from database:', error.message);
    }

    return { serviceId, userId, tenantId, staffId };
}

/**
 * Helper to create a test appointment
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} tenantId - Tenant ID
 * @param {string} serviceId - Service ID
 * @param {string} staffId - Staff ID
 * @param {string} customerEmail - Customer email
 * @param {string} customerName - Customer name
 * @param {string} [csrfToken] - CSRF token
 * @param {string} [accessToken] - Access token
 */
export async function createTestAppointment(request, tenantId, serviceId, staffId, customerEmail, customerName, csrfToken, accessToken) {
    const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';

    // Get user ID from tenant
    let userId = null;
    try {
        const { prisma } = await import('../../database/db.js');
        const tenant = await prisma.booking_tenants.findUnique({
            where: { id: tenantId },
            select: { user_id: true }
        });
        if (tenant) {
            userId = tenant.user_id;
        }
    } catch (error) {
        console.warn('Could not get user ID from tenant:', error.message);
    }

    if (!userId) {
        throw new Error('Could not determine user ID from tenant');
    }

    // Find a slot tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Ensure we don't pick a weekend for default availability if needed
    // (though our setupBookingData sets Sun-Sat now)
    const dateString = tomorrow.toISOString().split('T')[0];

    // Get slots to pick a valid start_time
    let effectiveCsrfToken = csrfToken;
    if (!effectiveCsrfToken) {
        // Try to get from cookies if available in the request context
        const cookies = await request.storageState().then(s => s.cookies).catch(() => []);
        const sessionCookie = cookies.find(c => c.name === 'sessionId');
        // Note: We can't easily get the value from Map if we don't have the sessionId here,
        // but normally it should be passed.
    }

    const headers = {
        ...(effectiveCsrfToken ? { 'X-CSRF-Token': effectiveCsrfToken } : {}),
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    };

    const availRes = await request.get(`${baseURL}/api/booking/tenants/${userId}/availability`, {
        headers,
        params: {
            service_id: serviceId,
            staff_id: staffId || 'default',
            date: dateString
        }
    });

    if (!availRes.ok()) {
        const text = await availRes.text();
        console.error(`Failed to get availability: ${availRes.status()} ${text}`);
    }
    expect(availRes.ok()).toBeTruthy();
    const availData = await availRes.json();
    const slots = availData.slots;

    if (!slots || slots.length === 0) {
        throw new Error(`No slots available for date ${dateString}`);
    }

    const slot = slots[0];

    const res = await request.post(`${baseURL}/api/booking/tenants/${userId}/appointments`, {
        headers,
        data: {
            service_id: serviceId,
            staff_id: staffId || 'default',
            start_time: slot.start_time,
            customer_name: customerName || 'Test Customer',
            customer_email: customerEmail || 'test@customer.com',
            customer_phone: '555-0123',
            notes: 'E2E Test Appointment'
        }
    });

    if (!res.ok()) {
        const errorBody = await res.text();
        console.error('Failed to create appointment:', res.status(), res.statusText(), errorBody);
    }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    return data.appointment;
}
