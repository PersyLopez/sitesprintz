import { describe, it, expect, beforeEach, vi } from 'vitest';
import BookingNotificationService from '../../server/services/bookingNotificationService.js';
import { DateTime } from 'luxon';
import * as db from '../../database/db.js';

// Mock the database
vi.mock('../../database/db.js');

// Mock the email service
let mockSendEmail;
vi.mock('../../email-service.js', () => ({
  sendEmail: vi.fn(),
}));

describe('BookingNotificationService', () => {
  let notificationService;

  beforeEach(async () => {
    notificationService = new BookingNotificationService();
    vi.clearAllMocks();
    
    // Get mock sendEmail function
    const emailServiceModule = await import('../../email-service.js');
    mockSendEmail = emailServiceModule.sendEmail;
  });

  describe('formatDateTime', () => {
    it('should format ISO date to human-readable format', () => {
      const isoDate = '2025-11-20T14:00:00Z';
      const timezone = 'America/New_York';

      const result = notificationService.formatDateTime(isoDate, timezone);

      expect(result.date).toMatch(/November 20, 2025/);
      expect(result.time).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
      expect(result.datetime).toBeTruthy();
      expect(result.timezone).toBeTruthy();
    });

    it('should handle different timezones correctly', () => {
      const isoDate = '2025-11-20T14:00:00Z'; // 2pm UTC

      const estResult = notificationService.formatDateTime(isoDate, 'America/New_York');
      const pstResult = notificationService.formatDateTime(isoDate, 'America/Los_Angeles');

      // EST is UTC-5, PST is UTC-8
      expect(estResult.time).toMatch(/9:00 AM/);
      expect(pstResult.time).toMatch(/6:00 AM/);
    });

    it('should format full datetime string correctly', () => {
      const isoDate = '2025-11-20T14:00:00Z';
      const timezone = 'America/New_York';

      const result = notificationService.formatDateTime(isoDate, timezone);

      expect(result.datetime).toContain('November');
      expect(result.datetime).toContain('2025');
      expect(result.datetime).toContain('at');
    });
  });

  describe('formatPrice', () => {
    it('should format cents to USD currency', () => {
      const result = notificationService.formatPrice(5000, 'USD');
      expect(result).toBe('$50.00');
    });

    it('should handle zero price', () => {
      const result = notificationService.formatPrice(0, 'USD');
      expect(result).toBe('$0.00');
    });

    it('should format large amounts correctly', () => {
      const result = notificationService.formatPrice(123456, 'USD');
      expect(result).toBe('$1,234.56');
    });

    it('should handle cents correctly', () => {
      const result = notificationService.formatPrice(1999, 'USD');
      expect(result).toBe('$19.99');
    });
  });

  describe('sendConfirmationEmail', () => {
    const mockAppointmentData = {
      confirmation_code: 'ABC12345',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      start_time: '2025-11-20T14:00:00Z',
      end_time: '2025-11-20T15:00:00Z',
      timezone: 'America/New_York',
      service_name: 'Haircut',
      staff_name: 'Jane Smith',
      total_price_cents: 5000,
      requires_approval: false,
      tenant_id: 'tenant-123',
      appointment_id: 'appt-123',
      business_name: 'Test Salon',
      business_email: 'salon@example.com',
      business_phone: '+1234567890',
    };

    it('should send confirmation email with correct data', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true, id: 'email-123' });
      db.query.mockResolvedValueOnce({ rows: [{ id: 'notif-123' }] });

      const result = await notificationService.sendConfirmationEmail(mockAppointmentData);

      expect(mockSendEmail).toHaveBeenCalledWith(
        'john@example.com',
        expect.stringContaining('Appointment Confirmed'),
        expect.stringContaining('ABC12345')
      );
      expect(result.success).toBe(true);
    });

    it('should include appointment details in email', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      await notificationService.sendConfirmationEmail(mockAppointmentData);

      const emailCall = mockSendEmail.mock.calls[0];
      const htmlContent = emailCall[2];

      expect(htmlContent).toContain('ABC12345'); // Confirmation code
      expect(htmlContent).toContain('John Doe'); // Customer name
      expect(htmlContent).toContain('Haircut'); // Service name
      expect(htmlContent).toContain('Jane Smith'); // Staff name
      expect(htmlContent).toContain('$50.00'); // Price
    });

    it('should send different message if requires approval', async () => {
      const pendingData = {
        ...mockAppointmentData,
        requires_approval: true,
      };

      mockSendEmail.mockResolvedValueOnce({ success: true });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      await notificationService.sendConfirmationEmail(pendingData);

      const emailCall = mockSendEmail.mock.calls[0];
      const subject = emailCall[1];
      const htmlContent = emailCall[2];

      expect(subject).toContain('Request Received');
      expect(htmlContent).toContain('request'); // Email uses "request" not "pending"
      expect(htmlContent).toContain('review');
    });

    it('should log notification to database', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true, id: 'email-123' });
      db.query.mockResolvedValueOnce({ rows: [{ id: 'notif-123' }] });

      await notificationService.sendConfirmationEmail(mockAppointmentData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO booking_notifications'),
        expect.arrayContaining([
          'tenant-123',
          'appt-123',
          'confirmation',
          'email',
          'john@example.com',
          expect.any(String), // subject
          expect.any(String), // message
          'sent',
          'resend',
          'email-123',
        ])
      );
    });

    it('should handle email send failure gracefully', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: false, error: 'SMTP error' });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      const result = await notificationService.sendConfirmationEmail(mockAppointmentData);

      expect(result.success).toBe(false);
      
      // Should still log the failure
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO booking_notifications'),
        expect.arrayContaining(['failed', expect.stringContaining('SMTP error')])
      );
    });

    it('should include business contact information', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      await notificationService.sendConfirmationEmail(mockAppointmentData);

      const htmlContent = mockSendEmail.mock.calls[0][2];

      expect(htmlContent).toContain('Test Salon');
      expect(htmlContent).toContain('+1234567890');
      expect(htmlContent).toContain('salon@example.com');
    });
  });

  describe('sendCancellationEmail', () => {
    const mockCancelData = {
      confirmation_code: 'XYZ98765',
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      start_time: '2025-11-25T10:00:00Z',
      timezone: 'America/New_York',
      service_name: 'Massage',
      cancellation_reason: 'Schedule conflict',
      cancelled_by: 'customer',
      tenant_id: 'tenant-456',
      appointment_id: 'appt-456',
      business_name: 'Spa Wellness',
      business_phone: '+1987654321',
    };

    it('should send cancellation email with correct data', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true, id: 'email-456' });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      const result = await notificationService.sendCancellationEmail(mockCancelData);

      expect(mockSendEmail).toHaveBeenCalledWith(
        'jane@example.com',
        expect.stringContaining('Cancelled'),
        expect.stringContaining('XYZ98765')
      );
      expect(result.success).toBe(true);
    });

    it('should include cancellation reason in email', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      await notificationService.sendCancellationEmail(mockCancelData);

      const htmlContent = mockSendEmail.mock.calls[0][2];

      expect(htmlContent).toContain('Schedule conflict');
    });

    it('should show who cancelled the appointment', async () => {
      const staffCancelled = {
        ...mockCancelData,
        cancelled_by: 'staff',
      };

      mockSendEmail.mockResolvedValueOnce({ success: true });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      await notificationService.sendCancellationEmail(staffCancelled);

      const htmlContent = mockSendEmail.mock.calls[0][2];

      expect(htmlContent).toContain('by the business');
    });

    it('should log cancellation notification', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true, id: 'email-789' });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      await notificationService.sendCancellationEmail(mockCancelData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO booking_notifications'),
        expect.arrayContaining([
          'tenant-456',
          'appt-456',
          'cancellation',
          'email',
          'jane@example.com',
        ])
      );
    });
  });

  describe('sendReminderEmail', () => {
    const mockReminderData = {
      confirmation_code: 'REM12345',
      customer_name: 'Bob Johnson',
      customer_email: 'bob@example.com',
      start_time: '2025-11-21T09:00:00Z',
      timezone: 'America/New_York',
      service_name: 'Consultation',
      staff_name: 'Dr. Smith',
      tenant_id: 'tenant-789',
      appointment_id: 'appt-789',
      business_name: 'Medical Clinic',
      business_phone: '+1555555555',
    };

    it('should send reminder email', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      const result = await notificationService.sendReminderEmail(mockReminderData);

      expect(mockSendEmail).toHaveBeenCalledWith(
        'bob@example.com',
        expect.stringContaining('Reminder'),
        expect.stringContaining('REM12345')
      );
      expect(result.success).toBe(true);
    });

    it('should emphasize appointment is tomorrow', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      await notificationService.sendReminderEmail(mockReminderData);

      const htmlContent = mockSendEmail.mock.calls[0][2];

      expect(htmlContent).toContain('tomorrow');
    });

    it('should log reminder notification', async () => {
      mockSendEmail.mockResolvedValueOnce({ success: true });
      db.query.mockResolvedValueOnce({ rows: [{}] });

      await notificationService.sendReminderEmail(mockReminderData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO booking_notifications'),
        expect.arrayContaining(['reminder', 'email'])
      );
    });
  });

  describe('logNotification', () => {
    it('should log notification to database', async () => {
      const notificationData = {
        tenant_id: 'tenant-123',
        appointment_id: 'appt-123',
        type: 'confirmation',
        channel: 'email',
        recipient_email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test Message',
        status: 'sent',
        provider: 'resend',
        provider_message_id: 'msg-123',
        error_message: null,
      };

      db.query.mockResolvedValueOnce({ 
        rows: [{ id: 'notif-123', ...notificationData }] 
      });

      const result = await notificationService.logNotification(notificationData);

      expect(result).toBeTruthy();
      expect(result.id).toBe('notif-123');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO booking_notifications'),
        expect.any(Array)
      );
    });

    it('should handle database logging failure gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await notificationService.logNotification({
        tenant_id: 'tenant-123',
        type: 'confirmation',
        channel: 'email',
      });

      // Should not throw, returns null
      expect(result).toBeNull();
    });
  });

  describe('getNotificationHistory', () => {
    it('should retrieve notification history for appointment', async () => {
      const mockHistory = [
        { id: 'notif-1', type: 'confirmation', status: 'sent' },
        { id: 'notif-2', type: 'reminder', status: 'sent' },
      ];

      db.query.mockResolvedValueOnce({ rows: mockHistory });

      const result = await notificationService.getNotificationHistory('appt-123');

      expect(result).toEqual(mockHistory);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM booking_notifications'),
        ['appt-123']
      );
    });

    it('should return empty array if no history found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.getNotificationHistory('appt-999');

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await notificationService.getNotificationHistory('appt-123');

      expect(result).toEqual([]);
    });
  });
});

