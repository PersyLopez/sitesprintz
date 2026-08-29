import express from 'express';
import BookingService from '../services/bookingService.js';
import BookingPaymentAdapter from '../services/booking/BookingPaymentAdapter.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import { resolvePlanLimits } from '../utils/resolveUserPlan.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';
import { sanitizeString } from '../utils/validators.js';
import {
  isShowcaseDemoSite,
  buildDemoConfirmationCode,
  buildDemoOrderId,
} from '../utils/showcaseDemo.js';
import { ensurePublishedBooking } from '../services/booking/ensurePublishedBooking.js';

const router = express.Router();
const bookingService = new BookingService();
const paymentAdapter = new BookingPaymentAdapter();

function requestedStaffId(value) {
  if (!value || value === 'default' || value === 'no_preference' || value === 'any') {
    return null;
  }
  return String(value);
}

/** Public-safe appointment payload (no customer PII / staff email) */
function toPublicAppointment(appointment) {
  if (!appointment) return null;
  return {
    id: appointment.id,
    confirmation_code: appointment.confirmation_code,
    service_id: appointment.service_id,
    service_name: appointment.service_name || appointment.booking_services?.name || null,
    staff_id: appointment.staff_id,
    staff_name: appointment.staff_name || appointment.booking_staff?.name || null,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    status: appointment.status,
    timezone: appointment.timezone,
    total_price_cents: appointment.total_price_cents,
    business_name: appointment.business_name || appointment.booking_tenants?.business_name || null
  };
}

function emailsMatch(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function sanitizeCancelReason(reason) {
  return sanitizeString(reason || 'No reason provided', 500);
}

/**
 * Ensure site owner has Growth booking access
 */
async function requireGrowthBooking(userId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { plan: true, subscription_plan: true }
  });
  const limits = resolvePlanLimits(user);
  return Boolean(limits.booking);
}

/** Optional siteId from query/body — scopes gallery tenants that share one owner. */
function publicSiteId(req) {
  const raw = req.query?.siteId || req.body?.site_id || req.body?.siteId || null;
  if (!raw) return null;
  return String(raw).slice(0, 255);
}

async function resolvePublicTenant(userId, siteId) {
  return bookingService.getOrCreateTenant(userId, siteId || null);
}

async function loadSiteForDemo(userId, siteId) {
  if (!siteId) return null;
  return prisma.sites.findFirst({
    where: {
      user_id: userId,
      OR: [{ id: siteId }, { subdomain: siteId }],
    },
    select: { id: true, subdomain: true, site_data: true },
  });
}

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

  const allowed = await requireGrowthBooking(userId);
  if (!allowed) {
    return sendForbidden(res, 'Native booking requires Growth plan', 'GROWTH_PLAN_REQUIRED');
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

  const allowed = await requireGrowthBooking(userId);
  if (!allowed) {
    return sendForbidden(res, 'Native booking requires Growth plan', 'GROWTH_PLAN_REQUIRED');
  }

  const tenant = await resolvePublicTenant(userId, publicSiteId(req));

  // Get active services
  let services = await bookingService.getServices(tenant.id, false);
  if (!services.length) {
    await ensurePublishedBooking({
      userId,
      siteId: publicSiteId(req) || tenant.site_id,
    }).catch(() => {});
    services = await bookingService.getServices(tenant.id, false);
  }

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
      // Payment fields (Phase 2)
      requires_payment: s.requires_payment || false,
      payment_type: s.payment_type || 'none',
      deposit_percentage: s.deposit_percentage || 50,
      buffer_minutes_before: s.buffer_minutes_before || 0,
      buffer_minutes_after: s.buffer_minutes_after || 0,
    })),
  });
}));

/**
 * GET /api/booking/tenants/:userId/staff
 * Public list of active staff for booking widgets
 */
router.get('/tenants/:userId/staff', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const allowed = await requireGrowthBooking(userId);
  if (!allowed) {
    return sendForbidden(res, 'Native booking requires Growth plan', 'GROWTH_PLAN_REQUIRED');
  }

  const tenant = await resolvePublicTenant(userId, publicSiteId(req));
  await bookingService.getOrCreateDefaultStaff(tenant.id);
  const staff = await bookingService.getStaffForTenant(tenant.id);

  sendSuccess(res, { staff });
}));

/**
 * GET /api/booking/tenants/:userId/availability
 * Get available time slots for a service/staff/date
 * Query params: service_id, staff_id (optional), date, timezone (optional)
 */
router.get('/tenants/:userId/availability', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const allowed = await requireGrowthBooking(userId);
  if (!allowed) {
    return sendForbidden(res, 'Native booking requires Growth plan', 'GROWTH_PLAN_REQUIRED');
  }
  const { service_id, staff_id, date, timezone = 'America/New_York' } = req.query;

  if (!service_id || !date) {
    console.log('Missing service_id or date', { service_id, date });
    return sendBadRequest(res, 'service_id and date are required', 'MISSING_REQUIRED_FIELDS');
  }
  console.log(`Availability request: userId=${userId}, service=${service_id}, date=${date}`);

  // Get or create tenant (site-scoped when siteId is provided)
  const tenant = await resolvePublicTenant(userId, publicSiteId(req));

  // Get or use default staff
  let staffIdToUse = requestedStaffId(staff_id);
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

  const allowed = await requireGrowthBooking(userId);
  if (!allowed) {
    return sendForbidden(res, 'Native booking requires Growth plan', 'GROWTH_PLAN_REQUIRED');
  }
  const appointmentData = req.body;
  const siteId = publicSiteId(req);

  // Validation
  const required = ['service_id', 'start_time', 'customer_name', 'customer_email'];
  for (const field of required) {
    if (!appointmentData[field]) {
      return sendBadRequest(res, `Missing required field: ${field}`, 'MISSING_REQUIRED_FIELD');
    }
  }

  const tenant = await resolvePublicTenant(userId, siteId);

  // Get or use default staff
  let staffId = requestedStaffId(appointmentData.staff_id);
  if (!staffId || staffId === 'default') {
    const defaultStaff = await bookingService.getOrCreateDefaultStaff(tenant.id);
    staffId = defaultStaff.id;
  }

  const demoSite = await loadSiteForDemo(userId, siteId || tenant.site_id);
  if (isShowcaseDemoSite(demoSite)) {
    const service = await prisma.booking_services.findFirst({
      where: { id: appointmentData.service_id, tenant_id: tenant.id },
    });
    const start = new Date(appointmentData.start_time);
    const duration = service?.duration_minutes || 60;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const confirmation = buildDemoConfirmationCode();

    return sendCreated(res, {
      appointment: {
        id: buildDemoOrderId(),
        confirmation_code: confirmation,
        service_id: appointmentData.service_id,
        service_name: service?.name || null,
        staff_id: staffId,
        staff_name: 'Demo staff',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed',
        timezone: appointmentData.timezone || tenant.timezone || 'America/New_York',
        total_price_cents: service?.price_cents || 0,
        business_name: tenant.business_name,
        customer_name: appointmentData.customer_name,
        customer_email: appointmentData.customer_email,
        demo: true,
      }
    }, 'Demo appointment confirmed! No real booking was saved.');
  }

  try {
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
        ...toPublicAppointment(appointment),
        // Customer sees their own details only on create response
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email,
      }
    }, message);
  } catch (error) {
    // Check for double-booking (constraint violation or explicit message)
    if (error.message?.includes('slot') || error.message?.includes('overlap') ||
        error.code === 'P2002' || error.meta?.target?.includes('no_overlapping_appointments')) {
      return res.status(409).json({
        error: 'Time slot no longer available',
        code: 'SLOT_UNAVAILABLE',
        details: error.message
      });
    }
    if (
      error.message?.includes('in advance') ||
      error.message?.includes('Cannot book') ||
      error.message?.includes('days in advance')
    ) {
      return sendBadRequest(res, error.message, 'BOOKING_WINDOW_VIOLATION');
    }
    // Re-throw other errors
    throw error;
  }
}));

/**
 * GET /api/booking/tenants/:userId/appointments/:identifier
 * Get appointment details (by ID or confirmation code)
 */
router.get('/tenants/:userId/appointments/:identifier', asyncHandler(async (req, res) => {
  const { userId, identifier } = req.params;
  const email = req.query.email || req.headers['x-customer-email'];

  const allowed = await requireGrowthBooking(userId);
  if (!allowed) {
    return sendForbidden(res, 'Native booking requires Growth plan', 'GROWTH_PLAN_REQUIRED');
  }

  const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));
  const appointment = await bookingService.getAppointment(identifier, tenant.id);

  if (!appointment) {
    return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND');
  }

  // Full PII only when customer proves email ownership
  if (email && emailsMatch(email, appointment.customer_email)) {
    return sendSuccess(res, {
      appointment: {
        ...toPublicAppointment(appointment),
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email,
        customer_phone: appointment.customer_phone || null
      }
    });
  }

  sendSuccess(res, { appointment: toPublicAppointment(appointment) });
}));

/**
 * DELETE /api/booking/tenants/:userId/appointments/:identifier
 * Cancel an appointment — requires matching customer_email (customers)
 * or authenticated owner via cancelled_by=admin
 */
router.delete('/tenants/:userId/appointments/:identifier', asyncHandler(async (req, res) => {
  const { userId, identifier } = req.params;
  const { reason, cancelled_by = 'customer', customer_email } = req.body || {};

  const allowed = await requireGrowthBooking(userId);
  if (!allowed) {
    return sendForbidden(res, 'Native booking requires Growth plan', 'GROWTH_PLAN_REQUIRED');
  }

  const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));
  const existing = await bookingService.getAppointment(identifier, tenant.id);
  if (!existing) {
    return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND_OR_CANCELLED');
  }

  const isOwnerCancel = ['admin', 'owner'].includes(cancelled_by)
    && req.user
    && ((req.user.id || req.user.userId) === userId || req.user.role === 'admin');

  if (!isOwnerCancel) {
    if (!customer_email) {
      return sendBadRequest(res, 'customer_email is required to cancel', 'MISSING_CUSTOMER_EMAIL');
    }
    if (!emailsMatch(customer_email, existing.customer_email)) {
      return sendForbidden(res, 'Email does not match this appointment', 'EMAIL_MISMATCH');
    }
  }

  try {
    const appointment = await bookingService.cancelAppointment(identifier, tenant.id, {
      reason: sanitizeCancelReason(reason),
      cancelled_by: isOwnerCancel ? 'admin' : cancelled_by,
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
  } catch (error) {
    if (error.code === 'CANCELLATION_NOT_ALLOWED') {
      return sendBadRequest(res, error.message, 'CANCELLATION_NOT_ALLOWED');
    }
    throw error;
  }
}));

/**
 * DELETE /api/booking/admin/:userId/appointments/:identifier
 * Owner/admin cancel (auth required) — skips customer email proof
 */
router.delete('/admin/:userId/appointments/:identifier', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { userId, identifier } = req.params;
  const { reason } = req.body || {};

  const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));

  try {
    const appointment = await bookingService.cancelAppointment(identifier, tenant.id, {
      reason: sanitizeCancelReason(reason || 'Cancelled by admin'),
      cancelled_by: 'admin',
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
  } catch (error) {
    if (error.code === 'CANCELLATION_NOT_ALLOWED') {
      return sendBadRequest(res, error.message, 'CANCELLATION_NOT_ALLOWED');
    }
    throw error;
  }
}));

/**
 * GET /api/booking/appointments/:identifier
 * Get appointment by confirmation code (public DTO)
 */
router.get('/appointments/:identifier', asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const email = req.query.email || req.headers['x-customer-email'];

  // Reject bare UUID lookups for anonymous global access (use confirmation code)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  if (isUUID) {
    return sendBadRequest(res, 'Use confirmation code for public lookup', 'CONFIRMATION_CODE_REQUIRED');
  }

  const appointment = await bookingService.getAppointmentByCode(identifier);

  if (!appointment) {
    return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND');
  }

  if (email && emailsMatch(email, appointment.customer_email)) {
    return sendSuccess(res, {
      appointment: {
        ...toPublicAppointment(appointment),
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email,
        customer_phone: appointment.customer_phone || null
      }
    });
  }

  sendSuccess(res, { appointment: toPublicAppointment(appointment) });
}));

/**
 * DELETE /api/booking/appointments/:identifier
 * Cancel by confirmation code — requires matching customer_email
 */
router.delete('/appointments/:identifier', asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const { reason, cancelled_by = 'customer', customer_email } = req.body || {};

  if (!customer_email) {
    return sendBadRequest(res, 'customer_email is required to cancel', 'MISSING_CUSTOMER_EMAIL');
  }

  const existing = await bookingService.getAppointmentByCode(identifier);
  if (!existing) {
    return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND_OR_CANCELLED');
  }
  if (!emailsMatch(customer_email, existing.customer_email)) {
    return sendForbidden(res, 'Email does not match this appointment', 'EMAIL_MISMATCH');
  }

  try {
    const appointment = await bookingService.cancelAppointmentByCode(identifier, {
      reason: sanitizeCancelReason(reason),
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
  } catch (error) {
    if (error.code === 'CANCELLATION_NOT_ALLOWED') {
      return sendBadRequest(res, error.message, 'CANCELLATION_NOT_ALLOWED');
    }
    throw error;
  }
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
  const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));

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
  const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));

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
  const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));

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
  const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));

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
  const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));

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
    const tenant = await bookingService.getOrCreateTenant(userId, publicSiteId(req));
    const defaultStaff = await bookingService.getOrCreateDefaultStaff(tenant.id);
    targetStaffId = defaultStaff.id;
  }

  // Get availability
  const rules = await bookingService.getAvailabilityRules(targetStaffId);

  sendSuccess(res, { rules   });
}));

// ============================================================================
// PAYMENT ENDPOINTS (Phase 2)
// ============================================================================

/**
 * POST /api/booking/checkout/create-session
 * Create Stripe Checkout session for booking payment
 * PUBLIC endpoint - called by customer during booking flow
 */
router.post('/checkout/create-session', asyncHandler(async (req, res) => {
  const { 
    appointment_id, 
    payment_type = 'full'
  } = req.body;

  // Validation
  if (!appointment_id) {
    return sendBadRequest(res, 'appointment_id is required', 'MISSING_APPOINTMENT_ID');
  }

  if (!['deposit', 'full'].includes(payment_type)) {
    return sendBadRequest(res, 'payment_type must be "deposit" or "full"', 'INVALID_PAYMENT_TYPE');
  }

  try {
    // Create checkout session using adapter
    const result = await paymentAdapter.createBookingCheckout(appointment_id, payment_type);

    sendSuccess(res, {
      checkout_url: result.checkoutUrl,
      session_id: result.sessionId,
      appointment_id: result.appointmentId,
      amount_cents: result.amountCents,
      payment_type: result.paymentType,
      pay_on_site: result.payOnSite === true,
      fees: result.fees
    }, result.payOnSite ? 'Pay at the salon' : 'Checkout session created');
  } catch (error) {
    console.error('[BookingRoutes] Error creating checkout session:', error);
    return sendBadRequest(res, error.message, 'CHECKOUT_SESSION_FAILED');
  }
}));

/**
 * PUT /api/booking/admin/:userId/services/:serviceId/payment
 * Enable/configure payment for a service
 * ADMIN endpoint - requires authentication
 */
router.put('/admin/:userId/services/:serviceId/payment', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const { requires_payment, payment_type, deposit_percentage } = req.body;

  // Validation
  if (typeof requires_payment !== 'boolean') {
    return sendBadRequest(res, 'requires_payment must be a boolean', 'INVALID_REQUIRES_PAYMENT');
  }

  if (requires_payment) {
    if (!payment_type || !['deposit', 'full', 'optional'].includes(payment_type)) {
      return sendBadRequest(res, 'payment_type must be "deposit", "full", or "optional"', 'INVALID_PAYMENT_TYPE');
    }

    if (payment_type === 'deposit') {
      if (typeof deposit_percentage !== 'number' || deposit_percentage < 10 || deposit_percentage > 100) {
        return sendBadRequest(res, 'deposit_percentage must be between 10 and 100', 'INVALID_DEPOSIT_PERCENTAGE');
      }
    }
  }

  try {
    const result = await paymentAdapter.setServicePaymentRequirement(
      serviceId, 
      requires_payment, 
      payment_type || 'none',
      deposit_percentage || 50
    );

    sendSuccess(res, result, 'Payment settings updated');
  } catch (error) {
    console.error('[BookingRoutes] Error updating payment settings:', error);
    return sendBadRequest(res, error.message, 'PAYMENT_SETTINGS_UPDATE_FAILED');
  }
}));

/**
 * GET /api/booking/admin/:userId/services/:serviceId/payment
 * Get payment configuration for a service
 * ADMIN endpoint - requires authentication
 */
router.get('/admin/:userId/services/:serviceId/payment', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  try {
    // Get service payment configuration from database
    const { prisma } = await import('../../database/db.js');
    const service = await prisma.booking_services.findUnique({
      where: { id: serviceId },
      select: {
        requires_payment: true,
        payment_type: true,
        deposit_percentage: true,
        price_cents: true,
        cancellation_policy: true,
        refund_policy: true
      }
    });

    if (!service) {
      return sendNotFound(res, 'Service', 'SERVICE_NOT_FOUND');
    }

    sendSuccess(res, {
      payment_config: service
    });
  } catch (error) {
    console.error('[BookingRoutes] Error fetching payment config:', error);
    return sendBadRequest(res, error.message, 'PAYMENT_CONFIG_FETCH_FAILED');
  }
}));

/**
 * POST /api/booking/admin/:userId/appointments/:appointmentId/refund
 * Refund payment for an appointment
 * ADMIN endpoint - requires authentication
 */
router.post('/admin/:userId/appointments/:appointmentId/refund', requireAuth, authorizeBookingAdmin, asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { reason = 'appointment_cancellation' } = req.body;

  try {
    const result = await paymentAdapter.refundAppointmentPayment(appointmentId, reason);

    sendSuccess(res, result, 'Refund processed successfully');
  } catch (error) {
    console.error('[BookingRoutes] Error processing refund:', error);
    return sendBadRequest(res, error.message, 'REFUND_FAILED');
  }
}));

/**
 * GET /api/booking/appointments/:appointmentId/payment-summary
 * Get payment summary for an appointment
 * PUBLIC endpoint - can be accessed by customer or admin
 */
router.get('/appointments/:appointmentId/payment-summary', asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const summary = await paymentAdapter.getPaymentSummary(appointmentId);

    sendSuccess(res, { payment_summary: summary });
  } catch (error) {
    console.error('[BookingRoutes] Error fetching payment summary:', error);
    return sendBadRequest(res, error.message, 'PAYMENT_SUMMARY_FETCH_FAILED');
  }
}));

export default router;

