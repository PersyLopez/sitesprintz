import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../database/db.js', () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    booking_tenants: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    booking_services: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    booking_staff: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    booking_availability_rules: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  query: vi.fn(),
}));

vi.mock('../../server/services/bookingNotificationService.js', () => ({
  default: class MockNotificationService {
    sendConfirmationEmail = vi.fn().mockResolvedValue({ success: true });
    sendCancellationEmail = vi.fn().mockResolvedValue({ success: true });
  },
}));

import { prisma } from '../../database/db.js';
import BookingService from '../../server/services/bookingService.js';
import AppointmentService from '../../server/services/booking/AppointmentService.js';

function mockAvailabilityTransaction() {
  prisma.$transaction.mockImplementation(async (fn) => {
    const tx = {
      booking_availability_rules: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
          id: `rule-${data.day_of_week}`,
          ...data,
        })),
      },
    };
    return fn(tx);
  });
}

describe('BookingService - Tenant & Service Management', () => {
  let bookingService;

  beforeEach(() => {
    bookingService = new BookingService();
    vi.clearAllMocks();
    prisma.booking_tenants.findUnique.mockResolvedValue({
      payment_enabled: false,
      default_payment_type: 'none',
      default_deposit_percentage: 50,
      users: null,
    });
    mockAvailabilityTransaction();
  });

  describe('getOrCreateTenant', () => {
    it('should return existing tenant if found', async () => {
      const mockTenant = {
        id: 'tenant-123',
        user_id: 1,
        business_name: 'Test Business',
        email: 'test@example.com',
        site_id: 'site-123',
        status: 'active',
      };

      prisma.booking_tenants.findFirst.mockResolvedValueOnce(mockTenant);

      const result = await bookingService.getOrCreateTenant(1, 'site-123');

      expect(result).toEqual(mockTenant);
      expect(prisma.booking_tenants.findFirst).toHaveBeenCalled();
    });

    it('creates a site-scoped tenant instead of reusing another site', async () => {
      const mockUser = { id: 2, email: 'newuser@example.com' };
      const mockNewTenant = {
        id: 'tenant-456',
        user_id: 2,
        business_name: 'My Business',
        email: 'newuser@example.com',
        site_id: 'site-456',
        status: 'active',
      };

      prisma.booking_tenants.findFirst.mockResolvedValueOnce(null);
      prisma.users.findUnique.mockResolvedValueOnce(mockUser);
      prisma.booking_tenants.create.mockResolvedValueOnce(mockNewTenant);

      const result = await bookingService.getOrCreateTenant(2, 'site-456');

      expect(result).toEqual(mockNewTenant);
      expect(prisma.booking_tenants.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 2,
          site_id: 'site-456',
          email: 'newuser@example.com',
        }),
      });
    });

    it('should throw error if user not found', async () => {
      prisma.booking_tenants.findFirst.mockResolvedValueOnce(null);
      prisma.users.findUnique.mockResolvedValueOnce(null);

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

      prisma.booking_services.create.mockResolvedValueOnce(mockService);

      const result = await bookingService.createService(mockTenantId, serviceData);

      expect(result).toEqual(mockService);
      expect(prisma.booking_services.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: mockTenantId,
          name: 'Haircut',
          duration_minutes: 60,
          price_cents: 5000,
        }),
      });
    });

    it('should throw error if name is missing', async () => {
      await expect(
        bookingService.createService(mockTenantId, { duration_minutes: 60 })
      ).rejects.toThrow('Service name is required');
    });

    it('should throw error if duration is invalid', async () => {
      await expect(
        bookingService.createService(mockTenantId, {
          name: 'Test Service',
          duration_minutes: 0,
        })
      ).rejects.toThrow('Duration must be between 1 and 480 minutes');
    });

    it('should throw error if duration exceeds maximum', async () => {
      await expect(
        bookingService.createService(mockTenantId, {
          name: 'Test Service',
          duration_minutes: 500,
        })
      ).rejects.toThrow('Duration must be between 1 and 480 minutes');
    });

    it('should use defaults for optional fields', async () => {
      const mockService = {
        id: 'service-456',
        tenant_id: mockTenantId,
        name: 'Basic Service',
        duration_minutes: 30,
        description: '',
        category: 'general',
        price_cents: 0,
        online_booking_enabled: true,
        requires_approval: false,
        status: 'active',
      };

      prisma.booking_services.create.mockResolvedValueOnce(mockService);

      const result = await bookingService.createService(mockTenantId, {
        name: 'Basic Service',
        duration_minutes: 30,
      });

      expect(result.price_cents).toBe(0);
      expect(result.online_booking_enabled).toBe(true);
      expect(result.requires_approval).toBe(false);
      expect(prisma.booking_services.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: '',
          category: 'general',
          price_cents: 0,
        }),
      });
    });
  });

  describe('getServices', () => {
    const mockTenantId = 'tenant-123';

    it('should return only active services by default', async () => {
      const mockServices = [
        { id: 'service-1', name: 'Service 1', status: 'active' },
        { id: 'service-2', name: 'Service 2', status: 'active' },
      ];

      prisma.booking_services.findMany.mockResolvedValueOnce(mockServices);

      const result = await bookingService.getServices(mockTenantId);

      expect(result).toEqual(mockServices);
      expect(prisma.booking_services.findMany).toHaveBeenCalledWith({
        where: { tenant_id: mockTenantId, status: 'active' },
        orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
      });
    });

    it('should return all services when includeInactive is true', async () => {
      const mockServices = [
        { id: 'service-1', name: 'Service 1', status: 'active' },
        { id: 'service-2', name: 'Service 2', status: 'inactive' },
      ];

      prisma.booking_services.findMany.mockResolvedValueOnce(mockServices);

      const result = await bookingService.getServices(mockTenantId, true);

      expect(result).toEqual(mockServices);
      expect(prisma.booking_services.findMany).toHaveBeenCalledWith({
        where: { tenant_id: mockTenantId },
        orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
      });
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

      prisma.booking_services.findFirst.mockResolvedValueOnce(mockService);

      const result = await bookingService.getService(mockServiceId, mockTenantId);

      expect(result).toEqual(mockService);
    });

    it('should return null if service not found', async () => {
      prisma.booking_services.findFirst.mockResolvedValueOnce(null);

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

      prisma.booking_services.findFirst.mockResolvedValueOnce({ id: mockServiceId });
      prisma.booking_services.update.mockResolvedValueOnce(mockUpdatedService);

      const result = await bookingService.updateService(
        mockServiceId,
        mockTenantId,
        updateData
      );

      expect(result).toEqual(mockUpdatedService);
      expect(prisma.booking_services.update).toHaveBeenCalledWith({
        where: { id: mockServiceId },
        data: expect.objectContaining({
          name: 'Updated Service',
          price_cents: 7500,
        }),
      });
    });

    it('should return null if service not found', async () => {
      prisma.booking_services.findFirst.mockResolvedValueOnce(null);

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
      prisma.booking_services.findFirst.mockResolvedValueOnce({ id: mockServiceId });
      prisma.booking_services.update.mockResolvedValueOnce({
        id: mockServiceId,
        name: 'Updated',
        price_cents: 5000,
      });

      await bookingService.updateService(mockServiceId, mockTenantId, {
        name: 'Updated',
        invalid_field: 'should be ignored',
        price_cents: 5000,
      });

      const data = prisma.booking_services.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('invalid_field');
      expect(data.name).toBe('Updated');
      expect(data.price_cents).toBe(5000);
    });
  });

  describe('deleteService', () => {
    const mockTenantId = 'tenant-123';
    const mockServiceId = 'service-123';

    it('should soft delete service (set status to inactive)', async () => {
      prisma.booking_services.findFirst.mockResolvedValueOnce({ id: mockServiceId });
      prisma.booking_services.update.mockResolvedValueOnce({
        id: mockServiceId,
        status: 'inactive',
      });

      const result = await bookingService.deleteService(mockServiceId, mockTenantId);

      expect(result).toBe(true);
      expect(prisma.booking_services.update).toHaveBeenCalledWith({
        where: { id: mockServiceId },
        data: expect.objectContaining({ status: 'inactive' }),
      });
    });

    it('should return false if service not found', async () => {
      prisma.booking_services.findFirst.mockResolvedValueOnce(null);

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

      prisma.booking_staff.findFirst.mockResolvedValueOnce(mockStaff);
      prisma.booking_availability_rules.count.mockResolvedValueOnce(5);

      const result = await bookingService.getOrCreateDefaultStaff(mockTenantId);

      expect(result).toEqual(mockStaff);
      expect(prisma.booking_staff.create).not.toHaveBeenCalled();
    });

    it('should create default staff if none exists', async () => {
      const mockTenant = {
        id: mockTenantId,
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

      prisma.booking_staff.findFirst.mockResolvedValueOnce(null);
      prisma.booking_tenants.findUnique.mockResolvedValueOnce(mockTenant);
      prisma.booking_staff.create.mockResolvedValueOnce(mockNewStaff);
      prisma.booking_availability_rules.count.mockResolvedValueOnce(0);

      const result = await bookingService.getOrCreateDefaultStaff(mockTenantId);

      expect(result).toEqual(mockNewStaff);
      expect(prisma.booking_staff.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: mockTenantId,
          name: 'Test Business',
          email: 'test@example.com',
          is_primary: true,
        }),
      });
    });

    it('should throw error if tenant not found', async () => {
      prisma.booking_staff.findFirst.mockResolvedValueOnce(null);
      prisma.booking_tenants.findUnique.mockResolvedValueOnce(null);

      await expect(
        bookingService.getOrCreateDefaultStaff('nonexistent')
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('generateConfirmationCode', () => {
    const appointmentService = new AppointmentService({}, {});

    it('should generate 8-character alphanumeric code', () => {
      const code = appointmentService.generateConfirmationCode();

      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(appointmentService.generateConfirmationCode());
      }

      expect(codes.size).toBeGreaterThan(95);
    });

    it('should not include confusing characters', () => {
      const code = appointmentService.generateConfirmationCode();

      expect(code).not.toMatch(/[IOL01]/);
    });
  });
});

describe('BookingService - Availability Rules', () => {
  let bookingService;

  beforeEach(() => {
    bookingService = new BookingService();
    vi.clearAllMocks();
    mockAvailabilityTransaction();
  });

  describe('setAvailabilityRules', () => {
    const mockTenantId = 'tenant-123';
    const mockStaffId = 'staff-123';

    it('should delete existing rules and create new ones', async () => {
      const scheduleRules = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
        { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
      ];

      const result = await bookingService.setAvailabilityRules(
        mockStaffId,
        mockTenantId,
        scheduleRules
      );

      expect(result).toHaveLength(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getAvailabilityRules', () => {
    const mockStaffId = 'staff-123';

    it('should return availability rules for staff', async () => {
      const mockRules = [
        { id: 'rule-1', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
        { id: 'rule-2', day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
      ];

      prisma.booking_availability_rules.findMany.mockResolvedValueOnce(mockRules);

      const result = await bookingService.getAvailabilityRules(mockStaffId);

      expect(result).toEqual(mockRules);
      expect(prisma.booking_availability_rules.findMany).toHaveBeenCalledWith({
        where: { staff_id: mockStaffId, is_available: true },
        orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
      });
    });

    it('should return empty array if no rules found', async () => {
      prisma.booking_availability_rules.findMany.mockResolvedValueOnce([]);

      const result = await bookingService.getAvailabilityRules('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
