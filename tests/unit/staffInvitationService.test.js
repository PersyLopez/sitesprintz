import { describe, it, expect, beforeEach, vi } from 'vitest';
import StaffInvitationService from '../../../server/services/staffInvitationService.js';
import { prisma } from '../../../database/db.js';

// Mock prisma
vi.mock('../../../database/db.js', () => ({
  prisma: {
    booking_tenants: {
      findUnique: vi.fn(),
    },
    booking_staff: {
      findUnique: vi.fn(),
    },
    staff_invitations: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    staff_users: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    users: {
      findUnique: vi.fn(),
    },
  },
}));

describe('StaffInvitationService', () => {
  let service;

  beforeEach(() => {
    service = new StaffInvitationService();
    vi.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = service.generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('createInvitation', () => {
    it('should create an invitation with valid data', async () => {
      const tenantId = 'tenant-123';
      const staffId = 'staff-123';
      const email = 'staff@example.com';
      const invitedBy = 'user-123';

      prisma.booking_tenants.findUnique.mockResolvedValue({
        id: tenantId,
        user_id: invitedBy,
        business_name: 'Test Business',
      });

      prisma.booking_staff.findUnique.mockResolvedValue({
        id: staffId,
        tenant_id: tenantId,
        name: 'Test Staff',
      });

      prisma.staff_invitations.findFirst.mockResolvedValue(null);

      prisma.staff_invitations.create.mockResolvedValue({
        id: 'invitation-123',
        tenant_id: tenantId,
        staff_id: staffId,
        email,
        token: 'test-token',
        status: 'pending',
      });

      prisma.users.findUnique.mockResolvedValue({
        id: invitedBy,
        email: 'owner@example.com',
      });

      // Mock email service
      vi.spyOn(service.notificationService, 'sendStaffInvitationEmail').mockResolvedValue({
        success: true,
      });

      const invitation = await service.createInvitation(
        tenantId,
        staffId,
        email,
        'staff',
        null,
        invitedBy
      );

      expect(invitation).toBeDefined();
      expect(prisma.staff_invitations.create).toHaveBeenCalled();
    });

    it('should throw error if tenant not found', async () => {
      prisma.booking_tenants.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvitation('invalid', 'staff-123', 'email@test.com', 'staff', null, 'user-123')
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('validateInvitation', () => {
    it('should validate a valid invitation token', async () => {
      const token = 'valid-token';
      const invitation = {
        id: 'inv-123',
        token,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      prisma.staff_invitations.findUnique.mockResolvedValue(invitation);

      const result = await service.validateInvitation(token);

      expect(result).toEqual(invitation);
    });

    it('should throw error for expired invitation', async () => {
      const token = 'expired-token';
      const invitation = {
        id: 'inv-123',
        token,
        status: 'pending',
        expires_at: new Date(Date.now() - 1000), // Expired
      };

      prisma.staff_invitations.findUnique.mockResolvedValue(invitation);
      prisma.staff_invitations.update.mockResolvedValue({});

      await expect(service.validateInvitation(token)).rejects.toThrow('expired');
    });
  });
});



