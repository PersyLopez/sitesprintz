import express from 'express';
import BookingService from '../services/bookingService.js';
import { requireAuth } from '../middleware/auth.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();
const bookingService = new BookingService();

/**
 * Authorization middleware for admin booking routes
 * Ensures the authenticated user can only manage their own booking data
 */
const authorizeBookingAdmin = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const authenticatedUserId = req.user.id || req.user.userId;
  
  // Users can only access their own booking data (unless admin)
  if (userId !== authenticatedUserId && req.user.role !== 'admin') {
    return sendForbidden(res, 'Not authorized to access this booking data', 'UNAUTHORIZED_BOOKING_ACCESS');
  }
  
  next();
});

/**
 * PUBLIC BOOKING API
 * These endpoints are used by customers to browse and book appointments
 */

/**
 * GET /api/booking/tenants/:userId/services
 * Get all available services for booking
 */
router.get('/tenants/:userId/services', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Get or create tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Get active services
  const services = await bookingService.getServices(tenant.id, false);

  sendSuccess(res, {
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      duration_minutes: s.duration_minutes,
      price_cents: s.price_cents,
      price_display: `$${(s.price_cents / 100).toFixed(2)}`,
      online_booking_enabled: s.online_booking_enabled,
      requires_approval: s.requires_approval,
    })),
  });
}));

/**
 * GET /api/booking/tenants/:userId/availability
 * Get available time slots for a service/staff/date
 * Query params: service_id, staff_id (optional), date, timezone (optional)
 */
router.get('/tenants/:userId/availability', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { service_id, staff_id, date, timezone = 'America/New_York' } = req.query;

  if (!service_id || !date) {
    console.log('Missing service_id or date', { service_id, date });
    return sendBadRequest(res, 'service_id and date are required', 'MISSING_REQUIRED_FIELDS');
  }
  console.log(`Availability request: userId=${userId}, service=${service_id}, date=${date}`);

  // Get or create tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Get or use default staff
  let staffIdToUse = staff_id;
  if (!staffIdToUse) {
    const defaultStaff = await bookingService.getOrCreateDefaultStaff(tenant.id);
    staffIdToUse = defaultStaff.id;
  }

  // Calculate available slots
  const slots = await bookingService.calculateAvailableSlots(
    tenant.id,
    service_id,
    staffIdToUse,
    date,
    timezone
  );

  sendSuccess(res, {
    date,
    timezone,
    service_id,
    staff_id: staffIdToUse,
    slots,
    total_slots: slots.length,
  });
}));

/**
 * POST /api/booking/tenants/:userId/appointments
 * Create a new appointment
 */
router.post('/tenants/:userId/appointments', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const appointmentData = req.body;

  // Validation
  const required = ['service_id', 'start_time', 'customer_name', 'customer_email'];
  for (const field of required) {
    if (!appointmentData[field]) {
      return sendBadRequest(res, `Missing required field: ${field}`, 'MISSING_REQUIRED_FIELD');
    }
  }

  // Get or create tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Get or use default staff
  let staffId = appointmentData.staff_id;
  if (!staffId) {
    const defaultStaff = await bookingService.getOrCreateDefaultStaff(tenant.id);
    staffId = defaultStaff.id;
  }

  // Create appointment
  const appointment = await bookingService.createAppointment(tenant.id, {
    ...appointmentData,
    staff_id: staffId,
  });

  // Email notification is sent automatically by the service

  const message = appointment.requires_approval
    ? 'Appointment pending approval'
    : 'Appointment confirmed!';

  sendCreated(res, {
    appointment: {
      id: appointment.id,
      confirmation_code: appointment.confirmation_code,
      service_id: appointment.service_id,
      staff_id: appointment.staff_id,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      customer_name: appointment.customer_name,
      customer_email: appointment.customer_email,
      status: appointment.status,
      total_price_cents: appointment.total_price_cents,
    }
  }, message);
}));

/**
 * GET /api/booking/tenants/:userId/appointments/:identifier
 * Get appointment details (by ID or confirmation code)
 */
router.get('/tenants/:userId/appointments/:identifier', asyncHandler(async (req, res) => {
  const { userId, identifier } = req.params;

  // Get tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Get appointment
  const appointment = await bookingService.getAppointment(identifier, tenant.id);

  if (!appointment) {
    return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND');
  }

  sendSuccess(res, { appointment });
}));

/**
 * DELETE /api/booking/tenants/:userId/appointments/:identifier
 * Cancel an appointment (by ID or confirmation code)
 */
router.delete('/tenants/:userId/appointments/:identifier', asyncHandler(async (req, res) => {
  const { userId, identifier } = req.params;
  const { reason, cancelled_by = 'customer' } = req.body;

  // Get tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Cancel appointment
  const appointment = await bookingService.cancelAppointment(identifier, tenant.id, {
    reason,
    cancelled_by,
  });

  if (!appointment) {
    return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND_OR_CANCELLED');
  }

  // Email notification is sent automatically by the service

  sendSuccess(res, {
    appointment: {
      id: appointment.id,
      confirmation_code: appointment.confirmation_code,
      status: appointment.status,
      cancelled_at: appointment.cancelled_at,
    },
  }, 'Appointment cancelled successfully');
}));

/**
 * GET /api/booking/appointments/:identifier
 * Get appointment details by confirmation code (Global lookup)
 */
router.get('/appointments/:identifier', asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  // We need to find the appointment globally.
  // Since bookingService methods usually require tenantId, we might need to extend the service
  // or use a method that finds by confirmation code first.
  // Let's assume getAppointment can handle it if we pass null for tenantId, or we add a new method.
  // Checking BookingService... we'll need to update it too if it doesn't support this.
  // For now, let's try to find it.

  // Actually, let's implement the logic here or call a new service method.
  // Since I can't see BookingService right now, I'll assume I need to add `getAppointmentByCode` to it.
  const appointment = await bookingService.getAppointmentByCode(identifier);

  if (!appointment) {
    return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND');
  }

  sendSuccess(res, { appointment });
}));

/**
 * DELETE /api/booking/appointments/:identifier
 * Cancel appointment by confirmation code (Global lookup)
 */
router.delete('/appointments/:identifier', asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const { reason, cancelled_by = 'customer' } = req.body;

  const appointment = await bookingService.cancelAppointmentByCode(identifier, {
    reason,
    cancelled_by,
  });

  if (!appointment) {
    return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND_OR_CANCELLED');
  }

  sendSuccess(res, {
    appointment: {
      id: appointment.id,
      confirmation_code: appointment.confirmation_code,
      status: appointment.status,
      cancelled_at: appointment.cancelled_at,
    },
  }, 'Appointment cancelled successfully');
}));

/**
 * ADMIN/DASHBOARD API
 * These endpoints require authentication and are used by business owners
 */

/**
 * POST /api/booking/admin/:userId/services
 * Create a new service (admin only)
 */
router.post('/admin/:userId/services', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const serviceData = req.body;

  // Get tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Create service
  const service = await bookingService.createService(tenant.id, serviceData);

  sendCreated(res, { service });
}));

/**
 * PUT /api/booking/admin/:userId/services/:serviceId
 * Update a service (admin only)
 */
router.put('/admin/:userId/services/:serviceId', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { userId, serviceId } = req.params;
  const serviceData = req.body;

  // Get tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Update service
  const service = await bookingService.updateService(serviceId, tenant.id, serviceData);

  if (!service) {
    return sendNotFound(res, 'Service', 'SERVICE_NOT_FOUND');
  }

  sendSuccess(res, { service });
}));

/**
 * DELETE /api/booking/admin/:userId/services/:serviceId
 * Delete a service (admin only)
 */
router.delete('/admin/:userId/services/:serviceId', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { userId, serviceId } = req.params;

  // Get tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Delete service
  const deleted = await bookingService.deleteService(serviceId, tenant.id);

  if (!deleted) {
    return sendNotFound(res, 'Service', 'SERVICE_NOT_FOUND');
  }

  sendSuccess(res, {}, 'Service deleted successfully');
}));

/**
 * GET /api/booking/admin/:userId/appointments
 * Get all appointments (admin only)
 * Query params: start_date, end_date, status, staff_id, service_id
 */
router.get('/admin/:userId/appointments', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const filters = req.query;

  // Get tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  // Get appointments
  const appointments = await bookingService.getAppointments(tenant.id, filters);

  sendSuccess(res, {
    appointments,
    total: appointments.length,
  });
}));

/**
 * POST /api/booking/admin/:userId/staff/:staffId/availability
 * Set availability schedule for staff (admin only)
 */
router.post('/admin/:userId/staff/:staffId/availability', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { userId, staffId } = req.params;
  const { scheduleRules } = req.body;

  if (!Array.isArray(scheduleRules) || scheduleRules.length === 0) {
    return sendBadRequest(res, 'scheduleRules array is required', 'MISSING_SCHEDULE_RULES');
  }

  // Get tenant
  const tenant = await bookingService.getOrCreateTenant(userId, null);

  let targetStaffId = staffId;
  if (staffId === 'default-staff-id' || staffId === 'default') {
    const defaultStaff = await bookingService.getOrCreateDefaultStaff(tenant.id);
    targetStaffId = defaultStaff.id;
  }

  // Set availability
  const rules = await bookingService.setAvailabilityRules(targetStaffId, tenant.id, scheduleRules);

  sendSuccess(res, {
    rules,
  }, 'Availability schedule updated');
}));

/**
 * GET /api/booking/admin/:userId/staff/:staffId/availability
 * Get availability schedule for staff (admin only)
 */
router.get('/admin/:userId/staff/:staffId/availability', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { userId, staffId } = req.params;

  let targetStaffId = staffId;

  // Resolve default staff if needed
  if (staffId === 'default-staff-id' || staffId === 'default') {
    const tenant = await bookingService.getOrCreateTenant(userId, null);
    const defaultStaff = await bookingService.getOrCreateDefaultStaff(tenant.id);
    targetStaffId = defaultStaff.id;
  }

  // Get availability
  const rules = await bookingService.getAvailabilityRules(targetStaffId);

  sendSuccess(res, { rules });
}));

export default router;

