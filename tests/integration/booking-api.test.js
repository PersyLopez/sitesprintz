import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bookingRoutes from '../../server/routes/booking.routes.js';
import * as db from '../../database/db.js';

// Mock dependencies
vi.mock('../../database/db.js');
vi.mock('../../server/services/bookingNotificationService.js', () => ({
  default: class MockNotificationService {
    sendConfirmationEmail = vi.fn().mockResolvedValue({ success: true });
    sendCancellationEmail = vi.fn().mockResolvedValue({ success: true });
  }
}));

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

  describe('GET /api/booking/tenants/:userId/services', () => {
    it('should return list of services for a tenant', async () => {
      const mockTenant = {
        id: 'tenant-123',
        user_id: 1,
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
        },
        {
          id: 'service-2',
          name: 'Massage',
          description: 'Relaxing massage',
          duration_minutes: 90,
          price_cents: 8000,
          category: 'wellness',
        },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] }) // Get tenant
        .mockResolvedValueOnce({ rows: mockServices }); // Get services

      const response = await request(app)
        .get('/api/booking/tenants/1/services')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toHaveLength(2);
      expect(response.body.services[0].name).toBe('Haircut');
      expect(response.body.services[0].price_display).toBe('$50.00');
      expect(response.body.services[1].price_display).toBe('$80.00');
    });

    it('should return empty array if no services found', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 'tenant-123' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/booking/tenants/1/services')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/booking/tenants/1/services')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('GET /api/booking/tenants/:userId/availability', () => {
    it('should return available time slots', async () => {
      const mockTenant = { id: 'tenant-123' };
      const mockStaff = { id: 'staff-123' };
      const mockService = {
        id: 'service-123',
        duration_minutes: 60,
        price_cents: 5000,
      };
      const mockSlots = [
        {
          start_time: '2025-11-20T14:00:00Z',
          end_time: '2025-11-20T15:00:00Z',
          display_time: '9:00 AM',
          available: true,
        },
        {
          start_time: '2025-11-20T15:00:00Z',
          end_time: '2025-11-20T16:00:00Z',
          display_time: '10:00 AM',
          available: true,
        },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] }) // Get tenant
        .mockResolvedValueOnce({ rows: [mockStaff] }) // Get/create staff
        .mockResolvedValueOnce({ rows: [mockService] }) // Get service
        .mockResolvedValueOnce({ rows: [mockStaff] }) // Get staff details
        .mockResolvedValueOnce({ rows: [{ day_of_week: 3, start_time: '09:00', end_time: '17:00' }] }) // Availability
        .mockResolvedValueOnce({ rows: [] }); // No existing appointments

      const response = await request(app)
        .get('/api/booking/tenants/1/availability')
        .query({
          service_id: 'service-123',
          date: '2025-11-20',
          timezone: 'America/New_York',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.slots).toBeDefined();
      expect(Array.isArray(response.body.slots)).toBe(true);
    });

    it('should return 400 if required params missing', async () => {
      const response = await request(app)
        .get('/api/booking/tenants/1/availability')
        .query({ service_id: 'service-123' }) // Missing date
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/booking/tenants/:userId/appointments', () => {
    it('should create a new appointment', async () => {
      const appointmentData = {
        service_id: 'service-123',
        start_time: '2025-11-20T14:00:00-05:00',
        timezone: 'America/New_York',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '+1234567890',
      };

      const mockTenant = { id: 'tenant-123' };
      const mockStaff = { id: 'staff-123' };
      const mockAppointment = {
        id: 'appt-123',
        confirmation_code: 'ABC12345',
        status: 'confirmed',
        ...appointmentData,
      };

      // Mock transaction callback
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 'service-123', duration_minutes: 60, price_cents: 5000, requires_approval: false }] })
          .mockResolvedValueOnce({ rows: [] }) // No conflicts
          .mockResolvedValueOnce({ rows: [] }) // Confirmation code unique
          .mockResolvedValueOnce({ rows: [mockAppointment] }), // Create appointment
      };

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] }) // Get tenant
        .mockResolvedValueOnce({ rows: [mockStaff] }) // Get/create staff
        .mockResolvedValueOnce({ rows: [mockAppointment] }); // Get appointment details for email

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const response = await request(app)
        .post('/api/booking/tenants/1/appointments')
        .send(appointmentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.appointment).toBeDefined();
      expect(response.body.appointment.confirmation_code).toBeTruthy();
      expect(response.body.appointment.status).toBe('confirmed');
      expect(response.body.message).toContain('confirmed');
    });

    it('should return 400 if required fields missing', async () => {
      const invalidData = {
        service_id: 'service-123',
        // Missing: start_time, customer_name, customer_email
      };

      const response = await request(app)
        .post('/api/booking/tenants/1/appointments')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required field');
    });

    it('should return 409 if time slot is no longer available', async () => {
      const mockTenant = { id: 'tenant-123' };
      const mockStaff = { id: 'staff-123' };

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 'service-123', duration_minutes: 60, price_cents: 5000 }] })
          .mockResolvedValueOnce({ rows: [{ id: 'existing-appt' }] }), // Conflict found
      };

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] })
        .mockResolvedValueOnce({ rows: [mockStaff] });

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const response = await request(app)
        .post('/api/booking/tenants/1/appointments')
        .send({
          service_id: 'service-123',
          start_time: '2025-11-20T14:00:00-05:00',
          timezone: 'America/New_York',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('no longer available');
    });
  });

  describe('GET /api/booking/tenants/:userId/appointments/:identifier', () => {
    it('should get appointment by confirmation code', async () => {
      const mockTenant = { id: 'tenant-123' };
      const mockAppointment = {
        id: 'appt-123',
        confirmation_code: 'ABC12345',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        service_name: 'Haircut',
        staff_name: 'Jane Smith',
      };

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] })
        .mockResolvedValueOnce({ rows: [mockAppointment] });

      const response = await request(app)
        .get('/api/booking/tenants/1/appointments/ABC12345')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.appointment).toBeDefined();
      expect(response.body.appointment.confirmation_code).toBe('ABC12345');
    });

    it('should return 404 if appointment not found', async () => {
      const mockTenant = { id: 'tenant-123' };

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/booking/tenants/1/appointments/NOTFOUND')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/booking/tenants/:userId/appointments/:identifier', () => {
    it('should cancel appointment', async () => {
      const mockTenant = { id: 'tenant-123' };
      const mockCancelledAppointment = {
        id: 'appt-123',
        confirmation_code: 'ABC12345',
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      };

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] })
        .mockResolvedValueOnce({ rows: [mockCancelledAppointment] }) // Cancel
        .mockResolvedValueOnce({ rows: [mockCancelledAppointment] }); // Get for email

      const response = await request(app)
        .delete('/api/booking/tenants/1/appointments/ABC12345')
        .send({ reason: 'Schedule conflict' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled successfully');
      expect(response.body.appointment.status).toBe('cancelled');
    });

    it('should return 404 if appointment not found', async () => {
      const mockTenant = { id: 'tenant-123' };

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/booking/tenants/1/appointments/NOTFOUND')
        .send({ reason: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Admin Endpoints - POST /api/booking/admin/:userId/services', () => {
    it('should create a new service (admin)', async () => {
      const serviceData = {
        name: 'New Service',
        description: 'Test service',
        duration_minutes: 45,
        price_cents: 4500,
        category: 'test',
      };

      const mockTenant = { id: 'tenant-123' };
      const mockService = {
        id: 'service-new',
        ...serviceData,
        status: 'active',
      };

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] })
        .mockResolvedValueOnce({ rows: [mockService] });

      const response = await request(app)
        .post('/api/booking/admin/1/services')
        .send(serviceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.service).toBeDefined();
      expect(response.body.service.name).toBe('New Service');
    });
  });

  describe('Admin Endpoints - GET /api/booking/admin/:userId/appointments', () => {
    it('should return list of appointments with filters', async () => {
      const mockTenant = { id: 'tenant-123' };
      const mockAppointments = [
        {
          id: 'appt-1',
          customer_name: 'John Doe',
          service_name: 'Haircut',
          status: 'confirmed',
        },
        {
          id: 'appt-2',
          customer_name: 'Jane Smith',
          service_name: 'Massage',
          status: 'confirmed',
        },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [mockTenant] })
        .mockResolvedValueOnce({ rows: mockAppointments });

      const response = await request(app)
        .get('/api/booking/admin/1/appointments')
        .query({
          start_date: '2025-11-01',
          end_date: '2025-11-30',
          status: 'confirmed',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.appointments).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/booking/tenants/1/services')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should validate input data types', async () => {
      const response = await request(app)
        .post('/api/booking/tenants/invalid/appointments')
        .send({
          service_id: 'service-123',
          start_time: 'invalid-date',
          customer_name: 'Test',
          customer_email: 'test@example.com',
        });

      // Should still process but may fail during booking creation
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

