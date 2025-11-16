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

describe('BookingService - Availability Algorithm', () => {
  let bookingService;
  const mockTenantId = 'tenant-123';
  const mockServiceId = 'service-123';
  const mockStaffId = 'staff-123';

  beforeEach(() => {
    bookingService = new BookingService();
    vi.clearAllMocks();
  });

  describe('calculateAvailableSlots', () => {
    it('should return available slots for a given date', async () => {
      const date = '2025-11-18'; // Monday
      const timezone = 'America/New_York';

      // Mock service (60 min duration)
      db.query.mockResolvedValueOnce({
        rows: [{
          id: mockServiceId,
          duration_minutes: 60,
          tenant_id: mockTenantId,
        }]
      });

      // Mock staff (no buffer)
      db.query.mockResolvedValueOnce({
        rows: [{
          id: mockStaffId,
          buffer_time_after: 0,
          min_advance_booking_hours: 0,
        }]
      });

      // Mock availability rules (9am-5pm Monday)
      db.query.mockResolvedValueOnce({
        rows: [{
          day_of_week: 1, // Monday
          start_time: '09:00:00',
          end_time: '17:00:00',
        }]
      });

      // Mock no existing appointments
      db.query.mockResolvedValueOnce({ rows: [] });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        date,
        timezone
      );

      // Should have 8 slots (9am-5pm, 60 min each)
      expect(slots.length).toBe(8);
      expect(slots[0].display_time).toMatch(/9:00/);
      expect(slots[7].display_time).toMatch(/4:00/);
    });

    it('should exclude slots that conflict with existing appointments', async () => {
      const date = '2025-11-18'; // Monday
      const timezone = 'America/New_York';

      // Mock service
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });

      // Mock staff
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 0, min_advance_booking_hours: 0 }]
      });

      // Mock availability (9am-5pm)
      db.query.mockResolvedValueOnce({
        rows: [{
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '17:00:00',
        }]
      });

      // Mock existing appointment at 10am-11am
      const existingAppt = {
        start_time: DateTime.fromISO('2025-11-18T10:00:00', { zone: timezone }).toUTC().toISO(),
        end_time: DateTime.fromISO('2025-11-18T11:00:00', { zone: timezone }).toUTC().toISO(),
      };
      db.query.mockResolvedValueOnce({ rows: [existingAppt] });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        date,
        timezone
      );

      // Should have 7 slots (8 total - 1 conflicting)
      expect(slots.length).toBe(7);
      
      // 10am slot should not be available
      const tenAmSlot = slots.find(s => s.display_time === '10:00 AM');
      expect(tenAmSlot).toBeUndefined();
    });

    it('should apply buffer time after appointments', async () => {
      const date = '2025-11-18';
      const timezone = 'America/New_York';

      // Mock service (60 min)
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });

      // Mock staff with 15 min buffer
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 15, min_advance_booking_hours: 0 }]
      });

      // Mock availability (9am-12pm, shorter window for test)
      db.query.mockResolvedValueOnce({
        rows: [{
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '12:00:00',
        }]
      });

      // No existing appointments
      db.query.mockResolvedValueOnce({ rows: [] });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        date,
        timezone
      );

      // With 15min buffer, slots should be 75min apart
      // 9am-12pm (3 hours = 180 min) / 75 min per slot = 2 slots
      expect(slots.length).toBe(2);
    });

    it('should filter out past time slots', async () => {
      const today = DateTime.now().setZone('America/New_York').toISODate();
      const timezone = 'America/New_York';

      // Mock service
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });

      // Mock staff
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 0, min_advance_booking_hours: 0 }]
      });

      // Mock availability (9am-5pm)
      db.query.mockResolvedValueOnce({
        rows: [{
          day_of_week: DateTime.now().setZone(timezone).weekday % 7,
          start_time: '09:00:00',
          end_time: '17:00:00',
        }]
      });

      // No existing appointments
      db.query.mockResolvedValueOnce({ rows: [] });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        today,
        timezone
      );

      // All slots should be in the future
      slots.forEach(slot => {
        const slotTime = DateTime.fromISO(slot.start_time_local);
        expect(slotTime > DateTime.now().setZone(timezone)).toBe(true);
      });
    });

    it('should respect minimum advance booking hours', async () => {
      const tomorrow = DateTime.now().setZone('America/New_York').plus({ days: 1 }).toISODate();
      const timezone = 'America/New_York';

      // Mock service
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });

      // Mock staff with 24 hour minimum advance booking
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 0, min_advance_booking_hours: 24 }]
      });

      // Mock availability (9am-5pm)
      const tomorrowDayOfWeek = DateTime.now().setZone(timezone).plus({ days: 1 }).weekday % 7;
      db.query.mockResolvedValueOnce({
        rows: [{
          day_of_week: tomorrowDayOfWeek,
          start_time: '09:00:00',
          end_time: '17:00:00',
        }]
      });

      // No existing appointments
      db.query.mockResolvedValueOnce({ rows: [] });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        tomorrow,
        timezone
      );

      // Should have no slots (tomorrow is less than 24 hours away)
      // Or limited slots depending on exact time
      slots.forEach(slot => {
        const slotTime = DateTime.fromISO(slot.start_time_local);
        const hoursDiff = slotTime.diff(DateTime.now().setZone(timezone), 'hours').hours;
        expect(hoursDiff).toBeGreaterThan(24);
      });
    });

    it('should return empty array if staff not available on that day', async () => {
      const date = '2025-11-16'; // Sunday
      const timezone = 'America/New_York';

      // Mock service
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });

      // Mock staff
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 0, min_advance_booking_hours: 0 }]
      });

      // Mock availability rules - query filters by day_of_week = 0 (Sunday)
      // Staff only works Mon-Fri (1-5), so query should return empty for Sunday
      db.query.mockResolvedValueOnce({
        rows: [] // No rules for Sunday
      });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        date,
        timezone
      );

      expect(slots).toEqual([]);
    });

    it('should handle multiple availability windows in one day', async () => {
      const date = '2025-11-18';
      const timezone = 'America/New_York';

      // Mock service
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });

      // Mock staff
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 0, min_advance_booking_hours: 0 }]
      });

      // Mock availability: 9am-12pm and 2pm-5pm (lunch break)
      db.query.mockResolvedValueOnce({
        rows: [
          { day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' },
          { day_of_week: 1, start_time: '14:00:00', end_time: '17:00:00' },
        ]
      });

      // No existing appointments
      db.query.mockResolvedValueOnce({ rows: [] });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        date,
        timezone
      );

      // Should have 6 slots total (3 morning + 3 afternoon)
      expect(slots.length).toBe(6);

      // Check that 12pm-2pm has no slots
      const lunchSlot = slots.find(s => s.display_time === '12:00 PM' || s.display_time === '1:00 PM');
      expect(lunchSlot).toBeUndefined();
    });

    it('should handle timezone conversion correctly', async () => {
      const date = '2025-11-18';
      const timezone = 'America/Los_Angeles'; // PST

      // Mock service
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });

      // Mock staff
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 0, min_advance_booking_hours: 0 }]
      });

      // Mock availability (9am-5pm)
      db.query.mockResolvedValueOnce({
        rows: [{
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '17:00:00',
        }]
      });

      // No existing appointments
      db.query.mockResolvedValueOnce({ rows: [] });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        date,
        timezone
      );

      // Verify all times are in specified timezone
      slots.forEach(slot => {
        expect(slot.start_time).toMatch(/Z$/); // UTC format
        expect(slot.start_time_local).toContain('-08:00'); // PST offset
      });
    });

    it('should throw error if service not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // No service

      await expect(
        bookingService.calculateAvailableSlots(
          mockTenantId,
          'nonexistent',
          mockStaffId,
          '2025-11-18',
          'America/New_York'
        )
      ).rejects.toThrow('Service not found');
    });

    it('should throw error if staff not found', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });
      db.query.mockResolvedValueOnce({ rows: [] }); // No staff

      await expect(
        bookingService.calculateAvailableSlots(
          mockTenantId,
          mockServiceId,
          'nonexistent',
          '2025-11-18',
          'America/New_York'
        )
      ).rejects.toThrow('Staff member not found');
    });

    it('should throw error if date is invalid', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 60, tenant_id: mockTenantId }]
      });
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 0 }]
      });

      await expect(
        bookingService.calculateAvailableSlots(
          mockTenantId,
          mockServiceId,
          mockStaffId,
          'invalid-date',
          'America/New_York'
        )
      ).rejects.toThrow('Invalid date format');
    });

    it('should handle edge case: service duration exceeds availability window', async () => {
      const date = '2025-11-18';
      const timezone = 'America/New_York';

      // Mock service with 3-hour duration
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockServiceId, duration_minutes: 180, tenant_id: mockTenantId }]
      });

      // Mock staff
      db.query.mockResolvedValueOnce({
        rows: [{ id: mockStaffId, buffer_time_after: 0, min_advance_booking_hours: 0 }]
      });

      // Mock availability: only 2 hours available
      db.query.mockResolvedValueOnce({
        rows: [{
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '11:00:00',
        }]
      });

      // No existing appointments
      db.query.mockResolvedValueOnce({ rows: [] });

      const slots = await bookingService.calculateAvailableSlots(
        mockTenantId,
        mockServiceId,
        mockStaffId,
        date,
        timezone
      );

      // Should have 0 slots (service too long for window)
      expect(slots).toEqual([]);
    });
  });
});

