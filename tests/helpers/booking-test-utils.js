import { expect } from '@playwright/test';

/**
 * Helper to setup booking data (Tenant, Service, Staff, Availability)
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} [csrfToken]
 */
export async function setupBookingData(request, userId, csrfToken) {
    const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';

    // 1. Create/Get Tenant (implicitly done by creating service/staff)
    // We'll start by creating a service, which creates the tenant if needed

    // 2. Create Service
    const serviceRes = await request.post(`${baseURL}/api/booking/admin/${userId}/services`, {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        data: {
            name: 'Test Service',
            description: 'A test service for E2E',
            duration_minutes: 60,
            price_cents: 5000, // $50.00
            online_booking_enabled: true
        }
    });
    expect(serviceRes.ok()).toBeTruthy();
    const serviceData = await serviceRes.json();
    const serviceId = serviceData.service.id;

    // 3. Get Default Staff (created automatically with tenant)
    // We need to fetch services or availability to find the staff, or just use the API to list staff
    // Since there isn't a direct "list staff" endpoint documented in the routes file we viewed,
    // we'll rely on the fact that creating a service creates a tenant, which creates a default staff.
    // Let's try to get availability which returns staff_id

    // Actually, let's use the availability endpoint to find the default staff
    // We can query availability for the service we just created
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    const availRes = await request.get(`${baseURL}/api/booking/tenants/${userId}/availability`, {
        params: {
            service_id: serviceId,
            date: dateString
        }
    });
    expect(availRes.ok()).toBeTruthy();
    const availData = await availRes.json();
    const staffId = availData.staff_id;

    // 4. Ensure Availability
    // The default staff might not have availability set. Let's set it explicitly.
    const scheduleRules = [
        {
            day_of_week: 1, // Monday
            start_time: '09:00',
            end_time: '17:00'
        },
        {
            day_of_week: 2, // Tuesday
            start_time: '09:00',
            end_time: '17:00'
        },
        {
            day_of_week: 3, // Wednesday
            start_time: '09:00',
            end_time: '17:00'
        },
        {
            day_of_week: 4, // Thursday
            start_time: '09:00',
            end_time: '17:00'
        },
        {
            day_of_week: 5, // Friday
            start_time: '09:00',
            end_time: '17:00'
        },
        {
            day_of_week: 6, // Saturday
            start_time: '09:00',
            end_time: '17:00'
        },
        {
            day_of_week: 0, // Sunday
            start_time: '09:00',
            end_time: '17:00'
        }
    ];

    const setAvailRes = await request.post(`${baseURL}/api/booking/admin/${userId}/staff/${staffId}/availability`, {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        data: { scheduleRules }
    });
    expect(setAvailRes.ok()).toBeTruthy();

    return { serviceId, staffId };
}

/**
 * Helper to create a test appointment
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} userId
 * @param {string} serviceId
 * @param {string} staffId
 * @param {string} [csrfToken]
 */
export async function createTestAppointment(request, userId, serviceId, staffId, csrfToken) {
    const baseURL = process.env.VITE_API_URL || 'http://localhost:3000';

    // Find a slot tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Ensure we don't pick a weekend if our availability is M-F
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateString = tomorrow.toISOString().split('T')[0];

    // Get slots
    const availRes = await request.get(`${baseURL}/api/booking/tenants/${userId}/availability`, {
        params: {
            service_id: serviceId,
            staff_id: staffId,
            date: dateString
        }
    });
    const availData = await availRes.json();
    const slots = availData.slots;

    if (!slots || slots.length === 0) {
        throw new Error('No slots available to create test appointment');
    }

    const slot = slots[0];

    // Create appointment
    const apptRes = await request.post(`${baseURL}/api/booking/tenants/${userId}/appointments`, {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        data: {
            service_id: serviceId,
            staff_id: staffId,
            start_time: slot.start_time,
            customer_name: 'Test Customer',
            customer_email: 'test@customer.com',
            customer_phone: '555-0123'
        }
    });
    if (!apptRes.ok()) {
        const errorBody = await apptRes.text();
        console.error('Failed to create appointment:', apptRes.status(), apptRes.statusText(), errorBody);
    }
    expect(apptRes.ok()).toBeTruthy();
    const apptData = await apptRes.json();

    return apptData.appointment;
}
