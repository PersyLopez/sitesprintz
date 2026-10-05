/**
 * Reminder Scheduler Service
 * 
 * Handles scheduled reminders for upcoming appointments
 * - Queries upcoming appointments
 * - Sends reminder emails
 * - Tracks reminder status
 * - Configurable reminder timing
 */

import { prisma } from '../../../database/db.js';
import BookingNotificationService from '../bookingNotificationService.js';
import { addHours } from 'date-fns';

class ReminderScheduler {
  constructor() {
    this.notificationService = new BookingNotificationService();
  }

  /**
   * Check and send reminders for upcoming appointments
   * Called by cron job every 15 minutes
   */
  async processReminders() {
    try {
      console.log('[ReminderScheduler] Starting reminder processing...');
      
      // Get all active tenants with reminders enabled
      const tenants = await prisma.booking_tenants.findMany({
        where: {
          reminder_email_enabled: true,
          status: 'active'
        }
      });

      let totalProcessed = 0;
      let totalSent = 0;

      for (const tenant of tenants) {
        const reminder_hours = tenant.reminder_hours_before || 24;
        const result = await this.processRemindersForTenant(tenant.id, reminder_hours);
        totalProcessed += result.processed;
        totalSent += result.sent;
      }

      console.log(`[ReminderScheduler] Processed ${totalProcessed} appointments, sent ${totalSent} reminders`);
      return { processed: totalProcessed, sent: totalSent };
    } catch (error) {
      console.error('[ReminderScheduler] Error processing reminders:', error);
      throw error;
    }
  }

  /**
   * Process reminders for a specific tenant
   */
  async processRemindersForTenant(tenantId, reminderHours) {
    try {
      const now = new Date();
      const reminderTime = addHours(now, reminderHours);
      const reminderWindowStart = addHours(reminderTime, -0.25); // 15 minute window
      const reminderWindowEnd = addHours(reminderTime, 0.25);

      // Find appointments in the reminder window
      const appointments = await prisma.appointments.findMany({
        where: {
          tenant_id: tenantId,
          status: 'confirmed',
          start_time: {
            gte: reminderWindowStart,
            lte: reminderWindowEnd
          },
          // Exclude appointments that already have a reminder sent
          booking_notifications: {
            none: {
              type: 'reminder'
            }
          }
        },
        include: {
          booking_services: true,
          booking_staff: true,
          booking_tenants: true
        }
      });

      let sent = 0;

      for (const appointment of appointments) {
        try {
          await this.sendReminderEmail(appointment);
          sent++;
        } catch (error) {
          console.error(
            `[ReminderScheduler] Failed to send reminder for appointment ${appointment.id}:`,
            error.message
          );
        }
      }

      return { processed: appointments.length, sent };
    } catch (error) {
      console.error(`[ReminderScheduler] Error processing reminders for tenant ${tenantId}:`, error);
      return { processed: 0, sent: 0 };
    }
  }

  /**
   * Send reminder email for an appointment
   */
  async sendReminderEmail(appointment) {
    try {
      const result = await this.notificationService.sendReminderEmail({
        confirmation_code: appointment.confirmation_code,
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email,
        start_time: appointment.start_time,
        timezone: appointment.timezone,
        service_name: appointment.booking_services?.name,
        staff_name: appointment.booking_staff?.name,
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
        business_name: appointment.booking_tenants?.business_name,
        business_phone: appointment.booking_tenants?.phone,
      });

      if (!result || result.success !== true) {
        throw new Error(result?.error || 'Reminder email failed to send');
      }

      console.log(`[ReminderScheduler] Sent reminder for appointment ${appointment.id}`);
      return true;
    } catch (error) {
      console.error('[ReminderScheduler] Error sending reminder email:', error);
      throw error;
    }
  }

  /**
   * Get reminder settings for a tenant
   */
  async getReminderSettings(tenantId) {
    const tenant = await prisma.booking_tenants.findUnique({
      where: { id: tenantId },
      select: {
        reminder_email_enabled: true,
        reminder_hours_before: true,
      }
    });

    return {
      enabled: tenant?.reminder_email_enabled ?? true,
      hoursBefore: tenant?.reminder_hours_before || 24,
      template: 'default',
    };
  }

  /**
   * Update reminder settings for a tenant
   */
  async updateReminderSettings(tenantId, settings) {
    return await prisma.booking_tenants.update({
      where: { id: tenantId },
      data: {
        reminder_email_enabled: settings.enabled ?? true,
        reminder_hours_before: settings.hoursBefore ?? 24
      },
      select: {
        id: true,
        reminder_email_enabled: true,
        reminder_hours_before: true
      }
    });
  }

  /**
   * Manually send reminder for an appointment (admin action)
   */
  async sendManualReminder(appointmentId) {
    const appointment = await prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: {
        booking_services: true,
        booking_staff: true,
        booking_tenants: true
      }
    });

    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    return await this.sendReminderEmail(appointment);
  }
}

export default ReminderScheduler;


