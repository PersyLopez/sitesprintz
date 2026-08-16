/**
 * Recurring Appointments Service - Phase 2 Sprint 2
 * 
 * Handles creation and management of recurring appointment series
 * - Weekly and monthly recurrence patterns
 * - Series management (create, update, cancel all)
 * - Individual appointment overrides within series
 * - Recurrence end dates
 */

import { prisma } from '../../../database/db.js';
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  isBefore, 
  format,
  startOfDay 
} from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

class RecurringAppointmentService {
  /**
   * Create a recurring appointment series
   */
  async createRecurringSeries(appointmentData, recurrencePattern) {
    try {
      const {
        tenant_id,
        service_id,
        staff_id,
        customer_name,
        customer_email,
        customer_phone,
        start_time,
        end_time,
        duration_minutes,
        notes
      } = appointmentData;

      const {
        type, // 'weekly' or 'monthly'
        endDate,
        occurrences // number of times to repeat, or null for endDate-based
      } = recurrencePattern;

      // Validate recurrence pattern
      if (!['weekly', 'monthly'].includes(type)) {
        throw new Error('Recurrence type must be weekly or monthly');
      }

      // Generate series ID
      const seriesId = `series-${uuidv4()}`;

      // Generate all appointments in series
      const appointments = [];
      let currentDate = new Date(start_time);
      let occurrenceCount = 0;
      const maxOccurrences = occurrences || 52; // Cap at 1 year if no limit

      while (occurrenceCount < maxOccurrences) {
        // Check if we've passed the end date
        if (endDate && isBefore(new Date(endDate), currentDate)) {
          break;
        }

        // Create appointment for this occurrence
        const appointmentStartTime = new Date(currentDate);
        const appointmentEndTime = new Date(
          appointmentStartTime.getTime() + duration_minutes * 60000
        );

        appointments.push({
          tenant_id,
          service_id,
          staff_id,
          customer_name,
          customer_email,
          customer_phone,
          start_time: appointmentStartTime,
          end_time: appointmentEndTime,
          duration_minutes,
          notes,
          status: 'confirmed',
          is_recurring: true,
          recurrence_type: type,
          recurrence_series_id: seriesId,
          recurrence_occurrence: occurrenceCount + 1,
          confirmation_code: this.generateConfirmationCode(),
          created_at: new Date()
        });

        // Move to next occurrence
        if (type === 'weekly') {
          currentDate = addWeeks(currentDate, 1);
        } else if (type === 'monthly') {
          currentDate = addMonths(currentDate, 1);
        }

        occurrenceCount++;
      }

      if (appointments.length === 0) {
        throw new Error('No appointments generated for this recurrence pattern');
      }

      // Bulk create appointments
      const createdAppointments = await prisma.appointments.createMany({
        data: appointments,
        skipDuplicates: true
      });

      return {
        seriesId,
        type,
        totalOccurrences: appointments.length,
        firstAppointment: appointments[0].start_time,
        lastAppointment: appointments[appointments.length - 1].start_time,
        appointments: createdAppointments
      };
    } catch (error) {
      console.error('[RecurringAppointmentService] Error creating series:', error);
      throw error;
    }
  }

  /**
   * Cancel entire recurring series
   */
  async cancelRecurringSeries(seriesId, reason = '') {
    try {
      // Find all appointments in series
      const appointments = await prisma.appointments.findMany({
        where: {
          recurrence_series_id: seriesId
        }
      });

      if (appointments.length === 0) {
        throw new Error(`Series ${seriesId} not found`);
      }

      // Update all appointments to cancelled
      const result = await prisma.appointments.updateMany({
        where: {
          recurrence_series_id: seriesId
        },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: reason
        }
      });

      return {
        seriesId,
        totalCancelled: result.count,
        reason
      };
    } catch (error) {
      console.error('[RecurringAppointmentService] Error cancelling series:', error);
      throw error;
    }
  }

  /**
   * Cancel single occurrence in a series
   */
  async cancelOccurrence(seriesId, occurrenceNumber, reason = '') {
    try {
      const appointment = await prisma.appointments.findFirst({
        where: {
          recurrence_series_id: seriesId,
          recurrence_occurrence: occurrenceNumber
        }
      });

      if (!appointment) {
        throw new Error(`Occurrence ${occurrenceNumber} in series ${seriesId} not found`);
      }

      await prisma.appointments.update({
        where: { id: appointment.id },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: reason
        }
      });

      return {
        appointmentId: appointment.id,
        seriesId,
        occurrence: occurrenceNumber,
        cancelled: true
      };
    } catch (error) {
      console.error('[RecurringAppointmentService] Error cancelling occurrence:', error);
      throw error;
    }
  }

  /**
   * Reschedule single occurrence
   */
  async rescheduleOccurrence(seriesId, occurrenceNumber, newStartTime, newEndTime) {
    try {
      const appointment = await prisma.appointments.findFirst({
        where: {
          recurrence_series_id: seriesId,
          recurrence_occurrence: occurrenceNumber
        }
      });

      if (!appointment) {
        throw new Error(`Occurrence ${occurrenceNumber} in series ${seriesId} not found`);
      }

      // Check for conflicts at new time
      const conflictingAppointments = await prisma.appointments.findMany({
        where: {
          staff_id: appointment.staff_id,
          status: 'confirmed',
          id: { not: appointment.id },
          start_time: { lt: newEndTime },
          end_time: { gt: newStartTime }
        }
      });

      if (conflictingAppointments.length > 0) {
        throw new Error('New time conflicts with existing appointment');
      }

      const updated = await prisma.appointments.update({
        where: { id: appointment.id },
        data: {
          start_time: newStartTime,
          end_time: newEndTime
        }
      });

      return {
        appointmentId: updated.id,
        oldTime: appointment.start_time,
        newTime: updated.start_time,
        rescheduled: true
      };
    } catch (error) {
      console.error('[RecurringAppointmentService] Error rescheduling occurrence:', error);
      throw error;
    }
  }

  /**
   * Get all appointments in a series
   */
  async getSeriesAppointments(seriesId) {
    try {
      const appointments = await prisma.appointments.findMany({
        where: {
          recurrence_series_id: seriesId
        },
        orderBy: { recurrence_occurrence: 'asc' },
        include: {
          booking_services: true,
          booking_staff: true
        }
      });

      return {
        seriesId,
        totalAppointments: appointments.length,
        appointments: appointments.map(appt => ({
          id: appt.id,
          occurrence: appt.recurrence_occurrence,
          startTime: appt.start_time,
          endTime: appt.end_time,
          status: appt.status,
          service: appt.booking_services.name,
          staff: appt.booking_staff.name
        }))
      };
    } catch (error) {
      console.error('[RecurringAppointmentService] Error getting series appointments:', error);
      throw error;
    }
  }

  /**
   * Update recurring series pattern (reschedule all future occurrences)
   */
  async updateSeriesPattern(seriesId, newStartTime) {
    try {
      const appointments = await prisma.appointments.findMany({
        where: {
          recurrence_series_id: seriesId,
          status: 'confirmed'
        },
        orderBy: { start_time: 'asc' }
      });

      if (appointments.length === 0) {
        throw new Error(`Series ${seriesId} not found or already completed`);
      }

      // Calculate time difference from first appointment
      const firstAppt = appointments[0];
      const timeDiff = new Date(newStartTime).getTime() - firstAppt.start_time.getTime();
      const durationMs = firstAppt.duration_minutes * 60000;

      // Update all appointments by same time difference
      const updatePromises = appointments.map(appt =>
        prisma.appointments.update({
          where: { id: appt.id },
          data: {
            start_time: new Date(appt.start_time.getTime() + timeDiff),
            end_time: new Date(appt.end_time.getTime() + timeDiff)
          }
        })
      );

      await Promise.all(updatePromises);

      return {
        seriesId,
        appointmentsUpdated: appointments.length,
        newStartTime
      };
    } catch (error) {
      console.error('[RecurringAppointmentService] Error updating series pattern:', error);
      throw error;
    }
  }

  /**
   * Get customer's recurring series
   */
  async getCustomerRecurringSeries(customerEmail) {
    try {
      const series = await prisma.appointments.findMany({
        where: {
          customer_email: customerEmail,
          is_recurring: true
        },
        distinct: ['recurrence_series_id'],
        select: {
          recurrence_series_id: true,
          recurrence_type: true,
          start_time: true
        }
      });

      return series;
    } catch (error) {
      console.error('[RecurringAppointmentService] Error getting customer series:', error);
      throw error;
    }
  }

  /**
   * Generate confirmation code
   */
  generateConfirmationCode() {
    return `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Get series analytics
   */
  async getSeriesAnalytics(seriesId) {
    try {
      const appointments = await prisma.appointments.findMany({
        where: {
          recurrence_series_id: seriesId
        }
      });

      const confirmed = appointments.filter(a => a.status === 'confirmed').length;
      const cancelled = appointments.filter(a => a.status === 'cancelled').length;
      const completed = appointments.filter(a => a.status === 'completed').length;

      return {
        seriesId,
        total: appointments.length,
        confirmed,
        cancelled,
        completed,
        cancellationRate: `${Math.round((cancelled / appointments.length) * 100)}%`
      };
    } catch (error) {
      console.error('[RecurringAppointmentService] Error getting series analytics:', error);
      throw error;
    }
  }
}

export default RecurringAppointmentService;


