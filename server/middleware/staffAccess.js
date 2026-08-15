import { prisma } from '../../database/db.js';
import {
  sendForbidden,
  sendNotFound,
  sendBadRequest,
  asyncHandler
} from '../utils/apiResponse.js';

/**
 * Middleware to verify staff has access to a tenant
 * Checks if user is linked as staff to the tenant
 */
export const requireStaffAccess = asyncHandler(async (req, res, next) => {
  const userId = req.user.id || req.user.userId;
  const { tenantId } = req.params;

  if (!tenantId) {
    return sendBadRequest(res, 'tenantId is required', 'MISSING_TENANT_ID');
  }

  // Check if user is staff for this tenant
  const staffUser = await prisma.staff_users.findUnique({
    where: {
      user_id_tenant_id: {
        user_id: userId,
        tenant_id: tenantId
      }
    },
    include: {
      booking_staff: {
        select: {
          name: true,
          status: true
        }
      }
    }
  });

  if (!staffUser) {
    return sendForbidden(res, 'Not authorized to access this tenant', 'STAFF_ACCESS_DENIED');
  }

  // Attach staff info to request
  req.staffUser = staffUser;
  req.staffPermissions = staffUser.permissions || {};

  next();
});

/**
 * Middleware to verify staff has specific permission
 * @param {string} permission - Permission key (e.g., 'canViewOrders')
 */
export const requireStaffPermission = (permission) => {
  return asyncHandler(async (req, res, next) => {
    const permissions = req.staffPermissions || {};

    if (!permissions[permission]) {
      return sendForbidden(
        res,
        `Permission required: ${permission}`,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    next();
  });
};

/**
 * Middleware to verify user is tenant owner
 */
export const requireTenantOwner = asyncHandler(async (req, res, next) => {
  const userId = req.user.id || req.user.userId;
  const { tenantId } = req.params;

  if (!tenantId) {
    return sendBadRequest(res, 'tenantId is required', 'MISSING_TENANT_ID');
  }

  const tenant = await prisma.booking_tenants.findUnique({
    where: { id: tenantId },
    select: { user_id: true }
  });

  if (!tenant) {
    return sendNotFound(res, 'Tenant not found', 'TENANT_NOT_FOUND');
  }

  if (tenant.user_id !== userId) {
    return sendForbidden(res, 'Only tenant owner can perform this action', 'OWNER_ONLY');
  }

  next();
});

