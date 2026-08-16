/**
 * Availability Service v2
 * Unified timezone handling, buffer times, service duration, advance windows
 */

import { DateTime } from 'luxon';
import { prisma } from '../../../database/db.js';

export class AvailabilityService {
  /**
   * Calculate available time slots for a service/staff on a given date
   * Accounts for: business hours, existing appointments, buffers, service duration, timezone
   * @param {Object} params
   * @returns {Promise<Array>} Available slots with ISO times
   */
  async calculateAvailableSlots({
    serviceId,
    staffId,
    tenantId,
    date,  // YYYY-MM-DD or DateTime
    timezone = 'America/New_York'
  }) {
    // Parse date in tenant timezone
    const targetDate = typeof date === 'string'
      ? DateTime.fromISO(date, { zone: timezone }).startOf('day')
      : date.startOf('day');

    const nowCheck = DateTime.now().setZone(timezone);
    if (targetDate < nowCheck.startOf('day')) {
      throw new Error('Cannot book in the past');
    }

    // Get service details
    const service = await prisma.booking_services.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    // Get staff details
    const staff = await prisma.booking_staff.findUnique({
      where: { id: staffId }
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    // Get tenant timezone (advance windows live on staff, not tenant)
    const tenant = await prisma.booking_tenants.findUnique({
      where: { id: tenantId },
      select: { timezone: true }
    });

    const tenantTz = tenant?.timezone || timezone;

    // Check advance booking windows
    const now = DateTime.now().setZone(tenantTz);
    const minAdvanceHours = staff.min_advance_booking_hours ?? 2;
    const maxAdvanceDays = staff.max_advance_booking_days ?? 90;
    
    if (targetDate < now.plus({ hours: minAdvanceHours }).startOf('day')) {
      throw new Error(`Bookings must be made at least ${minAdvanceHours} hours in advance`);
    }
    
    if (targetDate > now.plus({ days: maxAdvanceDays }).startOf('day')) {
      throw new Error(`Bookings cannot be made more than ${maxAdvanceDays} days in advance`);
    }

    // Get business hours for this day
    const dayOfWeek = targetDate.weekday % 7; // Luxon: 1-7 (Mon-Sun), convert to 0-6 (Sun-Sat)
    const rule = await prisma.booking_availability_rules.findFirst({
      where: {
        staff_id: staffId,
        day_of_week: dayOfWeek
      }
    });

    if (!rule || !rule.is_available) {
      return []; // Closed this day
    }

    // Parse business hours (stored as Time objects, convert to DateTime for the target day)
    const startTime = DateTime.fromJSDate(rule.start_time, { zone: tenantTz })
      .set({ year: targetDate.year, month: targetDate.month, day: targetDate.day });
    const endTime = DateTime.fromJSDate(rule.end_time, { zone: tenantTz })
      .set({ year: targetDate.year, month: targetDate.month, day: targetDate.day });

    if (!startTime || !endTime || startTime >= endTime) {
      console.warn(`Invalid business hours for staff ${staffId} on day ${dayOfWeek}`);
      return [];
    }

    // Get existing appointments (including pending) for this staff on this day
    const dayStart = targetDate.startOf('day').toUTC();
    const dayEnd = targetDate.endOf('day').toUTC();

    const existing = await prisma.appointments.findMany({
      where: {
        staff_id: staffId,
        start_time: { gte: dayStart },
        end_time: { lte: dayEnd },
        status: { in: ['confirmed', 'pending', 'pending_payment'] }
      },
      select: {
        start_time: true,
        end_time: true,
        duration_minutes: true
      }
    });

    // Build unavailable intervals (existing + buffers)
    const serviceDuration = service.duration_minutes || 60;
    const bufferBefore = service.buffer_minutes_before || 0;
    const bufferAfter = service.buffer_minutes_after || (staff.buffer_time_after || 0);

    const unavailableIntervals = existing.map(apt => ({
      start: DateTime.fromJSDate(apt.start_time, { zone: tenantTz }).minus({ minutes: bufferBefore }),
      end: DateTime.fromJSDate(apt.end_time, { zone: tenantTz }).plus({ minutes: bufferAfter })
    }));

    // Generate 30-minute slot grid and filter available
    const slots = [];
    let current = startTime;
    const slotDuration = 30; // minutes

    while (current.plus({ minutes: serviceDuration }) <= endTime) {
      const slotEnd = current.plus({ minutes: serviceDuration });

      // Check if this slot overlaps any unavailable interval
      const overlaps = unavailableIntervals.some(interval =>
        current < interval.end && slotEnd > interval.start
      );

      if (!overlaps) {
        const startIso = current.toISO();
        slots.push({
          start: startIso,
          end: slotEnd.toISO(),
          start_time: startIso,
          time: current.toFormat('HH:mm'),
          label: current.toLocaleString(DateTime.TIME_SIMPLE, { zone: tenantTz }),
          display_time: current.toLocaleString(DateTime.TIME_SIMPLE, { zone: tenantTz }),
          available: true
        });
      }

      current = current.plus({ minutes: slotDuration });
    }

    return slots;
  }

  /**
   * Check if a specific time slot is available
   * Used at booking time to re-verify slot
   */
  async isSlotAvailable({
    staffId,
    serviceId,
    startTime,  // ISO or DateTime
    tenantId
  }) {
    const service = await prisma.booking_services.findUnique({
      where: { id: serviceId }
    });

    if (!service) throw new Error(`Service not found: ${serviceId}`);

    const startDt = typeof startTime === 'string'
      ? DateTime.fromISO(startTime)
      : startTime;

    const staff = await prisma.booking_staff.findUnique({ where: { id: staffId } });
    const bufferBefore = service.buffer_minutes_before || 0;
    const bufferAfter = service.buffer_minutes_after || (staff?.buffer_time_after || 0);
    const endDt = startDt.plus({ minutes: service.duration_minutes || 60 });
    const windowStart = startDt.minus({ minutes: bufferBefore });
    const windowEnd = endDt.plus({ minutes: bufferAfter });

    // Check for overlapping appointments including buffers
    const conflicts = await prisma.appointments.findMany({
      where: {
        staff_id: staffId,
        status: { in: ['confirmed', 'pending', 'pending_payment'] },
        OR: [
          { start_time: { lt: windowEnd.toJSDate() }, end_time: { gt: windowStart.toJSDate() } }
        ]
      },
      select: { id: true }
    });

    return conflicts.length === 0;
  }

  /**
   * Validate appointment booking against availability rules
   * Throws if invalid
   */
  async validateAppointmentTime({
    staffId,
    serviceId,
    startTime,
    tenantId,
    timezone
  }) {
    const service = await prisma.booking_services.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const staff = await prisma.booking_staff.findUnique({
      where: { id: staffId }
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    const tenant = await prisma.booking_tenants.findUnique({
      where: { id: tenantId }
    });

    const tenantTz = tenant?.timezone || timezone || 'America/New_York';
    const startDt = typeof startTime === 'string'
      ? DateTime.fromISO(startTime, { zone: tenantTz })
      : startTime.setZone?.(tenantTz) || startTime;

    const startLocal = startDt.setZone(tenantTz);
    const now = DateTime.now().setZone(tenantTz);

    // Check advance windows
    const minAdvanceHours = staff.min_advance_booking_hours || 2;
    const maxAdvanceDays = staff.max_advance_booking_days || 90;

    if (startLocal < now.plus({ hours: minAdvanceHours })) {
      throw new Error(`Booking must be at least ${minAdvanceHours} hours in advance`);
    }

    if (startLocal > now.plus({ days: maxAdvanceDays })) {
      throw new Error(`Booking cannot be more than ${maxAdvanceDays} days in advance`);
    }

    // Check if slot is available
    const available = await this.isSlotAvailable({
      staffId,
      serviceId,
      startTime,
      tenantId,
      timezone: tenantTz
    });

    if (!available) {
      throw new Error('Time slot no longer available');
    }

    return true;
  }
}

export const availabilityService = new AvailabilityService();
