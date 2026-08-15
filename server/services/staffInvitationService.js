import { prisma } from '../../database/db.js';
import crypto from 'crypto';
import BookingNotificationService from './bookingNotificationService.js';

/**
 * Staff Invitation Service
 * Handles staff invitation creation, validation, acceptance, and revocation
 */
class StaffInvitationService {
  constructor() {
    this.notificationService = new BookingNotificationService();
  }

  /**
   * Generate a secure random token (32 bytes = 256 bits)
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new staff invitation
   * @param {string} tenantId - Tenant ID
   * @param {string} staffId - Staff member ID
   * @param {string} email - Invitee email
   * @param {string} role - Role (staff, manager)
   * @param {object} permissions - Permission object
   * @param {string} invitedBy - User ID of inviter
   * @returns {Promise<object>} Created invitation
   */
  async createInvitation(tenantId, staffId, email, role = 'staff', permissions = null, invitedBy) {
    try {
      // Validate tenant ownership
      const tenant = await prisma.booking_tenants.findUnique({
        where: { id: tenantId },
        select: { user_id: true, business_name: true }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      if (tenant.user_id !== invitedBy) {
        throw new Error('Only tenant owner can invite staff');
      }

      // Check if staff exists
      const staff = await prisma.booking_staff.findUnique({
        where: { id: staffId },
        select: { tenant_id: true, name: true }
      });

      if (!staff || staff.tenant_id !== tenantId) {
        throw new Error('Staff member not found or does not belong to tenant');
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.staff_invitations.findFirst({
        where: {
          tenant_id: tenantId,
          staff_id: staffId,
          email: email.toLowerCase(),
          status: 'pending'
        }
      });

      if (existingInvitation) {
        // Check if expired
        if (new Date(existingInvitation.expires_at) < new Date()) {
          // Mark as expired and create new one
          await prisma.staff_invitations.update({
            where: { id: existingInvitation.id },
            data: { status: 'expired' }
          });
        } else {
          throw new Error('Pending invitation already exists for this email');
        }
      }

      // Generate token and expiration (7 days)
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Default permissions if not provided
      const defaultPermissions = permissions || {
        canViewOrders: role === 'manager',
        canUpdateStatus: role === 'manager',
        canManageAppointments: true,
        canViewReports: role === 'manager',
        canViewTeamSchedule: role === 'manager'
      };

      // Create invitation
      const invitation = await prisma.staff_invitations.create({
        data: {
          tenant_id: tenantId,
          staff_id: staffId,
          email: email.toLowerCase(),
          token,
          role,
          permissions: defaultPermissions,
          status: 'pending',
          invited_by: invitedBy,
          expires_at: expiresAt
        }
      });

      // Send invitation email
      await this.sendInvitationEmail(invitation, tenant.business_name);

      return invitation;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  /**
   * Validate an invitation token
   * @param {string} token - Invitation token
   * @returns {Promise<object>} Invitation data if valid
   */
  async validateInvitation(token) {
    try {
      const invitation = await prisma.staff_invitations.findUnique({
        where: { token },
        include: {
          booking_staff: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error(`Invitation has been ${invitation.status}`);
      }

      if (new Date(invitation.expires_at) < new Date()) {
        // Mark as expired
        await prisma.staff_invitations.update({
          where: { id: invitation.id },
          data: { status: 'expired' }
        });
        throw new Error('Invitation has expired');
      }

      return invitation;
    } catch (error) {
      console.error('Error validating invitation:', error);
      throw error;
    }
  }

  /**
   * Accept an invitation (creates staff_user link)
   * @param {string} token - Invitation token
   * @param {string} userId - User ID accepting the invitation
   * @returns {Promise<object>} Created staff_user record
   */
  async acceptInvitation(token, userId) {
    try {
      // Validate invitation
      const invitation = await this.validateInvitation(token);

      // Check if user already linked to this tenant
      const existingLink = await prisma.staff_users.findUnique({
        where: {
          user_id_tenant_id: {
            user_id: userId,
            tenant_id: invitation.tenant_id
          }
        }
      });

      if (existingLink) {
        throw new Error('User is already linked to this tenant');
      }

      // Create staff_user link
      const staffUser = await prisma.staff_users.create({
        data: {
          user_id: userId,
          staff_id: invitation.staff_id,
          tenant_id: invitation.tenant_id,
          role: invitation.role,
          permissions: invitation.permissions
        }
      });

      // Mark invitation as accepted
      await prisma.staff_invitations.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          accepted_at: new Date()
        }
      });

      return staffUser;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Revoke an invitation
   * @param {string} invitationId - Invitation ID
   * @param {string} tenantId - Tenant ID (for authorization)
   * @param {string} userId - User ID revoking (must be owner)
   */
  async revokeInvitation(invitationId, tenantId, userId) {
    try {
      // Verify tenant ownership
      const tenant = await prisma.booking_tenants.findUnique({
        where: { id: tenantId },
        select: { user_id: true }
      });

      if (!tenant || tenant.user_id !== userId) {
        throw new Error('Only tenant owner can revoke invitations');
      }

      // Verify invitation belongs to tenant
      const invitation = await prisma.staff_invitations.findUnique({
        where: { id: invitationId }
      });

      if (!invitation || invitation.tenant_id !== tenantId) {
        throw new Error('Invitation not found or access denied');
      }

      // Delete invitation
      await prisma.staff_invitations.delete({
        where: { id: invitationId }
      });

      return { success: true };
    } catch (error) {
      console.error('Error revoking invitation:', error);
      throw error;
    }
  }

  /**
   * Send invitation email
   * @param {object} invitation - Invitation object
   * @param {string} businessName - Business name
   */
  async sendInvitationEmail(invitation, businessName) {
    try {
      const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
      const acceptUrl = `${SITE_URL}/staff/accept/${invitation.token}`;

      const inviter = await prisma.users.findUnique({
        where: { id: invitation.invited_by },
        select: { email: true }
      });

      const inviterName = inviter?.email || 'Business Owner';

      await this.notificationService.sendStaffInvitationEmail({
        email: invitation.email,
        businessName,
        inviterName,
        role: invitation.role,
        acceptUrl,
        expiresAt: invitation.expires_at
      });
    } catch (error) {
      console.error('Error sending invitation email:', error);
      // Don't throw - email failure shouldn't break invitation creation
    }
  }

  /**
   * Get pending invitations for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} List of pending invitations
   */
  async getPendingInvitations(tenantId) {
    try {
      const invitations = await prisma.staff_invitations.findMany({
        where: {
          tenant_id: tenantId,
          status: 'pending'
        },
        include: {
          booking_staff: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return invitations;
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired invitations (mark as expired)
   * @returns {Promise<number>} Number of invitations expired
   */
  async cleanupExpiredInvitations() {
    try {
      const result = await prisma.staff_invitations.updateMany({
        where: {
          status: 'pending',
          expires_at: {
            lt: new Date()
          }
        },
        data: {
          status: 'expired'
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      throw error;
    }
  }
}

export default StaffInvitationService;



