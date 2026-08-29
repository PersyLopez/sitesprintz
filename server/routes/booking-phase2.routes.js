/**
 * Booking Routes - Phase 2 Extensions
 *
 * Reminder management, buffer times, multi-staff helpers.
 * Mutating endpoints require auth + tenant ownership.
 */

import express from 'express';
import {
  asyncHandler,
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendForbidden
} from '../utils/apiResponse.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import ReminderScheduler from '../services/booking/ReminderScheduler.js';
import BufferTimeService from '../services/booking/BufferTimeService.js';
import { availabilityService } from '../services/booking/AvailabilityServiceV2.js';
import { sanitizeString } from '../utils/validators.js';
import { parseSiteData } from '../utils/parseSiteData.js';
import { resolveOwnedSiteId } from '../services/payments/processorConnectHelpers.js';
import {
  applyShopIntakeSiteFeatures,
  buildShopIntakeSettings,
  parseShopIntakePutBody,
} from '../services/booking/shopIntakeFlags.js';

const router = express.Router();
const reminderScheduler = new ReminderScheduler();
const bufferTimeService = new BufferTimeService();

async function resolveTenant(tenantIdOrUserId) {
  const byId = await prisma.booking_tenants.findUnique({
    where: { id: tenantIdOrUserId },
    select: { id: true, user_id: true }
  });
  if (byId) return byId;

  return prisma.booking_tenants.findFirst({
    where: { user_id: tenantIdOrUserId },
    select: { id: true, user_id: true }
  });
}

async function assertTenantOwner(tenantIdOrUserId, userId, userRole) {
  const tenant = await resolveTenant(tenantIdOrUserId);
  if (!tenant) return { ok: false, status: 404, error: 'Tenant not found' };
  if (tenant.user_id !== userId && userRole !== 'admin') {
    return { ok: false, status: 403, error: 'Not authorized' };
  }
  return { ok: true, tenant };
}

async function assertServiceOwner(serviceId, userId, userRole) {
  const service = await prisma.booking_services.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      tenant_id: true,
      booking_tenants: { select: { user_id: true } }
    }
  });
  if (!service) return { ok: false, status: 404, error: 'Service not found' };
  if (service.booking_tenants?.user_id !== userId && userRole !== 'admin') {
    return { ok: false, status: 403, error: 'Not authorized' };
  }
  return { ok: true, service };
}

function requestSiteId(req) {
  const raw = req.query?.siteId || req.body?.site_id || req.body?.siteId || null;
  if (!raw) return null;
  return String(raw).slice(0, 255);
}

async function loadTenantSiteRecord(tenant, userId, siteIdHint) {
  const resolvedSiteId = await resolveOwnedSiteId(userId, siteIdHint || tenant.site_id || null);
  if (!resolvedSiteId) return { siteId: null, siteData: {} };

  const site = await prisma.sites.findFirst({
    where: { id: resolvedSiteId, user_id: userId },
    select: { id: true, site_data: true },
  });
  if (!site) return { siteId: null, siteData: {} };
  return { siteId: site.id, siteData: parseSiteData(site.site_data) };
}

async function persistSiteIntakeFeatures(siteId, siteData, siteUpdates) {
  if (!siteId || !siteUpdates) return siteData;
  const nextSiteData = applyShopIntakeSiteFeatures(siteData, siteUpdates);
  await prisma.sites.update({
    where: { id: siteId },
    data: { site_data: nextSiteData },
  });
  return nextSiteData;
}

async function assertAppointmentOwner(appointmentId, userId, userRole) {
  const appt = await prisma.appointments.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      booking_tenants: { select: { user_id: true } }
    }
  });
  if (!appt) return { ok: false, status: 404, error: 'Appointment not found' };
  if (appt.booking_tenants?.user_id !== userId && userRole !== 'admin') {
    return { ok: false, status: 403, error: 'Not authorized' };
  }
  return { ok: true, appt };
}

// ============================================================================
// REMINDER SETTINGS ENDPOINTS
// ============================================================================

router.get('/tenants/:tenantId/reminder-settings', requireAuth, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const userId = req.user.id || req.user.userId;
  const access = await assertTenantOwner(tenantId, userId, req.user.role);
  if (!access.ok) {
    return access.status === 404
      ? sendNotFound(res, 'Tenant', 'TENANT_NOT_FOUND')
      : sendForbidden(res, access.error, 'ACCESS_DENIED');
  }

  const tenant = await prisma.booking_tenants.findUnique({
    where: { id: access.tenant.id },
    select: {
      booking_page_enabled: true,
      payment_enabled: true,
      default_payment_type: true,
      default_deposit_percentage: true,
      site_id: true,
    },
  });
  const { siteData } = await loadTenantSiteRecord(tenant, userId, requestSiteId(req));
  const reminderSettings = await reminderScheduler.getReminderSettings(access.tenant.id);
  sendSuccess(res, buildShopIntakeSettings(reminderSettings, tenant, siteData));
}));

router.put('/tenants/:tenantId/reminder-settings', requireAuth, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const userId = req.user.id || req.user.userId;
  const access = await assertTenantOwner(tenantId, userId, req.user.role);
  if (!access.ok) {
    return access.status === 404
      ? sendNotFound(res, 'Tenant', 'TENANT_NOT_FOUND')
      : sendForbidden(res, access.error, 'ACCESS_DENIED');
  }

  const { enabled, hoursBefore, template } = req.body;
  const intake = parseShopIntakePutBody(req.body);

  if (typeof enabled !== 'undefined' && typeof enabled !== 'boolean') {
    return sendBadRequest(res, 'enabled must be boolean', 'INVALID_INPUT');
  }

  if (typeof hoursBefore !== 'undefined' && (typeof hoursBefore !== 'number' || hoursBefore < 1 || hoursBefore > 72)) {
    return sendBadRequest(res, 'hoursBefore must be between 1 and 72', 'INVALID_INPUT');
  }

  for (const [key, val] of [
    ['scheduling_enabled', req.body.scheduling_enabled],
    ['urgent_enabled', req.body.urgent_enabled],
    ['fees_enabled', req.body.fees_enabled],
    ['payment_enabled', req.body.payment_enabled],
  ]) {
    if (typeof val !== 'undefined' && typeof val !== 'boolean') {
      return sendBadRequest(res, `${key} must be boolean`, 'INVALID_INPUT');
    }
  }

  if (intake.errors.length) {
    return sendBadRequest(res, intake.errors[0], 'INVALID_INPUT');
  }

  const tenantBefore = await prisma.booking_tenants.findUnique({
    where: { id: access.tenant.id },
    select: {
      booking_page_enabled: true,
      payment_enabled: true,
      default_payment_type: true,
      default_deposit_percentage: true,
      site_id: true,
    },
  });
  const { siteId, siteData } = await loadTenantSiteRecord(
    tenantBefore,
    userId,
    requestSiteId(req)
  );

  if (Object.keys(intake.tenantData).length) {
    await prisma.booking_tenants.update({
      where: { id: access.tenant.id },
      data: { ...intake.tenantData, updated_at: new Date() },
    });
  }

  const nextSiteData = await persistSiteIntakeFeatures(siteId, siteData, intake.siteUpdates);

  await reminderScheduler.updateReminderSettings(access.tenant.id, {
    enabled,
    hoursBefore,
    template: template !== undefined ? sanitizeString(String(template), 5000) : undefined,
  });

  const tenantAfter = await prisma.booking_tenants.findUnique({
    where: { id: access.tenant.id },
    select: {
      booking_page_enabled: true,
      payment_enabled: true,
      default_payment_type: true,
      default_deposit_percentage: true,
    },
  });
  const reminderSettings = await reminderScheduler.getReminderSettings(access.tenant.id);
  const settings = buildShopIntakeSettings(reminderSettings, tenantAfter, nextSiteData);

  sendSuccess(res, { message: 'Reminder settings updated', settings });
}));

router.post('/appointments/:appointmentId/send-reminder', requireAuth, asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const userId = req.user.id || req.user.userId;
  const access = await assertAppointmentOwner(appointmentId, userId, req.user.role);
  if (!access.ok) {
    return access.status === 404
      ? sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND')
      : sendForbidden(res, access.error, 'ACCESS_DENIED');
  }

  try {
    await reminderScheduler.sendManualReminder(appointmentId);
    sendSuccess(res, { message: 'Reminder sent successfully' });
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendNotFound(res, 'Appointment', 'APPOINTMENT_NOT_FOUND');
    }
    throw error;
  }
}));

// ============================================================================
// BUFFER TIME ENDPOINTS
// ============================================================================

router.get('/services/:serviceId/buffer-settings', requireAuth, asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const userId = req.user.id || req.user.userId;
  const access = await assertServiceOwner(serviceId, userId, req.user.role);
  if (!access.ok) {
    return access.status === 404
      ? sendNotFound(res, 'Service', 'SERVICE_NOT_FOUND')
      : sendForbidden(res, access.error, 'ACCESS_DENIED');
  }

  const settings = await bufferTimeService.getBufferSettings(serviceId);
  sendSuccess(res, settings);
}));

router.put('/services/:serviceId/buffer-settings', requireAuth, asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const userId = req.user.id || req.user.userId;
  const access = await assertServiceOwner(serviceId, userId, req.user.role);
  if (!access.ok) {
    return access.status === 404
      ? sendNotFound(res, 'Service', 'SERVICE_NOT_FOUND')
      : sendForbidden(res, access.error, 'ACCESS_DENIED');
  }

  const { before, after } = req.body;

  if (typeof before !== 'number' || before < 0 || before > 120) {
    return sendBadRequest(res, 'before must be between 0 and 120 minutes', 'INVALID_INPUT');
  }

  if (typeof after !== 'number' || after < 0 || after > 120) {
    return sendBadRequest(res, 'after must be between 0 and 120 minutes', 'INVALID_INPUT');
  }

  const updated = await bufferTimeService.updateBufferSettings(serviceId, before, after);

  sendSuccess(res, { message: 'Buffer settings updated', bufferSettings: updated });
}));

/**
 * POST /api/booking/check-availability-with-buffers
 * Public availability check (no PII)
 */
router.post('/check-availability-with-buffers', asyncHandler(async (req, res) => {
  const { serviceId, staffId, proposedStart, proposedEnd } = req.body;

  if (!serviceId || !staffId || !proposedStart || !proposedEnd) {
    return sendBadRequest(res, 'Missing required fields', 'INVALID_INPUT');
  }

  const result = await bufferTimeService.checkAvailabilityWithBuffers(
    serviceId,
    staffId,
    new Date(proposedStart),
    new Date(proposedEnd)
  );

  sendSuccess(res, result);
}));

/**
 * GET /api/booking/next-available-slot
 * Public helper — no PII
 */
router.get('/next-available-slot', asyncHandler(async (req, res) => {
  const { serviceId, staffId, startTime, durationMinutes } = req.query;
  if (!serviceId || !staffId) {
    return sendBadRequest(res, 'serviceId and staffId are required', 'INVALID_INPUT');
  }

  const slot = await bufferTimeService.getNextAvailableSlot(
    serviceId,
    staffId,
    startTime ? new Date(startTime) : new Date(),
    parseInt(durationMinutes, 10) || 30
  );

  sendSuccess(res, { slot });
}));

/**
 * GET /api/booking/availability/:serviceId/:staffId
 * Public availability for a staff/service pair — no PII
 */
router.get('/availability/:serviceId/:staffId', asyncHandler(async (req, res) => {
  const { serviceId, staffId } = req.params;
  const { date, timezone = 'America/New_York' } = req.query;
  if (!date) {
    return sendBadRequest(res, 'date is required', 'INVALID_INPUT');
  }

  const service = await prisma.booking_services.findUnique({
    where: { id: serviceId },
    select: { tenant_id: true }
  });
  if (!service) {
    return sendNotFound(res, 'Service', 'SERVICE_NOT_FOUND');
  }

  try {
    const slots = await availabilityService.calculateAvailableSlots({
      serviceId,
      staffId,
      tenantId: service.tenant_id,
      date,
      timezone
    });
    sendSuccess(res, {
      date,
      serviceId,
      staffId,
      slots,
      total_slots: slots.length
    });
  } catch (error) {
    if (
      error.message?.includes('in advance') ||
      error.message?.includes('Cannot book') ||
      error.message?.includes('days in advance')
    ) {
      return sendSuccess(res, { date, serviceId, staffId, slots: [], total_slots: 0, message: error.message });
    }
    throw error;
  }
}));

export default router;
