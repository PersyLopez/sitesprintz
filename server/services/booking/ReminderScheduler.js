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
      // Calculate hours until appointment
      const now = new Date();
      const hoursUntil = Math.round((appointment.start_time - now) / (1000 * 60 * 60));
      
      // Determine reminder type
      let reminderType = '24h';
      if (hoursUntil <= 2) reminderType = 'last-minute';
      else if (hoursUntil <= 4) reminderType = '4h';
      else if (hoursUntil <= 8) reminderType = '8h';

      // Create notification
      const notification = await prisma.booking_notifications.create({
        data: {
          tenant_id: appointment.tenant_id,
          appointment_id: appointment.id,
          type: 'reminder',
          channel: 'email',
          recipient_email: appointment.customer_email,
          recipient_phone: appointment.customer_phone,
          subject: `Reminder: Your appointment is in ${hoursUntil} hours`,
          status: 'pending',
          reminder_type: reminderType
        }
      });

      // Format appointment details for email
      const appointmentDate = appointment.start_time.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const appointmentTime = appointment.start_time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Create email content
      const emailContent = this.generateReminderEmail(
        appointment.customer_name,
        appointment.booking_services.name,
        appointmentDate,
        appointmentTime,
        appointment.booking_tenants.business_name,
        appointment.confirmation_code
      );

      // Send email (use your email service)
      await this.notificationService.sendEmail({
        to: appointment.customer_email,
        subject: notification.subject,
        html: emailContent
      });

      // Update notification status
      await prisma.booking_notifications.update({
        where: { id: notification.id },
        data: {
          status: 'sent',
          sent_at: new Date()
        }
      });

      console.log(`[ReminderScheduler] Sent reminder for appointment ${appointment.id}`);
      return true;
    } catch (error) {
      console.error('[ReminderScheduler] Error sending reminder email:', error);
      throw error;
    }
  }

  /**
   * Generate reminder email HTML content
   */
  generateReminderEmail(customerName, serviceName, date, time, businessName, confirmationCode) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
            .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .appointment-details { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📅 Appointment Reminder</h2>
            </div>

            <div class="content">
              <p>Hi ${customerName},</p>
              
              <p>This is a friendly reminder about your upcoming appointment:</p>

              <div class="appointment-details">
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Business:</strong> ${businessName}</p>
                <p><strong>Confirmation Code:</strong> ${confirmationCode}</p>
              </div>

              <p>Please plan to arrive 5-10 minutes early.</p>

              <p>
                <a href="#" class="button">View Appointment Details</a>
              </p>

              <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
              <p>This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
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


