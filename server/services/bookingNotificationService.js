import { prisma } from '../../database/db.js';
import { DateTime } from 'luxon';
import { buyerLocationEmailRow } from '../utils/buyerLocationEmail.js';

// Get email service
let emailService = null;
async function getEmailService() {
  if (!emailService) {
    const module = await import('../utils/email-service-wrapper.js');
    emailService = module;
  }
  return emailService;
}

class BookingNotificationService {
  /**
   * Format date/time for email display
   */
  /**
   * Format date/time for email display.
   * Prisma returns Date objects; Luxon fromISO() only parses strings.
   */
  formatDateTime(isoDate, timezone) {
    const zone =
      typeof timezone === 'string' && DateTime.now().setZone(timezone).isValid
        ? timezone
        : 'America/New_York';
    const dt = this.toZonedDateTime(isoDate, zone);
    if (!dt.isValid) {
      return {
        date: '',
        time: '',
        datetime: '',
        timezone: '',
      };
    }
    return {
      date: dt.toFormat('EEEE, MMMM d, yyyy'),
      time: dt.toFormat('h:mm a'),
      datetime: dt.toFormat("EEEE, MMMM d, yyyy 'at' h:mm a"),
      timezone: dt.toFormat('ZZZZ'),
    };
  }

  toZonedDateTime(value, zone) {
    if (value instanceof Date) {
      return DateTime.fromJSDate(value, { zone: 'utc' }).setZone(zone);
    }
    if (typeof value === 'string') {
      const fromIso = DateTime.fromISO(value, { setZone: true });
      if (fromIso.isValid) return fromIso.setZone(zone);
    }
    if (value != null) {
      const fromJs = DateTime.fromJSDate(new Date(value), { zone: 'utc' }).setZone(zone);
      if (fromJs.isValid) return fromJs;
    }
    return DateTime.invalid('unparsable');
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
        location_address,
        pay_on_site,
      } = appointmentData;

      const datetime = this.formatDateTime(start_time, timezone);
      const price = this.formatPrice(total_price_cents);

      const subject = requires_approval
        ? `Appointment Request Received - ${confirmation_code}`
        : `Appointment Confirmed - ${confirmation_code}`;

      const SITE_URL = process.env.SITE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
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
                ${buyerLocationEmailRow(requires_approval, location_address)}
              </table>
            </div>

            ${pay_on_site ? `
              <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-left: 4px solid #64748b; border-radius: 8px;">
                <p style="color: #1e293b; margin: 0; line-height: 1.5;">
                  <strong>Please bring cash.</strong> We do not take cards.
                </p>
              </div>
            ` : ''}

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
      const send = service.sendHtmlEmail || service.sendEmail;
      const result = await send(customer_email, subject, html);

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
        provider_message_id: result.messageId || result.id || null,
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
      const send = service.sendHtmlEmail || service.sendEmail;
      const result = await send(customer_email, subject, html);

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
        provider_message_id: result.messageId || result.id || null,
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

      const SITE_URL = process.env.SITE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
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
      const send = service.sendHtmlEmail || service.sendEmail;
      const result = await send(customer_email, subject, html);

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
        provider_message_id: result.messageId || result.id || null,
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

      const notification = await prisma.booking_notifications.create({
        data: {
          tenant_id,
          appointment_id,
          type,
          channel,
          recipient_email: recipient_email || null,
          recipient_phone: recipient_phone || null,
          subject,
          message,
          status,
          provider,
          provider_message_id: provider_message_id || null,
          error_message: error_message || null,
          sent_at: status === 'sent' ? new Date() : null,
        }
      });

      return notification;
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
      const notifications = await prisma.booking_notifications.findMany({
        where: { appointment_id: appointmentId },
        orderBy: { created_at: 'desc' }
      });

      return notifications;
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Send staff invitation email
   */
  async sendStaffInvitationEmail({ email, businessName, inviterName, role, acceptUrl, expiresAt }) {
    try {
      const subject = `You've been invited to join ${businessName} on SiteSprintz`;

      const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">👋 Staff Invitation</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Hi there,
            </p>
            
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> as a ${role} member on SiteSprintz.
            </p>
            
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              As a staff member, you'll be able to:
            </p>
            
            <ul style="color: #64748b; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
              <li>View and manage appointments assigned to you</li>
              <li>Update appointment status</li>
              ${role === 'manager' ? '<li>View orders and update order status</li>' : ''}
              <li>Access your staff dashboard</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
                Accept Invitation
              </a>
            </div>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="color: #991b1b; font-size: 0.9rem; margin: 0; line-height: 1.5;">
                ⚠️ <strong>Important:</strong> This invitation expires on ${expiresDate}. If you don't have a SiteSprintz account, you'll be prompted to create one when you accept.
              </p>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      const service = await getEmailService();
      const result = await service.sendEmail(email, subject, html);

      return result;
    } catch (error) {
      console.error('Error sending staff invitation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdateEmail({ order, oldStatus, newStatus, trackingUrl }) {
    try {
      const subject = `Order Update: Your order is now ${newStatus}`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">📦 Order Status Updated</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${order.customer_name || 'there'},
            </p>
            
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              Your order status has been updated from <strong>${oldStatus}</strong> to <strong>${newStatus}</strong>.
            </p>
            
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Order ID:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${order.id}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Status:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${newStatus}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Total:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">$${parseFloat(order.total || 0).toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            ${trackingUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
                  Track Your Order
                </a>
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

      const service = await getEmailService();
      const result = await service.sendEmail(order.customer_email, subject, html);

      return result;
    } catch (error) {
      console.error('Error sending order status update email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send appointment status update email
   */
  async sendAppointmentStatusUpdateEmail({ appointment, oldStatus, newStatus }) {
    try {
      const datetime = this.formatDateTime(appointment.start_time, appointment.timezone);
      const subject = `Appointment Update: ${appointment.booking_services?.name || 'Your appointment'} is now ${newStatus}`;

      const SITE_URL = process.env.SITE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const manageUrl = `${SITE_URL}/track/appointment/${appointment.confirmation_code}`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">📅 Appointment Status Updated</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${appointment.customer_name},
            </p>
            
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              Your appointment status has been updated from <strong>${oldStatus}</strong> to <strong>${newStatus}</strong>.
            </p>
            
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Service:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${appointment.booking_services?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Date & Time:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${datetime.datetime}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Status:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${newStatus}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Confirmation:</td>
                  <td style="padding: 10px 0;">
                    <code style="background: #fef3c7; padding: 6px 12px; border-radius: 6px; font-weight: 600; color: #92400e;">${appointment.confirmation_code}</code>
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${manageUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
                View Appointment
              </a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      const service = await getEmailService();
      const result = await service.sendEmail(appointment.customer_email, subject, html);

      return result;
    } catch (error) {
      console.error('Error sending appointment status update email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send staff appointment assigned email
   */
  async sendStaffAppointmentAssignedEmail({ staff, appointment }) {
    try {
      const datetime = this.formatDateTime(appointment.start_time, appointment.timezone);
      const subject = `New Appointment Assigned: ${appointment.booking_services?.name || 'Appointment'}`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">📅 New Appointment Assigned</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${staff.name},
            </p>
            
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              A new appointment has been assigned to you.
            </p>
            
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Service:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${appointment.booking_services?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Date & Time:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${datetime.datetime}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Customer:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${appointment.customer_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Phone:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${appointment.customer_phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Confirmation:</td>
                  <td style="padding: 10px 0;">
                    <code style="background: #dbeafe; padding: 6px 12px; border-radius: 6px; font-weight: 600; color: #1e40af;">${appointment.confirmation_code}</code>
                  </td>
                </tr>
              </table>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      if (!staff.email) {
        console.warn('Staff member has no email, skipping notification');
        return { success: false, error: 'Staff email not available' };
      }

      const service = await getEmailService();
      const result = await service.sendEmail(staff.email, subject, html);

      return result;
    } catch (error) {
      console.error('Error sending staff appointment assigned email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default BookingNotificationService;

