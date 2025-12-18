import { prisma } from '../../../database/db.js';
import { DateTime } from 'luxon';

/**
 * Availability Service - Calculates available time slots
 * Single Responsibility: Availability calculation logic
 */
class AvailabilityService {
  constructor(serviceManagementService, staffManagementService) {
    this.serviceManagementService = serviceManagementService;
    this.staffManagementService = staffManagementService;
  }

  /**
   * Calculate available time slots for a given date
   * This is the core availability algorithm
   */
  async calculateAvailableSlots(tenantId, serviceId, staffId, date, timezone = 'America/New_York') {
    try {
      const service = await this.getServiceForAvailability(serviceId, tenantId);
      const staff = await this.getStaffForAvailability(staffId, tenantId);
      const dateInfo = this.parseDateForAvailability(date, timezone);
      const availabilityRules = await this.getAvailabilityRulesForDay(staffId, dateInfo.dayOfWeek);
      
      if (availabilityRules.length === 0) {
        return [];
      }

      const existingAppointments = await this.getAppointmentsForDay(staffId, dateInfo.dayStart, dateInfo.dayEnd);
      
      return this.generateTimeSlots({
        service,
        staff,
        dateInfo,
        availabilityRules,
        existingAppointments,
        timezone
      });
    } catch (error) {
      console.error('Error calculating available slots:', error);
      throw error;
    }
  }

  /**
   * Get service details for availability calculation
   */
  async getServiceForAvailability(serviceId, tenantId) {
    const service = await this.serviceManagementService.getService(serviceId, tenantId);
    if (!service) {
      throw new Error('Service not found');
    }
    return service;
  }

  /**
   * Get staff details for availability calculation
   */
  async getStaffForAvailability(staffId, tenantId) {
    const staff = await prisma.booking_staff.findFirst({
      where: { id: staffId, tenant_id: tenantId }
    });

    if (!staff) {
      throw new Error('Staff member not found');
    }
    return staff;
  }

  /**
   * Parse date and extract availability information
   */
  parseDateForAvailability(date, timezone) {
    const dateObj = DateTime.fromISO(date, { zone: timezone });
    if (!dateObj.isValid) {
      throw new Error('Invalid date format');
    }

    const dayOfWeek = dateObj.weekday % 7; // Convert to 0=Sunday, 6=Saturday
    const dayStart = dateObj.startOf('day').toUTC().toISO();
    const dayEnd = dateObj.endOf('day').toUTC().toISO();

    return {
      dateObj,
      dayOfWeek,
      dayStart,
      dayEnd
    };
  }

  /**
   * Get availability rules for a specific day of week
   */
  async getAvailabilityRulesForDay(staffId, dayOfWeek) {
    const availabilityRulesRaw = await prisma.booking_availability_rules.findMany({
      where: {
        staff_id: staffId,
        day_of_week: dayOfWeek,
        is_available: true
      },
      orderBy: { start_time: 'asc' }
    });

    if (availabilityRulesRaw.length === 0) {
      console.log(`No availability rules found for staff ${staffId} on day ${dayOfWeek}`);
      return [];
    }
    console.log(`Found ${availabilityRulesRaw.length} rules for day ${dayOfWeek}`);

    // Map rules to use string times
    return availabilityRulesRaw.map(rule => ({
      ...rule,
      start_time: rule.start_time.toISOString().split('T')[1].substring(0, 5),
      end_time: rule.end_time.toISOString().split('T')[1].substring(0, 5)
    }));
  }

  /**
   * Get existing appointments for a day
   */
  async getAppointmentsForDay(staffId, dayStart, dayEnd) {
    return await prisma.appointments.findMany({
      where: {
        staff_id: staffId,
        status: { not: 'cancelled' },
        start_time: {
          gte: new Date(dayStart),
          lt: new Date(dayEnd)
        }
      },
      orderBy: { start_time: 'asc' },
      select: { start_time: true, end_time: true }
    });
  }

  /**
   * Generate time slots from availability rules
   */
  generateTimeSlots({ service, staff, dateInfo, availabilityRules, existingAppointments, timezone }) {
    const slots = [];
    const slotDuration = service.duration_minutes;
    const bufferTime = staff.buffer_time_after || 0;
    const totalSlotTime = slotDuration + bufferTime;
    const now = DateTime.now().setZone(timezone);

    for (const rule of availabilityRules) {
      const ruleStart = DateTime.fromISO(
        `${dateInfo.dateObj.toISODate()}T${rule.start_time}`,
        { zone: timezone }
      );
      const ruleEnd = DateTime.fromISO(
        `${dateInfo.dateObj.toISODate()}T${rule.end_time}`,
        { zone: timezone }
      );

      const ruleSlots = this.generateSlotsForRule({
        ruleStart,
        ruleEnd,
        slotDuration,
        totalSlotTime,
        now,
        staff,
        existingAppointments,
        timezone
      });

      slots.push(...ruleSlots);
    }

    return slots;
  }

  /**
   * Generate slots for a single availability rule
   */
  generateSlotsForRule({ ruleStart, ruleEnd, slotDuration, totalSlotTime, now, staff, existingAppointments, timezone }) {
    const slots = [];
    let currentSlotStart = ruleStart;

    while (currentSlotStart.plus({ minutes: slotDuration }) <= ruleEnd) {
      const currentSlotEnd = currentSlotStart.plus({ minutes: slotDuration });

      if (this.isSlotValid(currentSlotStart, currentSlotEnd, now, staff, existingAppointments, timezone)) {
        slots.push({
          start_time: currentSlotStart.toUTC().toISO(),
          end_time: currentSlotEnd.toUTC().toISO(),
          start_time_local: currentSlotStart.toISO(),
          end_time_local: currentSlotEnd.toISO(),
          display_time: currentSlotStart.toFormat('h:mm a'),
          available: true,
        });
      }

      currentSlotStart = currentSlotStart.plus({ minutes: totalSlotTime });
    }

    return slots;
  }

  /**
   * Check if a time slot is valid (not in past, meets advance booking requirements, no conflicts)
   */
  isSlotValid(currentSlotStart, currentSlotEnd, now, staff, existingAppointments, timezone) {
    // Check if slot is in the past
    if (currentSlotEnd <= now) {
      return false;
    }

    // Check min advance booking time
    const minAdvanceHours = staff.min_advance_booking_hours || 0;
    if (currentSlotStart < now.plus({ hours: minAdvanceHours })) {
      return false;
    }

    // Check if slot conflicts with existing appointments
    return !this.hasAppointmentConflict(currentSlotStart, currentSlotEnd, existingAppointments, timezone);
  }

  /**
   * Check if a slot conflicts with existing appointments
   */
  hasAppointmentConflict(currentSlotStart, currentSlotEnd, existingAppointments, timezone) {
    return existingAppointments.some((appt) => {
      const apptStart = DateTime.fromISO(appt.start_time.toISOString(), { zone: 'utc' }).setZone(timezone);
      const apptEnd = DateTime.fromISO(appt.end_time.toISOString(), { zone: 'utc' }).setZone(timezone);

      // Check if there's any overlap
      return (
        (currentSlotStart >= apptStart && currentSlotStart < apptEnd) ||
        (currentSlotEnd > apptStart && currentSlotEnd <= apptEnd) ||
        (currentSlotStart <= apptStart && currentSlotEnd >= apptEnd)
      );
    });
  }
}

export default AvailabilityService;




