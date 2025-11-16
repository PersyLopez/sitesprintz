import { query } from '../../database/db.js';
import { DateTime } from 'luxon';

// Get email service
let emailService = null;
async function getEmailService() {
  if (!emailService) {
    const module = await import('../../email-service.js');
    emailService = module;
  }
  return emailService;
}

/**
 * Booking Notification Service
 * Handles all email notifications for appointments
 */
class BookingNotificationService {
  /**
   * Format date/time for email display
   */
  formatDateTime(isoDate, timezone) {
    const dt = DateTime.fromISO(isoDate, { zone: timezone });
    return {
      date: dt.toFormat('EEEE, MMMM d, yyyy'), // "Monday, November 18, 2025"
      time: dt.toFormat('h:mm a'), // "2:00 PM"
      datetime: dt.toFormat('EEEE, MMMM d, yyyy \'at\' h:mm a'), // Full format
      timezone: dt.toFormat('ZZZZ'), // "EST" or "America/New_York"
    };
  }

  /**
   * Format price for display
   */
  formatPrice(priceCents, currency = 'USD') {
    const price = priceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }

  /**
   * Send appointment confirmation email
   */
  async sendConfirmationEmail(appointmentData) {
    try {
      const {
        confirmation_code,
        customer_name,
        customer_email,
        start_time,
        end_time,
        timezone,
        service_name,
        staff_name,
        total_price_cents,
        requires_approval,
        tenant_id,
        appointment_id,
        business_name,
        business_email,
        business_phone,
      } = appointmentData;

      const datetime = this.formatDateTime(start_time, timezone);
      const price = this.formatPrice(total_price_cents);

      const subject = requires_approval
        ? `Appointment Request Received - ${confirmation_code}`
        : `Appointment Confirmed - ${confirmation_code}`;

      const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
      const manageUrl = `${SITE_URL}/booking/appointment/${confirmation_code}`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">
              ${requires_approval ? '📅 Appointment Request Received' : '✅ Appointment Confirmed'}
            </h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${customer_name},
            </p>
            
            ${requires_approval ? `
              <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
                We've received your appointment request. We'll review it and send you a confirmation shortly.
              </p>
            ` : `
              <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
                Your appointment has been confirmed! Here are the details:
              </p>
            `}
            
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Service:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${service_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Date & Time:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${datetime.datetime}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Staff:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${staff_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Price:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${price}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Confirmation:</td>
                  <td style="padding: 10px 0;">
                    <code style="background: #fef3c7; padding: 6px 12px; border-radius: 6px; font-weight: 600; color: #92400e;">${confirmation_code}</code>
                  </td>
                </tr>
              </table>
            </div>

            ${business_name ? `
              <div style="margin-top: 20px; padding: 16px; background: #eff6ff; border-radius: 8px;">
                <p style="color: #1e40af; font-weight: 600; margin: 0 0 8px 0;">Business Contact:</p>
                <p style="color: #1e40af; margin: 4px 0;">${business_name}</p>
                ${business_phone ? `<p style="color: #1e40af; margin: 4px 0;">📞 ${business_phone}</p>` : ''}
                ${business_email ? `<p style="color: #1e40af; margin: 4px 0;">✉️ ${business_email}</p>` : ''}
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${manageUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem; margin-right: 10px;">
              View Appointment
            </a>
            <a href="${manageUrl}?action=cancel" style="display: inline-block; padding: 14px 32px; background: white; color: #64748b; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem; border: 2px solid #e5e7eb;">
              Cancel Appointment
            </a>
          </div>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #991b1b; font-size: 0.9rem; margin: 0; line-height: 1.5;">
              📌 <strong>Important:</strong> Please arrive 5-10 minutes early. If you need to cancel or reschedule, please do so at least 24 hours in advance.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      // Send email
      const service = await getEmailService();
      const result = await service.sendEmail(customer_email, subject, html);

      // Log notification
      await this.logNotification({
        tenant_id,
        appointment_id,
        type: 'confirmation',
        channel: 'email',
        recipient_email: customer_email,
        subject,
        message: html,
        status: result.success ? 'sent' : 'failed',
        provider: 'resend',
        provider_message_id: result.id || null,
        error_message: result.error || null,
      });

      return result;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send appointment cancellation email
   */
  async sendCancellationEmail(appointmentData) {
    try {
      const {
        confirmation_code,
        customer_name,
        customer_email,
        start_time,
        timezone,
        service_name,
        cancellation_reason,
        cancelled_by,
        tenant_id,
        appointment_id,
        business_name,
        business_phone,
      } = appointmentData;

      const datetime = this.formatDateTime(start_time, timezone);

      const subject = `Appointment Cancelled - ${confirmation_code}`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ef4444; margin: 0; font-size: 2rem;">❌ Appointment Cancelled</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${customer_name},
            </p>
            
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              Your appointment has been cancelled${cancelled_by === 'staff' || cancelled_by === 'admin' ? ' by the business' : ''}.
            </p>
            
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Service:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${service_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Date & Time:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${datetime.datetime}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Confirmation:</td>
                  <td style="padding: 10px 0;">
                    <code style="background: #fee2e2; padding: 6px 12px; border-radius: 6px; font-weight: 600; color: #991b1b;">${confirmation_code}</code>
                  </td>
                </tr>
                ${cancellation_reason ? `
                  <tr>
                    <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Reason:</td>
                    <td style="padding: 10px 0; color: #64748b; font-style: italic;">${cancellation_reason}</td>
                  </tr>
                ` : ''}
              </table>
            </div>

            ${business_name ? `
              <div style="margin-top: 20px; padding: 16px; background: #eff6ff; border-radius: 8px;">
                <p style="color: #1e40af; font-weight: 600; margin: 0 0 8px 0;">Want to reschedule?</p>
                <p style="color: #1e40af; margin: 4px 0;">Contact ${business_name}</p>
                ${business_phone ? `<p style="color: #1e40af; margin: 4px 0;">📞 ${business_phone}</p>` : ''}
              </div>
            ` : ''}
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      // Send email
      const service = await getEmailService();
      const result = await service.sendEmail(customer_email, subject, html);

      // Log notification
      await this.logNotification({
        tenant_id,
        appointment_id,
        type: 'cancellation',
        channel: 'email',
        recipient_email: customer_email,
        subject,
        message: html,
        status: result.success ? 'sent' : 'failed',
        provider: 'resend',
        provider_message_id: result.id || null,
        error_message: result.error || null,
      });

      return result;
    } catch (error) {
      console.error('Error sending cancellation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send appointment reminder email (24 hours before)
   */
  async sendReminderEmail(appointmentData) {
    try {
      const {
        confirmation_code,
        customer_name,
        customer_email,
        start_time,
        timezone,
        service_name,
        staff_name,
        tenant_id,
        appointment_id,
        business_name,
        business_phone,
      } = appointmentData;

      const datetime = this.formatDateTime(start_time, timezone);

      const subject = `Reminder: Appointment Tomorrow - ${service_name}`;

      const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
      const manageUrl = `${SITE_URL}/booking/appointment/${confirmation_code}`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">⏰ Appointment Reminder</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${customer_name},
            </p>
            
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              This is a friendly reminder about your upcoming appointment tomorrow.
            </p>
            
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Service:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${service_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Date & Time:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 1.1rem;">${datetime.datetime}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Staff:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${staff_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Confirmation:</td>
                  <td style="padding: 10px 0;">
                    <code style="background: #dbeafe; padding: 6px 12px; border-radius: 6px; font-weight: 600; color: #1e40af;">${confirmation_code}</code>
                  </td>
                </tr>
              </table>
            </div>

            ${business_phone ? `
              <div style="margin-top: 20px; padding: 16px; background: #eff6ff; border-radius: 8px;">
                <p style="color: #1e40af; font-weight: 600; margin: 0 0 8px 0;">Need to make changes?</p>
                <p style="color: #1e40af; margin: 4px 0;">Call us: ${business_phone}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${manageUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
              View Details
            </a>
          </div>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #991b1b; font-size: 0.9rem; margin: 0; line-height: 1.5;">
              ⚠️ Need to cancel? Please do so at least 24 hours in advance.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
              This is an automated reminder. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      // Send email
      const service = await getEmailService();
      const result = await service.sendEmail(customer_email, subject, html);

      // Log notification
      await this.logNotification({
        tenant_id,
        appointment_id,
        type: 'reminder',
        channel: 'email',
        recipient_email: customer_email,
        subject,
        message: html,
        status: result.success ? 'sent' : 'failed',
        provider: 'resend',
        provider_message_id: result.id || null,
        error_message: result.error || null,
      });

      return result;
    } catch (error) {
      console.error('Error sending reminder email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log notification to database
   */
  async logNotification(notificationData) {
    try {
      const {
        tenant_id,
        appointment_id,
        type,
        channel,
        recipient_email,
        recipient_phone,
        subject,
        message,
        status,
        provider,
        provider_message_id,
        error_message,
      } = notificationData;

      const result = await query(
        `INSERT INTO booking_notifications 
        (tenant_id, appointment_id, type, channel, recipient_email, recipient_phone,
         subject, message, status, provider, provider_message_id, error_message, sent_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          tenant_id,
          appointment_id,
          type,
          channel,
          recipient_email || null,
          recipient_phone || null,
          subject,
          message,
          status,
          provider,
          provider_message_id || null,
          error_message || null,
          status === 'sent' ? new Date() : null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error logging notification:', error);
      // Don't throw - logging failure shouldn't break the flow
      return null;
    }
  }

  /**
   * Get notification history for an appointment
   */
  async getNotificationHistory(appointmentId) {
    try {
      const result = await query(
        `SELECT * FROM booking_notifications 
         WHERE appointment_id = $1
         ORDER BY created_at DESC`,
        [appointmentId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }
}

export default BookingNotificationService;

