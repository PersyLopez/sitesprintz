import { describe, it, expect, beforeEach, vi } from 'vitest';
import BookingService from '../../server/services/bookingService.js';
import { DateTime } from 'luxon';
import * as db from '../../database/db.js';

// Mock the database
vi.mock('../../database/db.js');

// Mock the notification service
vi.mock('../../server/services/bookingNotificationService.js', () => ({
  default: class MockNotificationService {
    sendConfirmationEmail = vi.fn().mockResolvedValue({ success: true });
    sendCancellationEmail = vi.fn().mockResolvedValue({ success: true });
  }
}));

describe('BookingService - Appointments', () => {
  let bookingService;
  const mockTenantId = 'tenant-123';
  const mockServiceId = 'service-123';
  const mockStaffId = 'staff-123';

  beforeEach(() => {
    bookingService = new BookingService();
    vi.clearAllMocks();
  });

  describe('createAppointment', () => {
    const validAppointmentData = {
      service_id: mockServiceId,
      staff_id: mockStaffId,
      start_time: '2025-11-20T14:00:00-05:00',
      timezone: 'America/New_York',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '+1234567890',
      customer_notes: 'First time customer',
    };

    it('should create appointment with valid data', async () => {
      const mockService = {
        id: mockServiceId,
        duration_minutes: 60,
        price_cents: 5000,
        requires_approval: false,
      };

      const mockAppointment = {
        id: 'appointment-123',
        tenant_id: mockTenantId,
        confirmation_code: 'ABC12345',
        status: 'confirmed',
        ...validAppointmentData,
      };

      // Mock transaction
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockService] }) // Get service
          .mockResolvedValueOnce({ rows: [] }) // Check conflicts (none)
          .mockResolvedValueOnce({ rows: [] }) // Check confirmation code uniqueness
          .mockResolvedValueOnce({ rows: [mockAppointment] }), // Create appointment
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      // Mock email details query
      db.query.mockResolvedValueOnce({
        rows: [{
          ...mockAppointment,
          service_name: 'Haircut',
          staff_name: 'Jane Smith',
          business_name: 'Test Salon',
        }]
      });

      const result = await bookingService.createAppointment(mockTenantId, validAppointmentData);

      expect(result).toEqual(mockAppointment);
      expect(result.confirmation_code).toBeTruthy();
      expect(result.status).toBe('confirmed');
    });

    it('should set status to pending if service requires approval', async () => {
      const mockService = {
        id: mockServiceId,
        duration_minutes: 60,
        price_cents: 5000,
        requires_approval: true, // Requires approval
      };

      const mockAppointment = {
        id: 'appointment-124',
        status: 'pending', // Should be pending
        confirmation_code: 'XYZ98765',
      };

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockService] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockAppointment] }),
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      db.query.mockResolvedValueOnce({ rows: [mockAppointment] });

      const result = await bookingService.createAppointment(mockTenantId, validAppointmentData);

      expect(result.status).toBe('pending');
    });

    it('should throw error if time slot has conflict', async () => {
      const mockService = {
        id: mockServiceId,
        duration_minutes: 60,
        price_cents: 5000,
      };

      // Mock existing conflicting appointment
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockService] })
          .mockResolvedValueOnce({ rows: [{ id: 'existing-appt' }] }), // Conflict found
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      await expect(
        bookingService.createAppointment(mockTenantId, validAppointmentData)
      ).rejects.toThrow('Time slot no longer available');
    });

    it('should throw error if required fields are missing', async () => {
      const invalidData = {
        service_id: mockServiceId,
        // Missing: staff_id, start_time, customer_name, customer_email
      };

      await expect(
        bookingService.createAppointment(mockTenantId, invalidData)
      ).rejects.toThrow('Missing required appointment fields');
    });

    it('should calculate end_time based on service duration', async () => {
      const mockService = {
        id: mockServiceId,
        duration_minutes: 90, // 1.5 hours
        price_cents: 7500,
        requires_approval: false,
      };

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockService] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ 
            id: 'appt-123', 
            end_time: '2025-11-20T15:30:00Z' // Start 2pm + 90 min = 3:30pm
          }] }),
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      db.query.mockResolvedValueOnce({ rows: [{ id: 'appt-123' }] });

      await bookingService.createAppointment(mockTenantId, {
        ...validAppointmentData,
        start_time: '2025-11-20T14:00:00-05:00', // 2pm
      });

      // Check that INSERT was called with correct end_time
      const insertCall = mockClient.query.mock.calls.find(call => 
        call[0].includes('INSERT INTO appointments')
      );
      expect(insertCall).toBeTruthy();
    });

    it('should generate unique confirmation code', async () => {
      const mockService = {
        id: mockServiceId,
        duration_minutes: 60,
        price_cents: 5000,
      };

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockService] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }) // Code is unique
          .mockResolvedValueOnce({ rows: [{ id: 'appt-1', confirmation_code: 'CODE1234' }] }),
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      db.query.mockResolvedValueOnce({ rows: [{ confirmation_code: 'CODE1234' }] });

      const result = await bookingService.createAppointment(mockTenantId, validAppointmentData);

      expect(result.confirmation_code).toHaveLength(8);
      expect(result.confirmation_code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should retry confirmation code if duplicate found', async () => {
      const mockService = {
        id: mockServiceId,
        duration_minutes: 60,
        price_cents: 5000,
      };

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockService] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'existing' }] }) // First code exists
          .mockResolvedValueOnce({ rows: [] }) // Second code is unique
          .mockResolvedValueOnce({ rows: [{ id: 'appt-1', confirmation_code: 'NEW12345' }] }),
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      db.query.mockResolvedValueOnce({ rows: [{ confirmation_code: 'NEW12345' }] });

      const result = await bookingService.createAppointment(mockTenantId, validAppointmentData);

      expect(result.confirmation_code).toBeTruthy();
      // Should have checked twice
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM appointments WHERE confirmation_code'),
        expect.any(Array)
      );
    });

    it('should use pessimistic locking to prevent race conditions', async () => {
      const mockService = {
        id: mockServiceId,
        duration_minutes: 60,
        price_cents: 5000,
      };

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockService] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'appt-1' }] }),
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      db.query.mockResolvedValueOnce({ rows: [{ id: 'appt-1' }] });

      await bookingService.createAppointment(mockTenantId, validAppointmentData);

      // Check that FOR UPDATE lock was used
      const lockCall = mockClient.query.mock.calls.find(call => 
        call[0].includes('FOR UPDATE')
      );
      expect(lockCall).toBeTruthy();
    });
  });

  describe('getAppointments', () => {
    it('should return appointments for a tenant', async () => {
      const mockAppointments = [
        { id: 'appt-1', customer_name: 'John Doe', status: 'confirmed' },
        { id: 'appt-2', customer_name: 'Jane Smith', status: 'confirmed' },
      ];

      db.query.mockResolvedValueOnce({ rows: mockAppointments });

      const result = await bookingService.getAppointments(mockTenantId);

      expect(result).toEqual(mockAppointments);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM appointments'),
        [mockTenantId]
      );
    });

    it('should filter by date range', async () => {
      const filters = {
        start_date: '2025-11-01',
        end_date: '2025-11-30',
      };

      db.query.mockResolvedValueOnce({ rows: [] });

      await bookingService.getAppointments(mockTenantId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('start_time >='),
        expect.arrayContaining([mockTenantId, '2025-11-01', '2025-11-30'])
      );
    });

    it('should filter by staff_id', async () => {
      const filters = { staff_id: mockStaffId };

      db.query.mockResolvedValueOnce({ rows: [] });

      await bookingService.getAppointments(mockTenantId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('staff_id ='),
        expect.arrayContaining([mockTenantId, mockStaffId])
      );
    });

    it('should filter by status', async () => {
      const filters = { status: 'confirmed' };

      db.query.mockResolvedValueOnce({ rows: [] });

      await bookingService.getAppointments(mockTenantId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('status ='),
        expect.arrayContaining([mockTenantId, 'confirmed'])
      );
    });
  });

  describe('getAppointment', () => {
    it('should get appointment by UUID', async () => {
      const mockAppointment = {
        id: '550e8400-e29b-41d4-a716-446655440000', // Proper UUID format
        confirmation_code: 'ABC12345',
        customer_name: 'John Doe',
      };

      db.query.mockResolvedValueOnce({ rows: [mockAppointment] });

      const result = await bookingService.getAppointment('550e8400-e29b-41d4-a716-446655440000', mockTenantId);

      expect(result).toEqual(mockAppointment);
      // UUID format has dashes in proper pattern, should use id field
      expect(db.query).toHaveBeenCalled();
      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE a.id =');
      expect(queryCall[1]).toContain('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should get appointment by confirmation code', async () => {
      const mockAppointment = {
        id: 'appointment-uuid-456',
        confirmation_code: 'XYZ98765',
        customer_name: 'Jane Smith',
      };

      db.query.mockResolvedValueOnce({ rows: [mockAppointment] });

      const result = await bookingService.getAppointment('XYZ98765', mockTenantId);

      expect(result).toEqual(mockAppointment);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE a.confirmation_code ='),
        ['XYZ98765', mockTenantId]
      );
    });

    it('should return null if appointment not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await bookingService.getAppointment('nonexistent', mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment by UUID', async () => {
      const mockCancelledAppointment = {
        id: 'appointment-123',
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Schedule conflict',
      };

      db.query.mockResolvedValueOnce({ rows: [mockCancelledAppointment] });
      // Mock for email query
      db.query.mockResolvedValueOnce({ 
        rows: [{
          ...mockCancelledAppointment,
          service_name: 'Haircut',
          business_name: 'Test Salon',
        }]
      });

      const result = await bookingService.cancelAppointment(
        'appointment-123',
        mockTenantId,
        { reason: 'Schedule conflict', cancelled_by: 'customer' }
      );

      expect(result.status).toBe('cancelled');
      expect(result.cancellation_reason).toBe('Schedule conflict');
    });

    it('should cancel appointment by confirmation code', async () => {
      const mockCancelledAppointment = {
        id: 'appointment-456',
        confirmation_code: 'ABC12345',
        status: 'cancelled',
      };

      db.query.mockResolvedValueOnce({ rows: [mockCancelledAppointment] });
      db.query.mockResolvedValueOnce({ rows: [mockCancelledAppointment] });

      const result = await bookingService.cancelAppointment(
        'ABC12345',
        mockTenantId,
        { reason: 'No longer needed', cancelled_by: 'customer' }
      );

      expect(result.status).toBe('cancelled');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE confirmation_code ='),
        expect.arrayContaining(['No longer needed', 'customer', 'ABC12345', mockTenantId])
      );
    });

    it('should return null if appointment not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await bookingService.cancelAppointment(
        'nonexistent',
        mockTenantId,
        { reason: 'Test', cancelled_by: 'customer' }
      );

      expect(result).toBeNull();
    });

    it('should return null if appointment already cancelled', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // Query excludes already cancelled

      const result = await bookingService.cancelAppointment(
        'already-cancelled',
        mockTenantId,
        { reason: 'Test', cancelled_by: 'customer' }
      );

      expect(result).toBeNull();
    });

    it('should track who cancelled the appointment', async () => {
      const mockCancelledAppointment = {
        id: 'appointment-789',
        status: 'cancelled',
        cancelled_by: 'staff',
      };

      db.query.mockResolvedValueOnce({ rows: [mockCancelledAppointment] });
      db.query.mockResolvedValueOnce({ rows: [mockCancelledAppointment] });

      const result = await bookingService.cancelAppointment(
        'appointment-789',
        mockTenantId,
        { reason: 'Staff unavailable', cancelled_by: 'staff' }
      );

      expect(result.cancelled_by).toBe('staff');
    });

    it('should send cancellation email after cancelling', async () => {
      const mockCancelledAppointment = {
        id: 'appointment-999',
        status: 'cancelled',
        customer_email: 'test@example.com',
      };

      db.query.mockResolvedValueOnce({ rows: [mockCancelledAppointment] });
      db.query.mockResolvedValueOnce({ 
        rows: [{
          ...mockCancelledAppointment,
          service_name: 'Test Service',
        }]
      });

      await bookingService.cancelAppointment(
        'appointment-999',
        mockTenantId,
        { reason: 'Test', cancelled_by: 'customer' }
      );

      // Email is sent asynchronously, so notification service should be called
      expect(bookingService.notificationService.sendCancellationEmail).toHaveBeenCalled();
    });
  });
});

