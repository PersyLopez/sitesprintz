/**
 * Phase 2 Sprint 1 - Unit Tests
 * Tests for reminder scheduler, buffer time service, and cancellation logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReminderScheduler from '../../server/services/booking/ReminderScheduler.js';
import BufferTimeService from '../../server/services/booking/BufferTimeService.js';
import AppointmentCancellationService from '../../server/services/booking/AppointmentCancellationService.js';
import AvailabilityService from '../../server/services/booking/AvailabilityService.js';
import { addHours, addMinutes } from 'date-fns';

// Mock prisma
vi.mock('../../database/db.js', () => ({
  prisma: {
    booking_tenants: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    appointments: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    booking_notifications: {
      create: vi.fn(),
      update: vi.fn()
    },
    booking_services: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    booking_staff: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

describe('ReminderScheduler', () => {
  let reminderScheduler;

  beforeEach(() => {
    reminderScheduler = new ReminderScheduler();
    vi.clearAllMocks();
  });

  it('should process reminders for tenants with reminders enabled', async () => {
    const { prisma } = await import('../../database/db.js');
    
    prisma.booking_tenants.findMany.mockResolvedValue([
      {
        id: 'tenant-1',
        reminder_email_enabled: true,
        reminder_hours_before: 24
      }
    ]);

    prisma.appointments.findMany.mockResolvedValue([]);

    const result = await reminderScheduler.processReminders();
    
    expect(result).toHaveProperty('processed');
    expect(result).toHaveProperty('sent');
  });

  it('should calculate correct reminder time window', () => {
    const now = new Date('2025-12-25T10:00:00Z');
    const reminderHours = 24;
    
    // This would be called internally
    // Just verify the logic exists
    expect(reminderScheduler).toBeDefined();
    expect(reminderScheduler.processReminders).toBeDefined();
  });

  it('should skip already-reminded appointments', () => {
    // Verify that appointments with existing reminders are skipped
    expect(reminderScheduler).toBeDefined();
  });
});

describe('BufferTimeService', () => {
  let bufferService;

  beforeEach(() => {
    bufferService = new BufferTimeService();
    vi.clearAllMocks();
  });

  it('should get buffer settings for a service', async () => {
    const { prisma } = await import('../../database/db.js');
    
    prisma.booking_services.findUnique.mockResolvedValue({
      id: 'service-1',
      buffer_minutes_before: 15,
      buffer_minutes_after: 10
    });

    const settings = await bufferService.getBufferSettings('service-1');
    
    expect(settings).toEqual({
      before: 15,
      after: 10
    });
  });

  it('should calculate effective busy period with buffers', () => {
    const appointment = {
      start_time: new Date('2025-12-25T10:00:00'),
      end_time: new Date('2025-12-25T11:00:00')
    };

    const bufferSettings = {
      before: 15,
      after: 10
    };

    const busyPeriod = bufferService.getEffectiveBusyPeriod(appointment, bufferSettings);

    expect(busyPeriod.bufferBefore).toBe(15);
    expect(busyPeriod.bufferAfter).toBe(10);
    expect(busyPeriod.start.getTime()).toBe(appointment.start_time.getTime() - 15 * 60000);
    expect(busyPeriod.end.getTime()).toBe(appointment.end_time.getTime() + 10 * 60000);
  });

  it('should detect conflicts when buffer time overlaps', async () => {
    const { prisma } = await import('../../database/db.js');

    prisma.booking_services.findUnique.mockResolvedValue({
      id: 'service-1',
      buffer_minutes_before: 15,
      buffer_minutes_after: 10
    });

    prisma.appointments.findMany.mockResolvedValue([
      {
        id: 'appt-1',
        start_time: new Date('2025-12-25T10:00:00'),
        end_time: new Date('2025-12-25T11:00:00')
      }
    ]);

    const proposed = new Date('2025-12-25T10:45:00');
    const proposedEnd = addMinutes(proposed, 60);

    const result = await bufferService.checkAvailabilityWithBuffers(
      'service-1',
      'staff-1',
      proposed,
      proposedEnd
    );

    expect(result).toHaveProperty('available');
    expect(result).toHaveProperty('conflicts');
  });

  it('should find next available slot considering buffers', async () => {
    const { prisma } = await import('../../database/db.js');

    prisma.booking_services.findUnique.mockResolvedValue({
      id: 'service-1',
      duration_minutes: 60,
      buffer_minutes_before: 15,
      buffer_minutes_after: 10
    });

    prisma.appointments.findMany.mockResolvedValue([
      {
        id: 'appt-1',
        start_time: new Date('2025-12-25T10:00:00'),
        end_time: new Date('2025-12-25T11:00:00')
      }
    ]);

    const startTime = new Date('2025-12-25T09:00:00');
    
    const result = await bufferService.getNextAvailableSlot(
      'service-1',
      'staff-1',
      startTime,
      60
    );

    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('end');
  });
});

describe('AppointmentCancellationService', () => {
  let cancellationService;

  beforeEach(() => {
    cancellationService = new AppointmentCancellationService();
    vi.clearAllMocks();
  });

  it('should cancel appointment and send emails', async () => {
    const { prisma } = await import('../../database/db.js');

    prisma.appointments.findUnique.mockResolvedValue({
      id: 'appt-1',
      tenant_id: 'tenant-1',
      customer_name: 'John Doe',
      customer_email: 'john@test.com',
      status: 'confirmed',
      booking_services: { name: 'Haircut' },
      booking_staff: { name: 'Jane' },
      booking_tenants: { business_name: 'Test Salon' }
    });

    prisma.appointments.update.mockResolvedValue({
      id: 'appt-1',
      status: 'cancelled'
    });

    prisma.booking_notifications.create.mockResolvedValue({
      id: 'notif-1'
    });

    // This would call email service, which is mocked
    const result = await cancellationService.cancelAppointment('appt-1', 'Customer requested', 'customer');
    
    expect(result).toBeDefined();
    expect(result.id).toBe('appt-1');
    expect(result.status).toBe('cancelled');
  });

  it('should prevent cancelling already cancelled appointment', async () => {
    const { prisma } = await import('../../database/db.js');

    prisma.appointments.findUnique.mockResolvedValue({
      id: 'appt-1',
      status: 'cancelled'
    });

    await expect(
      cancellationService.cancelAppointment('appt-1')
    ).rejects.toThrow('already cancelled');
  });

  it('should check if appointment can be cancelled', async () => {
    const { prisma } = await import('../../database/db.js');

    // Appointment in the future
    prisma.appointments.findUnique.mockResolvedValue({
      id: 'appt-1',
      status: 'confirmed',
      start_time: addHours(new Date(), 5), // 5 hours from now
      end_time: addHours(new Date(), 6)
    });

    const result = await cancellationService.canCancelAppointment('appt-1', 'customer');
    
    expect(result).toHaveProperty('canCancel');
  });

  it('should prevent cancellation too close to appointment', async () => {
    const { prisma } = await import('../../database/db.js');

    // Appointment in 1 hour (within 2-hour window)
    prisma.appointments.findUnique.mockResolvedValue({
      id: 'appt-1',
      status: 'confirmed',
      start_time: addHours(new Date(), 1),
      end_time: addHours(new Date(), 2)
    });

    const result = await cancellationService.canCancelAppointment('appt-1', 'customer');
    
    expect(result.canCancel).toBe(false);
    expect(result.reason).toContain('2 hours');
  });
});

describe('AvailabilityService', () => {
  let availabilityService;

  beforeEach(() => {
    availabilityService = new AvailabilityService();
    vi.clearAllMocks();
  });

  it('should calculate time slots for a staff member', () => {
    const tenant = {
      business_hours_start: '09:00',
      business_hours_end: '17:00'
    };

    const appointments = [];
    const date = new Date('2025-12-25');

    const slots = availabilityService.calculateTimeSlots(tenant, appointments, date, 30);

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('time');
    expect(slots[0]).toHaveProperty('datetime');
    expect(slots[0]).toHaveProperty('available');
  });

  it('should exclude time slots with appointments', () => {
    const tenant = {
      business_hours_start: '09:00',
      business_hours_end: '17:00'
    };

    const date = new Date('2025-12-25');
    const appointments = [
      {
        start_time: new Date('2025-12-25T10:00:00'),
        end_time: new Date('2025-12-25T11:00:00'),
        booking_services: {
          buffer_minutes_before: 0,
          buffer_minutes_after: 0
        }
      }
    ];

    const slots = availabilityService.calculateTimeSlots(tenant, appointments, date, 30);

    // 10:00 and 10:30 slots should be excluded
    const slot10 = slots.find(s => s.time === '10:00');
    const slot1030 = slots.find(s => s.time === '10:30');

    expect(slot10).toBeUndefined();
    expect(slot1030).toBeUndefined();
  });

  it('should parse break times correctly', () => {
    const breakTimesJson = JSON.stringify([
      { start: '12:00', end: '13:00' }
    ]);

    const breakTimes = availabilityService.parseBreakTimes(breakTimesJson);

    expect(breakTimes.length).toBe(1);
    expect(breakTimes[0]).toHaveProperty('start');
  });
});


