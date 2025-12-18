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
      create: vi.fn(),
    },
    booking_availability_rules: {
      findMany: vi.fn(),
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

      mockPrisma.booking_tenants.findFirst.mockResolvedValue(mockTenant);
      mockPrisma.booking_services.findMany.mockResolvedValue(mockServices);

      const response = await request(app)
        .get('/api/booking/tenants/user-123/services')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toHaveLength(2);
      expect(response.body.services[0].name).toBe('Haircut');
      expect(response.body.services[0].price_display).toBe('$50.00');
    });

    it('should return empty array if no services found', async () => {
      mockPrisma.booking_tenants.findFirst.mockResolvedValue({ id: 'tenant-123', user_id: 'user-123' });
      mockPrisma.booking_services.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/booking/tenants/user-123/services')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toEqual([]);
    });

    it('should create tenant if not exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockNewTenant = { id: 'new-tenant', user_id: 'user-123' };

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

  describe('GET /api/booking/tenants/:userId/availability', () => {
    it('should return 400 if service_id is missing', async () => {
      const response = await request(app)
        .get('/api/booking/tenants/user-123/availability?date=2024-01-15')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 if date is missing', async () => {
      const response = await request(app)
        .get('/api/booking/tenants/user-123/availability?service_id=service-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/booking/tenants/:userId/appointments', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/booking/tenants/user-123/appointments')
        .send({
          service_id: 'service-1',
          // Missing start_time, customer_name, customer_email
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/booking/tenants/:userId/appointments/:identifier', () => {
    it('should return 404 if appointment not found', async () => {
      mockPrisma.booking_tenants.findFirst.mockResolvedValue({ id: 'tenant-123' });
      mockPrisma.booking_appointments.findFirst.mockResolvedValue(null);

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
      mockPrisma.booking_tenants.findFirst.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/booking/tenants/user-123/services')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
