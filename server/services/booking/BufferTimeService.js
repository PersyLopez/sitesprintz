/**
 * Buffer Time Service
 * 
 * Handles buffer time calculations between appointments
 * - Applies buffer times when checking availability
 * - Prevents double-booking with buffer times
 * - Calculates effective busy periods
 */

import { prisma } from '../../../database/db.js';
import { addMinutes, isBefore } from 'date-fns';

class BufferTimeService {
  /**
   * Get service buffer time settings
   */
  async getBufferSettings(serviceId) {
    const service = await prisma.booking_services.findUnique({
      where: { id: serviceId },
      select: {
        buffer_minutes_before: true,
        buffer_minutes_after: true
      }
    });

    return {
      before: service?.buffer_minutes_before || 0,
      after: service?.buffer_minutes_after || 0
    };
  }

  /**
   * Update buffer time settings for a service
   */
  async updateBufferSettings(serviceId, bufferMinutesBefore, bufferMinutesAfter) {
    return await prisma.booking_services.update({
      where: { id: serviceId },
      data: {
        buffer_minutes_before: bufferMinutesBefore || 0,
        buffer_minutes_after: bufferMinutesAfter || 0
      }
    });
  }

  /**
   * Get effective busy period with buffer times
   * Returns the actual period during which the staff member is unavailable
   */
  getEffectiveBusyPeriod(appointment, bufferSettings) {
    const bufferBefore = bufferSettings.before || 0;
    const bufferAfter = bufferSettings.after || 0;

    return {
      start: new Date(appointment.start_time.getTime() - bufferBefore * 60000),
      end: new Date(appointment.end_time.getTime() + bufferAfter * 60000),
      originalStart: appointment.start_time,
      originalEnd: appointment.end_time,
      bufferBefore,
      bufferAfter
    };
  }

  /**
   * Check if a proposed time slot conflicts with existing appointments including buffers
   */
  async checkAvailabilityWithBuffers(serviceId, staffId, proposedStart, proposedEnd) {
    try {
      // Get buffer settings
      const bufferSettings = await this.getBufferSettings(serviceId);

      // Get all confirmed appointments for this staff member
      const existingAppointments = await prisma.appointments.findMany({
        where: {
          staff_id: staffId,
          status: 'confirmed',
          cancelled_at: null
        }
      });

      // Calculate effective busy periods with buffers
      const effectiveBusyPeriods = existingAppointments.map(appt =>
        this.getEffectiveBusyPeriod(appt, bufferSettings)
      );

      // Check for conflicts
      const conflicts = [];
      for (const busyPeriod of effectiveBusyPeriods) {
        // Check if proposed slot overlaps with busy period
        const proposedEndTime = new Date(proposedEnd);
        const proposedStartTime = new Date(proposedStart);

        // Overlap condition: start < busyEnd AND end > busyStart
        if (proposedStartTime < busyPeriod.end && proposedEndTime > busyPeriod.start) {
          conflicts.push({
            existingAppointment: {
              start: busyPeriod.originalStart,
              end: busyPeriod.originalEnd
            },
            effectiveBusyPeriod: busyPeriod,
            conflict: {
              start: busyPeriod.start,
              end: busyPeriod.end
            }
          });
        }
      }

      return {
        available: conflicts.length === 0,
        conflicts,
        bufferSettings
      };
    } catch (error) {
      console.error('[BufferTimeService] Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Get next available slot after a given time, accounting for buffers
   */
  async getNextAvailableSlot(serviceId, staffId, startTime, durationMinutes) {
    try {
      const service = await prisma.booking_services.findUnique({
        where: { id: serviceId },
        select: {
          duration_minutes: true,
          buffer_minutes_before: true,
          buffer_minutes_after: true
        }
      });

      const bufferSettings = {
        before: service?.buffer_minutes_before || 0,
        after: service?.buffer_minutes_after || 0
      };

      const appointmentDuration = durationMinutes || service?.duration_minutes || 60;

      // Get all confirmed appointments for this staff member
      const existingAppointments = await prisma.appointments.findMany({
        where: {
          staff_id: staffId,
          status: 'confirmed',
          cancelled_at: null,
          start_time: {
            gte: new Date(startTime)
          }
        },
        orderBy: { start_time: 'asc' }
      });

      // Calculate effective busy periods
      const effectiveBusyPeriods = existingAppointments.map(appt =>
        this.getEffectiveBusyPeriod(appt, bufferSettings)
      );

      // Start checking from the requested time
      let currentTime = new Date(startTime);
      const maxIterations = 100; // Prevent infinite loops
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;
        const proposedEnd = addMinutes(currentTime, appointmentDuration);

        // Check if this slot is available
        const hasConflict = effectiveBusyPeriods.some(busyPeriod =>
          currentTime < busyPeriod.end && proposedEnd > busyPeriod.start
        );

        if (!hasConflict) {
          return {
            start: currentTime,
            end: proposedEnd,
            bufferSettings
          };
        }

        // Move to after the next busy period
        const sortedPeriods = effectiveBusyPeriods
          .filter(p => p.end > currentTime)
          .sort((a, b) => a.end - b.end);

        if (sortedPeriods.length === 0) {
          break;
        }

        currentTime = sortedPeriods[0].end;
      }

      // Return next available if no conflicts found
      return {
        start: currentTime,
        end: addMinutes(currentTime, appointmentDuration),
        bufferSettings
      };
    } catch (error) {
      console.error('[BufferTimeService] Error getting next available slot:', error);
      throw error;
    }
  }
}

export default BufferTimeService;


