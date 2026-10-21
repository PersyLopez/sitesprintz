import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Use vi.hoisted to create mock functions that are available during mock hoisting
const { mockPrisma, mockNotificationService } = vi.hoisted(() => {
  const mockPrisma = {
    booking_tenants: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    booking_services: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    booking_staff: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    booking_availability_rules: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    booking_appointments: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // Also need 'appointments' (without booking_ prefix) for global lookups
    appointments: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    users: {
      findUnique: vi.fn(),
    },
    sites: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn()),
  };

  const mockNotificationService = {
    sendConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
    sendCancellationEmail: vi.fn().mockResolvedValue({ success: true }),
    sendReminderEmail: vi.fn().mockResolvedValue({ success: true }),
  };

  return { mockPrisma, mockNotificationService };
});

// Mock Prisma
vi.mock('../../database/db.js', () => ({
  prisma: mockPrisma,
}));

// Mock notification service
vi.mock('../../server/services/bookingNotificationService.js', () => ({
  default: class MockNotificationService {
    sendConfirmationEmail = mockNotificationService.sendConfirmationEmail;
    sendCancellationEmail = mockNotificationService.sendCancellationEmail;
    sendReminderEmail = mockNotificationService.sendReminderEmail;
  }
}));

// Mock auth middleware
vi.mock('../../server/middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 'user-123', email: 'test@example.com', role: 'user' };
    next();
  },
}));

// Import after mocks
import bookingRoutes from '../../server/routes/booking.routes.js';

describe('Booking API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/booking', bookingRoutes);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== PUBLIC ENDPOINTS ====================

  describe('GET /api/booking/tenants/:userId/services', () => {
    const OWNER_UUID = '9f1c3b2a-7c4d-4e8a-9b2f-1a6e5d3c7b90';
    const TENANT_UUID = '2b8e4f61-9a3c-4d7b-8e5f-0c1d2a3b4e5f';
    const growthUser = { id: 'user-123', plan: 'growth', subscription_plan: 'growth' };

    function mockOwnerPathServices({ services, site = { user_id: 'user-123', id: 'site-1' }, tenant = { id: 'tenant-123', user_id: 'user-123' } }) {
      mockPrisma.sites.findFirst.mockResolvedValue(site);
      mockPrisma.users.findUnique.mockResolvedValue(growthUser);
      mockPrisma.booking_tenants.findFirst.mockResolvedValue(tenant);
      mockPrisma.booking_services.findMany.mockResolvedValue(services);
    }

    it('should return list of services for a tenant', async () => {
      const mockTenant = {
        id: 'tenant-123',
        user_id: 'user-123',
        business_name: 'Test Business',
      };

      const mockServices = [
        {
          id: 'service-1',
          name: 'Haircut',
          description: 'Professional haircut',
          duration_minutes: 60,
          price_cents: 5000,
          category: 'hair',
          online_booking_enabled: true,
          requires_approval: false,
        },
        {
          id: 'service-2',
          name: 'Massage',
          description: 'Relaxing massage',
          duration_minutes: 90,
          price_cents: 8000,
          category: 'wellness',
          online_booking_enabled: true,
          requires_approval: false,
        },
      ];

      mockOwnerPathServices({ tenant: mockTenant, services: mockServices });

      const response = await request(app)
        .get('/api/booking/tenants/user-123/services')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toHaveLength(2);
      expect(response.body.services[0].name).toBe('Haircut');
      expect(response.body.services[0].price_display).toBe('$50.00');
    });

    it('should return 200 with the owner services for a real owner UUID on Growth', async () => {
      mockPrisma.booking_tenants.findUnique.mockResolvedValue(null);
      mockPrisma.users.findUnique.mockResolvedValue(growthUser);
      mockPrisma.booking_tenants.findFirst.mockResolvedValue({ id: 'tenant-123', user_id: OWNER_UUID });
      mockPrisma.booking_services.findMany.mockResolvedValue([
        { id: 'service-1', name: 'Haircut', price_cents: 5000, duration_minutes: 60 },
      ]);

      const response = await request(app)
        .get(`/api/booking/tenants/${OWNER_UUID}/services`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toHaveLength(1);
      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: OWNER_UUID } })
      );
    });

    it('should return 200 with that tenant services when the id is a booking tenant UUID', async () => {
      mockPrisma.booking_tenants.findUnique.mockResolvedValue({ id: TENANT_UUID });
      mockPrisma.booking_services.findMany.mockResolvedValue([
        { id: 'service-1', name: 'Haircut', price_cents: 5000, duration_minutes: 60 },
      ]);

      // A mismatched siteId must not turn into a 500.
      const response = await request(app)
        .get(`/api/booking/tenants/${TENANT_UUID}/services?siteId=other-site`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toHaveLength(1);
      expect(mockPrisma.users.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.booking_tenants.create).not.toHaveBeenCalled();
    });

    it('should resolve a non-UUID subdomain to the published site owner', async () => {
      mockOwnerPathServices({
        site: { user_id: OWNER_UUID, id: 'site-1' },
        services: [{ id: 'service-1', name: 'Haircut', price_cents: 5000, duration_minutes: 60 }],
      });

      const response = await request(app)
        .get('/api/booking/tenants/gallery-salon/services')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toHaveLength(1);
      expect(mockPrisma.sites.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subdomain: 'gallery-salon', status: 'published' },
        })
      );
      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: OWNER_UUID } })
      );
    });

    it('should return 200 with an empty list when the subdomain has no site', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/booking/tenants/gallery-salon/services')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toEqual([]);
      expect(mockPrisma.users.findUnique).not.toHaveBeenCalled();
    });

    it('should return empty array if no services found', async () => {
      mockOwnerPathServices({ services: [] });

      const response = await request(app)
        .get('/api/booking/tenants/user-123/services')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toEqual([]);
    });

    it('should create tenant if not exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', plan: 'growth', subscription_plan: 'growth' };
      const mockNewTenant = { id: 'new-tenant', user_id: 'user-123' };

      mockPrisma.sites.findFirst.mockResolvedValue({ user_id: 'user-123', id: 'site-1' });
      mockPrisma.booking_tenants.findFirst.mockResolvedValue(null);
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      mockPrisma.booking_tenants.create.mockResolvedValue(mockNewTenant);
      mockPrisma.booking_services.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/booking/tenants/user-123/services')
        .expect(200);

      expect(mockPrisma.booking_tenants.create).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/booking/tenants/:userId/staff', () => {
    const OWNER_UUID = '9f1c3b2a-7c4d-4e8a-9b2f-1a6e5d3c7b90';
    const TENANT_UUID = '2b8e4f61-9a3c-4d7b-8e5f-0c1d2a3b4e5f';
    const growthUser = { id: 'user-123', plan: 'growth', subscription_plan: 'growth' };

    it('should return 200 with that tenant staff when the id is a booking tenant UUID', async () => {
      mockPrisma.booking_tenants.findUnique.mockResolvedValue({ id: TENANT_UUID });
      mockPrisma.booking_staff.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.booking_availability_rules.count.mockResolvedValue(1);
      mockPrisma.booking_staff.findMany.mockResolvedValue([
        { id: 'staff-1', name: 'John Staff' },
      ]);

      // A mismatched siteId must not turn into a 500.
      const response = await request(app)
        .get(`/api/booking/tenants/${TENANT_UUID}/staff?siteId=other-site`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.staff).toHaveLength(1);
      expect(mockPrisma.users.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.booking_tenants.create).not.toHaveBeenCalled();
    });

    it('should return 200 with an empty staff list when the subdomain has no site', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/booking/tenants/gallery-salon/staff')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.staff).toEqual([]);
      expect(mockPrisma.users.findUnique).not.toHaveBeenCalled();
    });

    it('should return 200 with the owner staff for a real owner UUID on Growth', async () => {
      mockPrisma.booking_tenants.findUnique.mockResolvedValue(null);
      mockPrisma.users.findUnique.mockResolvedValue(growthUser);
      mockPrisma.booking_tenants.findFirst.mockResolvedValue({ id: 'tenant-123', user_id: OWNER_UUID });
      mockPrisma.booking_staff.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.booking_availability_rules.count.mockResolvedValue(1);
      mockPrisma.booking_staff.findMany.mockResolvedValue([
        { id: 'staff-1', name: 'John Staff' },
      ]);

      const response = await request(app)
        .get(`/api/booking/tenants/${OWNER_UUID}/staff`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.staff).toHaveLength(1);
      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: OWNER_UUID } })
      );
    });
  });

  describe('GET /api/booking/tenants/:userId/availability', () => {
    const OWNER_UUID = '9f1c3b2a-7c4d-4e8a-9b2f-1a6e5d3c7b90';
    const TENANT_UUID = '2b8e4f61-9a3c-4d7b-8e5f-0c1d2a3b4e5f';
    const growthUser = { id: 'user-123', plan: 'growth', subscription_plan: 'growth' };

    it('should return 400 if service_id is missing for a real owner', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(growthUser);

      const response = await request(app)
        .get(`/api/booking/tenants/${OWNER_UUID}/availability?date=2024-01-15`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 if date is missing for a real owner', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(growthUser);

      const response = await request(app)
        .get(`/api/booking/tenants/${OWNER_UUID}/availability?service_id=service-1`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return 200 with empty slots when the subdomain has no site', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/booking/tenants/gallery-salon/availability?service_id=service-1&date=2024-01-15')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.slots).toEqual([]);
      expect(response.body.total_slots).toBe(0);
      expect(mockPrisma.users.findUnique).not.toHaveBeenCalled();
    });

    it('should compute availability for that tenant when the id is a booking tenant UUID', async () => {
      mockPrisma.booking_tenants.findUnique.mockResolvedValue({ id: TENANT_UUID });
      mockPrisma.booking_staff.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.booking_availability_rules.count.mockResolvedValue(1);
      mockPrisma.booking_services.findUnique.mockResolvedValue({
        id: 'service-1',
        duration_minutes: 60,
        buffer_minutes_before: 0,
        buffer_minutes_after: 0,
      });
      mockPrisma.booking_staff.findUnique.mockResolvedValue({
        id: 'staff-1',
        buffer_time_after: 0,
        min_advance_booking_hours: 2,
        max_advance_booking_days: 90,
      });
      mockPrisma.booking_availability_rules.findFirst.mockResolvedValue({
        is_available: true,
        start_time: new Date('1970-01-01T09:00:00Z'),
        end_time: new Date('1970-01-01T17:00:00Z'),
      });
      mockPrisma.appointments.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/booking/tenants/${TENANT_UUID}/availability?service_id=service-1&date=2026-11-15`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.staff_id).toBe('staff-1');
      expect(response.body.slots.length).toBeGreaterThan(0);
      expect(response.body.total_slots).toBe(response.body.slots.length);
      expect(mockPrisma.users.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.booking_tenants.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/booking/tenants/:userId/appointments', () => {
    const OWNER_UUID = '9f1c3b2a-7c4d-4e8a-9b2f-1a6e5d3c7b90';
    const TENANT_UUID = '2b8e4f61-9a3c-4d7b-8e5f-0c1d2a3b4e5f';
    const growthUser = { id: OWNER_UUID, plan: 'growth', subscription_plan: 'growth' };

    it('should resolve a published subdomain to its owner before the plan check', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({ user_id: OWNER_UUID, id: 'site-1' });
      mockPrisma.users.findUnique.mockResolvedValue(growthUser);

      const response = await request(app)
        .post('/api/booking/tenants/gallery-salon/appointments')
        .send({
          service_id: 'service-1',
          // Missing start_time, customer_name, customer_email
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: OWNER_UUID } })
      );
    });

    it('should return 404 for an unknown subdomain without creating anything', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/booking/tenants/no-such-shop/appointments')
        .send({
          service_id: 'service-1',
          start_time: '2026-11-01T10:00:00Z',
          customer_name: 'Jane Doe',
          customer_email: 'jane@example.com',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(mockPrisma.booking_tenants.create).not.toHaveBeenCalled();
      expect(mockPrisma.users.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing for a Growth owner UUID', async () => {
      mockPrisma.booking_tenants.findUnique.mockResolvedValue(null);
      mockPrisma.users.findUnique.mockResolvedValue(growthUser);

      const response = await request(app)
        .post(`/api/booking/tenants/${OWNER_UUID}/appointments`)
        .send({
          service_id: 'service-1',
          // Missing start_time, customer_name, customer_email
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return 403 GROWTH_PLAN_REQUIRED when the owner is not on Growth', async () => {
      mockPrisma.booking_tenants.findUnique.mockResolvedValue(null);
      mockPrisma.users.findUnique.mockResolvedValue({
        id: OWNER_UUID,
        plan: 'starter',
        subscription_plan: 'starter',
      });

      const response = await request(app)
        .post(`/api/booking/tenants/${OWNER_UUID}/appointments`)
        .send({
          service_id: 'service-1',
          start_time: '2026-11-01T10:00:00Z',
          customer_name: 'Jane Doe',
          customer_email: 'jane@example.com',
        })
        .expect(403);

      expect(response.body.code).toBe('GROWTH_PLAN_REQUIRED');
      expect(mockPrisma.booking_tenants.create).not.toHaveBeenCalled();
      expect(mockPrisma.booking_appointments.create).not.toHaveBeenCalled();
    });

    it('should skip the plan check for a booking tenant UUID and still validate fields', async () => {
      mockPrisma.booking_tenants.findUnique.mockResolvedValue({ id: TENANT_UUID });

      const response = await request(app)
        .post(`/api/booking/tenants/${TENANT_UUID}/appointments`)
        .send({
          service_id: 'service-1',
          // Missing start_time, customer_name, customer_email
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
      expect(mockPrisma.users.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/booking/tenants/:userId/appointments/:identifier', () => {
    it('should return 404 if appointment not found', async () => {
      mockPrisma.booking_tenants.findFirst.mockResolvedValue({ id: 'tenant-123' });
      mockPrisma.booking_appointments.findFirst.mockResolvedValue(null);
      // Self-contained: do not rely on a growth-user mock left over from an earlier test
      mockPrisma.users.findUnique.mockResolvedValue({ id: 'user-123', plan: 'growth', subscription_plan: 'growth' });

      const response = await request(app)
        .get('/api/booking/tenants/user-123/appointments/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GLOBAL LOOKUP ENDPOINTS ====================

  describe('GET /api/booking/appointments/:identifier', () => {
    it('should find appointment by confirmation code globally', async () => {
      const mockAppointment = {
        id: 'apt-123',
        confirmation_code: 'ABC12345',
        status: 'confirmed',
        customer_name: 'John Doe',
        booking_services: { name: 'Haircut', duration_minutes: 60, price_cents: 5000 },
        booking_staff: { name: 'John Staff', email: 'staff@example.com' },
        booking_tenants: { business_name: 'Test Business' },
      };

      // Global lookup uses 'appointments' table
      mockPrisma.appointments.findFirst.mockResolvedValue(mockAppointment);

      const response = await request(app)
        .get('/api/booking/appointments/ABC12345')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.appointment.confirmation_code).toBe('ABC12345');
    });

    it('should return 404 if appointment not found', async () => {
      mockPrisma.appointments.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/booking/appointments/NOTFOUND')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.sites.findFirst.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/booking/tenants/user-123/services')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
