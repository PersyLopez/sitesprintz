/**
 * Appointment Cancellation Service
 * 
 * Handles cancellation logic and notifications
 * - Validates cancellation requests
 * - Sends cancellation emails to customers
 * - Sends notifications to admin
 * - Updates appointment status
 */

import { prisma } from '../../../database/db.js';
import BookingNotificationService from '../bookingNotificationService.js';
import BookingFeeService from './BookingFeeService.js';

class AppointmentCancellationService {
  constructor() {
    this.notificationService = new BookingNotificationService();
    this.feeService = new BookingFeeService();
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId, reason = '', cancelledBy = 'customer') {
    try {
      console.log(`[CancellationService] Cancelling appointment ${appointmentId}`);

      // Get appointment details
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

      if (appointment.status === 'cancelled') {
        throw new Error('Appointment is already cancelled');
      }

      // Calculate cancellation fees if applicable
      let feeInfo = null;
      if (cancelledBy === 'customer') {
        feeInfo = await this.feeService.processCancellationFee(
          appointmentId,
          appointment.start_time
        );
        console.log(`[CancellationService] Cancellation fee calculated: ${feeInfo.breakdown.cancellationFee}`);
      }

      // Update appointment status
      const cancelled = await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: reason,
          cancelled_by: cancelledBy
        }
      });

      // Send cancellation emails with fee information
      await this.sendCancellationEmail(appointment, feeInfo);
      await this.sendAdminCancellationNotification(appointment, reason, cancelledBy, feeInfo);

      // Create notification record
      await prisma.booking_notifications.create({
        data: {
          tenant_id: appointment.tenant_id,
          appointment_id: appointmentId,
          type: 'cancellation',
          channel: 'email',
          recipient_email: appointment.customer_email,
          status: 'sent',
          subject: `Appointment Cancelled: ${appointment.booking_services.name}`,
          sent_at: new Date()
        }
      });

      console.log(`[CancellationService] Appointment ${appointmentId} cancelled successfully`);
      return cancelled;
    } catch (error) {
      console.error('[CancellationService] Error cancelling appointment:', error);
      throw error;
    }
  }

  /**
   * Send cancellation email to customer
   */
  async sendCancellationEmail(appointment, feeInfo) {
    try {
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

      const emailContent = this.generateCancellationEmail(
        appointment.customer_name,
        appointment.booking_services.name,
        appointmentDate,
        appointmentTime,
        appointment.booking_tenants.business_name,
        appointment.confirmation_code,
        feeInfo
      );

      await this.notificationService.sendEmail({
        to: appointment.customer_email,
        subject: `Appointment Cancelled: ${appointment.booking_services.name}`,
        html: emailContent
      });

      console.log(`[CancellationService] Cancellation email sent to ${appointment.customer_email}`);
    } catch (error) {
      console.error('[CancellationService] Error sending cancellation email:', error);
      throw error;
    }
  }

  /**
   * Send admin notification of cancellation
   */
  async sendAdminCancellationNotification(appointment, reason, cancelledBy, feeInfo) {
    try {
      const tenant = appointment.booking_tenants;
      
      // Get admin email from tenant settings
      const adminEmail = tenant.admin_email || tenant.owner_email;
      
      if (!adminEmail) {
        console.warn('[CancellationService] No admin email found for tenant');
        return;
      }

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

      const emailContent = this.generateAdminCancellationEmail(
        tenant.business_name,
        appointment.customer_name,
        appointment.booking_services.name,
        appointmentDate,
        appointmentTime,
        reason,
        cancelledBy,
        appointment.confirmation_code,
        feeInfo
      );

      await this.notificationService.sendEmail({
        to: adminEmail,
        subject: `Appointment Cancelled: ${appointment.customer_name} - ${appointment.booking_services.name}`,
        html: emailContent
      });

      console.log(`[CancellationService] Admin cancellation notification sent to ${adminEmail}`);
    } catch (error) {
      console.error('[CancellationService] Error sending admin notification:', error);
      // Don't throw - admin notification failure shouldn't break the cancellation
    }
  }

  /**
   * Generate cancellation email for customer
   */
  generateCancellationEmail(customerName, serviceName, date, time, businessName, confirmationCode) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px; }
            .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .appointment-details { background: white; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>❌ Appointment Cancelled</h2>
            </div>

            <div class="content">
              <p>Hi ${customerName},</p>
              
              <p>Your appointment has been cancelled. Here are the details:</p>

              <div class="appointment-details">
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Business:</strong> ${businessName}</p>
                <p><strong>Confirmation Code:</strong> ${confirmationCode}</p>
              </div>

              <p>If you would like to reschedule, please contact us or visit our booking page to select a new time.</p>

              <p>
                <a href="#" class="button">Book Another Appointment</a>
              </p>

              <p>If you have any questions, please don't hesitate to reach out.</p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate admin cancellation notification email
   */
  generateAdminCancellationEmail(businessName, customerName, serviceName, date, time, reason, cancelledBy, confirmationCode) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px; }
            .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details { background: white; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ Appointment Cancellation Notice</h2>
            </div>

            <div class="content">
              <p>An appointment has been cancelled:</p>

              <div class="details">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Confirmation Code:</strong> ${confirmationCode}</p>
                <p><strong>Cancelled By:</strong> ${cancelledBy}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>

              <p>The time slot is now available for other customers to book.</p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
              <p>This is an automated notification from your booking system.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Check if appointment can be cancelled
   * (within cancellation window, not too close to appointment, etc.)
   */
  async canCancelAppointment(appointmentId, requesterType = 'customer') {
    try {
      const appointment = await prisma.appointments.findUnique({
        where: { id: appointmentId },
        include: { booking_tenants: { select: { cancellation_window_hours: true } } }
      });

      if (!appointment) {
        return { canCancel: false, reason: 'Appointment not found' };
      }

      const cancellableStatuses = ['confirmed', 'pending', 'pending_payment'];
      if (!cancellableStatuses.includes(appointment.status)) {
        return { canCancel: false, reason: 'Only pending or confirmed appointments can be cancelled' };
      }

      // Check if appointment is in the past
      if (appointment.end_time < new Date()) {
        return { canCancel: false, reason: 'Cannot cancel past appointments' };
      }

      // For customers, check if within cancellation window from tenant configuration
      if (requesterType === 'customer') {
        const windowHours = appointment.booking_tenants?.cancellation_window_hours || 24;
        const windowMs = windowHours * 60 * 60 * 1000;
        const cancelDeadline = new Date(Date.now() + windowMs);
        
        if (appointment.start_time < cancelDeadline) {
          return { 
            canCancel: false, 
            reason: `Cancellations must be made at least ${windowHours} hour(s) before the appointment` 
          };
        }
      }

      return { canCancel: true };
    } catch (error) {
      console.error('[CancellationService] Error checking cancellation eligibility:', error);
      return { canCancel: false, reason: 'Error checking cancellation eligibility' };
    }
  }
}

export default AppointmentCancellationService;

