import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTenantOwner, requireStaffAccess, requireStaffPermission } from '../middleware/staffAccess.js';
import StaffInvitationService from '../services/staffInvitationService.js';
import StaffService from '../services/staffService.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();
const invitationService = new StaffInvitationService();
const staffService = new StaffService();

/**
 * ============================================
 * INVITATION ENDPOINTS (Owner Only)
 * ============================================
 */

/**
 * POST /api/staff/invitations
 * Create a new staff invitation
 * Body: { tenantId, staffId, email, role?, permissions? }
 */
router.post('/invitations', requireAuth, asyncHandler(async (req, res) => {
  const { tenantId, staffId, email, role, permissions } = req.body;
  const userId = req.user.id || req.user.userId;

  if (!tenantId || !staffId || !email) {
    return sendBadRequest(res, 'tenantId, staffId, and email are required', 'MISSING_REQUIRED_FIELDS');
  }

  // Verify tenant ownership
  const tenant = await prisma.booking_tenants.findUnique({
    where: { id: tenantId },
    select: { user_id: true }
  });

  if (!tenant || tenant.user_id !== userId) {
    return sendForbidden(res, 'Only tenant owner can create invitations', 'OWNER_ONLY');
  }

  const invitation = await invitationService.createInvitation(
    tenantId,
    staffId,
    email,
    role || 'staff',
    permissions,
    userId
  );

  return sendCreated(res, { invitation }, 'Invitation sent successfully');
}));

/**
 * GET /api/staff/invitations/:tenantId
 * List pending invitations for a tenant (owner only)
 */
router.get('/invitations/:tenantId', requireAuth, requireTenantOwner, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  const invitations = await invitationService.getPendingInvitations(tenantId);

  return sendSuccess(res, { invitations });
}));

/**
 * DELETE /api/staff/invitations/:id
 * Revoke an invitation (owner only)
 */
router.delete('/invitations/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id || req.user.userId;

  // Get invitation to find tenant
  const invitation = await prisma.staff_invitations.findUnique({
    where: { id },
    select: { tenant_id: true }
  });

  if (!invitation) {
    return sendNotFound(res, 'Invitation not found', 'INVITATION_NOT_FOUND');
  }

  await invitationService.revokeInvitation(id, invitation.tenant_id, userId);

  return sendSuccess(res, {}, 'Invitation revoked successfully');
}));

/**
 * POST /api/staff/accept-invitation
 * Accept an invitation (creates staff_user link)
 * Body: { token }
 */
router.post('/accept-invitation', requireAuth, asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id || req.user.userId;

  if (!token) {
    return sendBadRequest(res, 'Token is required', 'MISSING_TOKEN');
  }

  const staffUser = await invitationService.acceptInvitation(token, userId);

  return sendSuccess(res, { staffUser }, 'Invitation accepted successfully');
}));

/**
 * ============================================
 * STAFF DASHBOARD ENDPOINTS
 * ============================================
 */

/**
 * GET /api/staff/my-assignments
 * Get all tenants/sites where user is staff
 */
router.get('/my-assignments', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;

  const assignments = await staffService.getStaffAssignments(userId);

  return sendSuccess(res, { assignments });
}));

/**
 * GET /api/staff/dashboard/:tenantId
 * Get staff dashboard data for a tenant
 */
router.get('/dashboard/:tenantId', requireAuth, requireStaffAccess, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const userId = req.user.id || req.user.userId;

  const dashboard = await staffService.getDashboardData(tenantId, userId);

  return sendSuccess(res, { dashboard });
}));

/**
 * GET /api/staff/appointments/:tenantId
 * Get appointments assigned to staff member
 */
router.get('/appointments/:tenantId', requireAuth, requireStaffAccess, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { status, date } = req.query;
  const userId = req.user.id || req.user.userId;

  const appointments = await staffService.getStaffAppointments(tenantId, userId, { status, date });

  return sendSuccess(res, { appointments });
}));

/**
 * GET /api/staff/schedule/:tenantId
 * Day/week board. Query: from, to, scope=mine|team
 */
router.get('/schedule/:tenantId', requireAuth, requireStaffAccess, asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { from, to, scope } = req.query;
  const userId = req.user.id || req.user.userId;

  const schedule = await staffService.getSchedule(tenantId, userId, { from, to, scope });

  return sendSuccess(res, { schedule });
}));

/**
 * GET /api/staff/orders/:tenantId
 * Get orders for tenant (requires canViewOrders permission)
 */
router.get('/orders/:tenantId', requireAuth, requireStaffAccess, requireStaffPermission('canViewOrders'), asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { status } = req.query;

  const orders = await staffService.getStaffOrders(tenantId, { status });

  return sendSuccess(res, { orders });
}));

/**
 * PUT /api/staff/appointments/:appointmentId/status
 * Update appointment status (if permitted)
 */
router.put('/appointments/:appointmentId/status', requireAuth, asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { status, tenantId } = req.body;
  const userId = req.user.id || req.user.userId;

  if (!status || !tenantId) {
    return sendBadRequest(res, 'status and tenantId are required', 'MISSING_REQUIRED_FIELDS');
  }

  // Verify staff access
  const staffUser = await prisma.staff_users.findUnique({
    where: {
      user_id_tenant_id: {
        user_id: userId,
        tenant_id: tenantId
      }
    }
  });

  if (!staffUser) {
    return sendForbidden(res, 'Not authorized', 'STAFF_ACCESS_DENIED');
  }

  const appointment = await staffService.updateAppointmentStatus(appointmentId, tenantId, status, userId);

  return sendSuccess(res, { appointment }, 'Appointment status updated');
}));

/**
 * PUT /api/staff/orders/:orderId/status
 * Update order status (requires canUpdateStatus permission)
 */
router.put('/orders/:orderId/status', requireAuth, asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, tenantId } = req.body;
  const userId = req.user.id || req.user.userId;

  if (!status || !tenantId) {
    return sendBadRequest(res, 'status and tenantId are required', 'MISSING_REQUIRED_FIELDS');
  }

  // Verify staff access and permission
  const staffUser = await prisma.staff_users.findUnique({
    where: {
      user_id_tenant_id: {
        user_id: userId,
        tenant_id: tenantId
      }
    }
  });

  if (!staffUser) {
    return sendForbidden(res, 'Not authorized', 'STAFF_ACCESS_DENIED');
  }

  const permissions = staffUser.permissions || {};
  if (!permissions.canUpdateStatus) {
    return sendForbidden(res, 'Permission denied', 'INSUFFICIENT_PERMISSIONS');
  }

  const order = await staffService.updateOrderStatus(orderId, tenantId, status, userId);

  return sendSuccess(res, { order }, 'Order status updated');
}));

export default router;

