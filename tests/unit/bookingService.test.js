import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BookingService from '../../server/services/bookingService.js';
import { prisma } from '../../database/db.js';
import { createMockPrisma, seedPrismaData, resetPrismaMocks } from '../mocks/prisma.js';

// Use global Prisma mock from setup.js
// The setup.js already mocks database/db.js with Prisma

// Mock the notification service
vi.mock('../../server/services/bookingNotificationService.js', () => ({
  default: class MockNotificationService {
    sendConfirmationEmail = vi.fn().mockResolvedValue({ success: true });
    sendCancellationEmail = vi.fn().mockResolvedValue({ success: true });
  }
}));

describe('BookingService - Tenant & Service Management', () => {
  let bookingService;

  beforeEach(() => {
    bookingService = new BookingService();
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  describe('getOrCreateTenant', () => {
    it('should return existing tenant if found', async () => {
      const mockTenant = {
        id: 'tenant-123',
        user_id: 1,
        business_name: 'Test Business',
        email: 'test@example.com',
        site_id: 'site-123',
        status: 'active'
      };

      vi.mocked(prisma.booking_tenants.findFirst).mockResolvedValueOnce(mockTenant);

      const result = await bookingService.getOrCreateTenant(1, 'site-123');

      expect(result).toEqual(mockTenant);
      expect(prisma.booking_tenants.findFirst).toHaveBeenCalledWith({
        where: { user_id: 1 }
      });
    });

    it('should create new tenant if not found', async () => {
      const mockUser = { 
        id: 2,
        email: 'newuser@example.com' 
      };
      const mockNewTenant = {
        id: 'tenant-456',
        user_id: 2,
        business_name: 'My Business',
        email: 'newuser@example.com',
        site_id: 'site-456',
        status: 'active'
      };

      // No existing tenant
      vi.mocked(prisma.booking_tenants.findFirst).mockResolvedValueOnce(null);
      // Get user
      vi.mocked(prisma.users.findUnique).mockResolvedValueOnce(mockUser);
      // Create tenant
      vi.mocked(prisma.booking_tenants.create).mockResolvedValueOnce(mockNewTenant);

      const result = await bookingService.getOrCreateTenant(2, 'site-456');

      expect(result).toEqual(mockNewTenant);
      expect(prisma.booking_tenants.findFirst).toHaveBeenCalled();
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { id: 2 }
      });
      expect(prisma.booking_tenants.create).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      // No tenant
      vi.mocked(prisma.booking_tenants.findFirst).mockResolvedValueOnce(null);
      // No user
      vi.mocked(prisma.users.findUnique).mockResolvedValueOnce(null);

      await expect(
        bookingService.getOrCreateTenant(999, 'site-999')
      ).rejects.toThrow('User not found');
    });
  });

  describe('createService', () => {
    const mockTenantId = 'tenant-123';

    it('should create a service with valid data', async () => {
      const serviceData = {
        name: 'Haircut',
        description: 'Professional haircut',
        category: 'hair',
        duration_minutes: 60,
        price_cents: 5000,
      };

      const mockService = {
        id: 'service-123',
        tenant_id: mockTenantId,
        ...serviceData,
        status: 'active',
      };

      vi.mocked(prisma.booking_services.create).mockResolvedValueOnce(mockService);

      const result = await bookingService.createService(mockTenantId, serviceData);

      expect(result).toEqual(mockService);
      expect(prisma.booking_services.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: mockTenantId,
          name: 'Haircut',
          description: 'Professional haircut',
          category: 'hair',
          duration_minutes: 60,
          price_cents: 5000,
        })
      });
    });

    it('should throw error if name is missing', async () => {
      const invalidData = {
        duration_minutes: 60,
      };

      await expect(
        bookingService.createService(mockTenantId, invalidData)
      ).rejects.toThrow('Service name is required');
    });

    it('should throw error if duration is invalid', async () => {
      const invalidData = {
        name: 'Test Service',
        duration_minutes: 0, // Invalid: too short
      };

      await expect(
        bookingService.createService(mockTenantId, invalidData)
      ).rejects.toThrow('Duration must be between 1 and 480 minutes');
    });

    it('should throw error if duration exceeds maximum', async () => {
      const invalidData = {
        name: 'Test Service',
        duration_minutes: 500, // Invalid: too long
      };

      await expect(
        bookingService.createService(mockTenantId, invalidData)
      ).rejects.toThrow('Duration must be between 1 and 480 minutes');
    });

    it('should use defaults for optional fields', async () => {
      const minimalData = {
        name: 'Basic Service',
        duration_minutes: 30,
      };

      const mockService = {
        id: 'service-456',
        tenant_id: mockTenantId,
        ...minimalData,
        description: '',
        category: 'general',
        price_cents: 0,
        online_booking_enabled: true,
        requires_approval: false,
        status: 'active',
      };

      db.query.mockResolvedValueOnce({ rows: [mockService] });

      const result = await bookingService.createService(mockTenantId, minimalData);

      expect(result.price_cents).toBe(0);
      expect(result.online_booking_enabled).toBe(true);
      expect(result.requires_approval).toBe(false);
    });
  });

  describe('getServices', () => {
    const mockTenantId = 'tenant-123';

    it('should return only active services by default', async () => {
      const mockServices = [
        { id: 'service-1', name: 'Service 1', status: 'active' },
        { id: 'service-2', name: 'Service 2', status: 'active' },
      ];

      db.query.mockResolvedValueOnce({ rows: mockServices });

      const result = await bookingService.getServices(mockTenantId);

      expect(result).toEqual(mockServices);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = $2"),
        [mockTenantId, 'active']
      );
    });

    it('should return all services when includeInactive is true', async () => {
      const mockServices = [
        { id: 'service-1', name: 'Service 1', status: 'active' },
        { id: 'service-2', name: 'Service 2', status: 'inactive' },
      ];

      db.query.mockResolvedValueOnce({ rows: mockServices });

      const result = await bookingService.getServices(mockTenantId, true);

      expect(result).toEqual(mockServices);
      expect(db.query).toHaveBeenCalledWith(
        expect.not.stringContaining("status = $2"),
        [mockTenantId]
      );
    });
  });

  describe('getService', () => {
    const mockTenantId = 'tenant-123';
    const mockServiceId = 'service-123';

    it('should return service if found', async () => {
      const mockService = {
        id: mockServiceId,
        tenant_id: mockTenantId,
        name: 'Test Service',
      };

      db.query.mockResolvedValueOnce({ rows: [mockService] });

      const result = await bookingService.getService(mockServiceId, mockTenantId);

      expect(result).toEqual(mockService);
    });

    it('should return null if service not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await bookingService.getService('nonexistent', mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('updateService', () => {
    const mockTenantId = 'tenant-123';
    const mockServiceId = 'service-123';

    it('should update service with valid data', async () => {
      const updateData = {
        name: 'Updated Service',
        price_cents: 7500,
      };

      const mockUpdatedService = {
        id: mockServiceId,
        tenant_id: mockTenantId,
        ...updateData,
      };

      db.query.mockResolvedValueOnce({ rows: [mockUpdatedService] });

      const result = await bookingService.updateService(
        mockServiceId,
        mockTenantId,
        updateData
      );

      expect(result).toEqual(mockUpdatedService);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE booking_services'),
        expect.arrayContaining(['Updated Service', 7500, mockServiceId, mockTenantId])
      );
    });

    it('should return null if service not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await bookingService.updateService(
        'nonexistent',
        mockTenantId,
        { name: 'Test' }
      );

      expect(result).toBeNull();
    });

    it('should throw error if no fields to update', async () => {
      await expect(
        bookingService.updateService(mockServiceId, mockTenantId, {})
      ).rejects.toThrow('No fields to update');
    });

    it('should only update allowed fields', async () => {
      const updateData = {
        name: 'Updated',
        invalid_field: 'should be ignored',
        price_cents: 5000,
      };

      const mockUpdatedService = {
        id: mockServiceId,
        name: 'Updated',
        price_cents: 5000,
      };

      db.query.mockResolvedValueOnce({ rows: [mockUpdatedService] });

      await bookingService.updateService(mockServiceId, mockTenantId, updateData);

      // Query should only include allowed fields
      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).not.toContain('invalid_field');
    });
  });

  describe('deleteService', () => {
    const mockTenantId = 'tenant-123';
    const mockServiceId = 'service-123';

    it('should soft delete service (set status to inactive)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: mockServiceId, status: 'inactive' }] });

      const result = await bookingService.deleteService(mockServiceId, mockTenantId);

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'inactive'"),
        [mockServiceId, mockTenantId]
      );
    });

    it('should return false if service not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await bookingService.deleteService('nonexistent', mockTenantId);

      expect(result).toBe(false);
    });
  });

  describe('getOrCreateDefaultStaff', () => {
    const mockTenantId = 'tenant-123';

    it('should return existing staff if found', async () => {
      const mockStaff = {
        id: 'staff-123',
        tenant_id: mockTenantId,
        name: 'John Doe',
      };

      db.query.mockResolvedValueOnce({ rows: [mockStaff] });

      const result = await bookingService.getOrCreateDefaultStaff(mockTenantId);

      expect(result).toEqual(mockStaff);
    });

    it('should create default staff if none exists', async () => {
      const mockTenant = {
        business_name: 'Test Business',
        email: 'test@example.com',
      };

      const mockNewStaff = {
        id: 'staff-456',
        tenant_id: mockTenantId,
        name: 'Test Business',
        email: 'test@example.com',
        is_primary: true,
      };

      db.query.mockResolvedValueOnce({ rows: [] }); // No existing staff
      db.query.mockResolvedValueOnce({ rows: [mockTenant] }); // Get tenant
      db.query.mockResolvedValueOnce({ rows: [mockNewStaff] }); // Create staff

      const result = await bookingService.getOrCreateDefaultStaff(mockTenantId);

      expect(result).toEqual(mockNewStaff);
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error if tenant not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // No existing staff
      db.query.mockResolvedValueOnce({ rows: [] }); // Tenant not found

      await expect(
        bookingService.getOrCreateDefaultStaff('nonexistent')
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('generateConfirmationCode', () => {
    it('should generate 8-character alphanumeric code', () => {
      const code = bookingService.generateConfirmationCode();

      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(bookingService.generateConfirmationCode());
      }

      // Should have generated at least 95+ unique codes out of 100
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should not include confusing characters', () => {
      const code = bookingService.generateConfirmationCode();

      // Should not contain: I, O, 0, 1, L
      expect(code).not.toMatch(/[IOL01]/);
    });
  });
});

describe('BookingService - Availability Rules', () => {
  let bookingService;

  beforeEach(() => {
    bookingService = new BookingService();
    vi.clearAllMocks();
  });

  describe('setAvailabilityRules', () => {
    const mockTenantId = 'tenant-123';
    const mockStaffId = 'staff-123';

    it('should delete existing rules and create new ones', async () => {
      const scheduleRules = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
        { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
      ];

      const mockCreatedRules = scheduleRules.map((rule, i) => ({
        id: `rule-${i}`,
        staff_id: mockStaffId,
        ...rule,
      }));

      // Mock transaction
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }) // DELETE
          .mockResolvedValueOnce({ rows: [mockCreatedRules[0]] }) // INSERT 1
          .mockResolvedValueOnce({ rows: [mockCreatedRules[1]] }), // INSERT 2
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const result = await bookingService.setAvailabilityRules(
        mockStaffId,
        mockTenantId,
        scheduleRules
      );

      expect(result).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM booking_availability_rules WHERE staff_id = $1',
        [mockStaffId]
      );
      expect(mockClient.query).toHaveBeenCalledTimes(3); // 1 delete + 2 inserts
    });
  });

  describe('getAvailabilityRules', () => {
    const mockStaffId = 'staff-123';

    it('should return availability rules for staff', async () => {
      const mockRules = [
        { id: 'rule-1', day_of_week: 1, start_time: '09:00', end_time: '17:00' },
        { id: 'rule-2', day_of_week: 2, start_time: '09:00', end_time: '17:00' },
      ];

      db.query.mockResolvedValueOnce({ rows: mockRules });

      const result = await bookingService.getAvailabilityRules(mockStaffId);

      expect(result).toEqual(mockRules);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_available = true'),
        [mockStaffId]
      );
    });

    it('should return empty array if no rules found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await bookingService.getAvailabilityRules('nonexistent');

      expect(result).toEqual([]);
    });
  });
});

