import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import BusinessModeService, { BUSINESS_MODES } from '../services/booking/BusinessModeService.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';
import { prisma } from '../../database/db.js';

const router = express.Router();
const businessModeService = new BusinessModeService();

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

/**
 * Authorization middleware for business mode routes
 * Ensures the authenticated user owns the tenant
 */
const authorizeTenantOwner = asyncHandler(async (req, res, next) => {
  const { tenantId } = req.params;
  const userId = req.user.id || req.user.userId;

  const tenant = await prisma.booking_tenants.findUnique({
    where: { id: tenantId },
    select: { user_id: true }
  });

  if (!tenant) {
    return sendNotFound(res, 'Tenant not found', 'TENANT_NOT_FOUND');
  }

  if (tenant.user_id !== userId && req.user.role !== 'admin') {
    return sendForbidden(res, 'Not authorized to access this tenant', 'UNAUTHORIZED_ACCESS');
  }

  next();
});

/**
 * GET /api/business-mode/:tenantId/config
 * Get business mode configuration for a tenant
 */
router.get('/:tenantId/config', requireAuth, authorizeTenantOwner, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  const config = await businessModeService.getBusinessModeConfig(tenantId);

  sendSuccess(res, {
    config,
    availableModes: Object.values(BUSINESS_MODES)
  });
}));

/**
 * PUT /api/business-mode/:tenantId/config
 * Update business mode configuration
 * Body: { businessMode?, staffSelectionEnabled?, allowNoPreference?, noPreferenceText? }
 */
router.put('/:tenantId/config', requireAuth, authorizeTenantOwner, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { businessMode, staffSelectionEnabled, allowNoPreference, noPreferenceText } = req.body;

  // Validate businessMode if provided
  if (businessMode && !Object.values(BUSINESS_MODES).includes(businessMode)) {
    return sendBadRequest(
      res,
      `Invalid business mode. Must be one of: ${Object.values(BUSINESS_MODES).join(', ')}`,
      'INVALID_BUSINESS_MODE'
    );
  }

  const config = await businessModeService.updateBusinessModeConfig(tenantId, {
    businessMode,
    staffSelectionEnabled,
    allowNoPreference,
    noPreferenceText
  });

  sendSuccess(res, { config }, 'Business mode configuration updated');
}));

/**
 * GET /api/business-mode/:tenantId/suggest
 * Get suggested business mode based on current setup
 */
router.get('/:tenantId/suggest', requireAuth, authorizeTenantOwner, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  const suggestion = await businessModeService.suggestBusinessMode(tenantId);

  sendSuccess(res, { suggestion });
}));

/**
 * POST /api/business-mode/:tenantId/migrate-to-team
 * Migrate a tenant from solo to team mode
 * This sets up service-staff assignments automatically
 */
router.post('/:tenantId/migrate-to-team', requireAuth, authorizeTenantOwner, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  try {
    const result = await businessModeService.migrateToTeamMode(tenantId);
    sendSuccess(res, result, 'Successfully migrated to team mode');
  } catch (error) {
    return sendBadRequest(res, error.message, 'MIGRATION_FAILED');
  }
}));

/**
 * GET /api/business-mode/:tenantId/services/:serviceId/staff
 * Get staff available for a specific service
 */
router.get('/:tenantId/services/:serviceId/staff', asyncHandler(async (req, res) => {
  const { tenantId: tenantIdOrUserId, serviceId } = req.params;

  const tenant = await resolveTenant(tenantIdOrUserId);
  if (!tenant) {
    return sendNotFound(res, 'Tenant not found', 'TENANT_NOT_FOUND');
  }

  // Get business mode config
  const config = await businessModeService.getBusinessModeConfig(tenant.id);

  // Get staff for this service
  const staff = await businessModeService.getStaffForService(tenant.id, serviceId);

  sendSuccess(res, {
    staff: staff.map(s => ({
      id: s.id,
      name: s.name,
      title: s.title,
      bio: s.bio,
      photo_url: s.photo_url || s.avatar_url,
      specialties: s.specialties,
      isPrimary: s.is_primary,
      isPrimaryForService: s.isPrimaryForService
    })),
    businessMode: config.effectiveMode,
    showStaffSelection: config.showStaffSelection,
    allowNoPreference: config.allowNoPreference,
    noPreferenceText: config.noPreferenceText
  });
}));

/**
 * PUT /api/business-mode/:tenantId/services/:serviceId/staff
 * Assign staff to a service
 * Body: { assignments: [{ staffId, isPrimary }] }
 */
router.put('/:tenantId/services/:serviceId/staff', requireAuth, authorizeTenantOwner, asyncHandler(async (req, res) => {
  const { tenantId, serviceId } = req.params;
  const { assignments } = req.body;

  if (!Array.isArray(assignments)) {
    return sendBadRequest(res, 'assignments must be an array', 'INVALID_ASSIGNMENTS');
  }

  try {
    const result = await businessModeService.assignStaffToService(tenantId, serviceId, assignments);
    sendSuccess(res, {
      assignments: result.map(a => ({
        staffId: a.staff_id,
        staffName: a.booking_staff.name,
        isPrimary: a.is_primary
      }))
    }, 'Staff assignments updated');
  } catch (error) {
    return sendBadRequest(res, error.message, 'ASSIGNMENT_FAILED');
  }
}));

/**
 * POST /api/business-mode/:tenantId/resolve-staff
 * Resolve the actual staff for a booking (handles "no_preference")
 * Body: { serviceId, staffId?, date, timezone? }
 * PUBLIC endpoint - used during booking flow
 * :tenantId accepts booking_tenants.id OR owner user_id
 */
router.post('/:tenantId/resolve-staff', asyncHandler(async (req, res) => {
  const { tenantId: tenantIdOrUserId } = req.params;
  const { serviceId, staffId, date, timezone = 'America/New_York' } = req.body;

  if (!serviceId || !date) {
    return sendBadRequest(res, 'serviceId and date are required', 'MISSING_REQUIRED_FIELDS');
  }

  const tenant = await resolveTenant(tenantIdOrUserId);
  if (!tenant) {
    return sendNotFound(res, 'Tenant not found', 'TENANT_NOT_FOUND');
  }

  try {
    const resolvedStaff = await businessModeService.resolveStaffForBooking(
      tenant.id,
      serviceId,
      staffId,
      date,
      timezone
    );

    sendSuccess(res, {
      staff: {
        id: resolvedStaff.id,
        name: resolvedStaff.name,
        title: resolvedStaff.title,
        photo_url: resolvedStaff.photo_url || resolvedStaff.avatar_url
      },
      wasAutoAssigned: !staffId || staffId === 'no_preference' || staffId === 'any'
    });
  } catch (error) {
    return sendBadRequest(res, error.message, 'STAFF_RESOLUTION_FAILED');
  }
}));

export default router;


