import { prisma } from '../../../database/db.js';
import { DateTime } from 'luxon';
import crypto from 'crypto';

/**
 * Appointment Service - Manages appointments
 * Single Responsibility: Appointment lifecycle management
 */
class AppointmentService {
  constructor(serviceManagementService, notificationService) {
    this.serviceManagementService = serviceManagementService;
    this.notificationService = notificationService;
  }

  /**
   * Create an appointment
   */
  async createAppointment(tenantId, appointmentData) {
    this.validateAppointmentData(appointmentData);

    let appointment;
    try {
      appointment = await prisma.$transaction(async (tx) => {
        const service = await this.getServiceForAppointment(tx, appointmentData.service_id, tenantId);
        const timeRange = this.calculateAppointmentTimeRange(appointmentData.start_time, service.duration_minutes, appointmentData.timezone);
        
        await this.checkForAppointmentConflicts(tx, appointmentData.staff_id, timeRange);
        const confirmationCode = await this.generateUniqueConfirmationCode(tx);
        const status = this.determineAppointmentStatus(service);
        
        return await this.createAppointmentRecord(tx, {
          tenantId,
          appointmentData,
          service,
          timeRange,
          confirmationCode,
          status
        });
      });

      this.sendConfirmationEmailAsync(appointment);
      return appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  /**
   * Get appointments for a tenant (with filters)
   */
  async getAppointments(tenantId, filters = {}) {
    const {
      start_date,
      end_date,
      staff_id,
      service_id,
      status,
      customer_email,
    } = filters;

    try {
      const where = { tenant_id: tenantId };

      if (start_date) where.start_time = { gte: new Date(start_date) };
      if (end_date) {
        // If start_time is already set, merge it
        where.start_time = { ...where.start_time, lte: new Date(end_date) };
      }
      if (staff_id) where.staff_id = staff_id;
      if (service_id) where.service_id = service_id;
      if (status) where.status = status;
      if (customer_email) where.customer_email = customer_email;

      const appointments = await prisma.appointments.findMany({
        where,
        orderBy: { start_time: 'desc' },
        include: {
          booking_services: { select: { name: true } },
          booking_staff: { select: { name: true } }
        }
      });

      // Map to flat structure expected by frontend
      return appointments.map(appt => ({
        ...appt,
        service_name: appt.booking_services?.name,
        staff_name: appt.booking_staff?.name
      }));
    } catch (error) {
      console.error('Error getting appointments:', error);
      throw error;
    }
  }

  /**
   * Get appointment by ID or confirmation code
   */
  async getAppointment(identifier, tenantId) {
    try {
      // Check if identifier is UUID or confirmation code
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      const where = { tenant_id: tenantId };
      if (isUUID) {
        where.id = identifier;
      } else {
        where.confirmation_code = identifier;
      }

      const appt = await prisma.appointments.findFirst({
        where,
        include: {
          booking_services: true,
          booking_staff: true
        }
      });

      if (!appt) {
        return null;
      }

      return {
        ...appt,
        service_name: appt.booking_services?.name,
        duration_minutes: appt.booking_services?.duration_minutes,
        price_cents: appt.booking_services?.price_cents,
        staff_name: appt.booking_staff?.name,
        staff_email: appt.booking_staff?.email
      };
    } catch (error) {
      console.error('Error getting appointment:', error);
      throw error;
    }
  }

  /**
   * Get appointment by confirmation code (Global lookup)
   */
  async getAppointmentByCode(confirmationCode) {
    try {
      const appt = await prisma.appointments.findFirst({
        where: { confirmation_code: confirmationCode },
        include: {
          booking_services: true,
          booking_staff: true,
          booking_tenants: true
        }
      });

      if (!appt) {
        return null;
      }

      return {
        ...appt,
        service_name: appt.booking_services?.name,
        duration_minutes: appt.booking_services?.duration_minutes,
        price_cents: appt.booking_services?.price_cents,
        staff_name: appt.booking_staff?.name,
        staff_email: appt.booking_staff?.email,
        business_name: appt.booking_tenants?.business_name
      };
    } catch (error) {
      console.error('Error getting appointment by code:', error);
      throw error;
    }
  }

  /**
   * Cancel appointment by confirmation code (Global lookup)
   */
  async cancelAppointmentByCode(confirmationCode, cancelData = {}) {
    const { reason = 'No reason provided', cancelled_by = 'customer' } = cancelData;

    try {
      const appt = await prisma.appointments.findFirst({
        where: {
          confirmation_code: confirmationCode,
          status: { not: 'cancelled' }
        }
      });

      if (!appt) {
        return null;
      }

      const updatedAppt = await prisma.appointments.update({
        where: { id: appt.id },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: reason,
          cancelled_by: cancelled_by,
          updated_at: new Date()
        }
      });

      // Send cancellation email asynchronously (don't wait)
      this.sendCancellationEmailAsync(updatedAppt, reason, cancelled_by);

      return updatedAppt;
    } catch (error) {
      console.error('Error cancelling appointment by code:', error);
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(identifier, tenantId, cancelData = {}) {
    const { reason = 'No reason provided', cancelled_by = 'customer' } = cancelData;

    try {
      // Check if identifier is UUID or confirmation code
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      const where = {
        tenant_id: tenantId,
        status: { not: 'cancelled' }
      };

      if (isUUID) {
        where.id = identifier;
      } else {
        where.confirmation_code = identifier;
      }

      const appt = await prisma.appointments.findFirst({ where });

      if (!appt) {
        return null;
      }

      const updatedAppt = await prisma.appointments.update({
        where: { id: appt.id },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: reason,
          cancelled_by: cancelled_by,
          updated_at: new Date()
        }
      });

      // Send cancellation email asynchronously (don't wait)
      this.sendCancellationEmailAsync(updatedAppt, reason, cancelled_by);

      return updatedAppt;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  /**
   * Validate appointment data
   */
  validateAppointmentData(appointmentData) {
    const { service_id, staff_id, start_time, customer_name, customer_email } = appointmentData;
    
    if (!service_id || !staff_id || !start_time || !customer_name || !customer_email) {
      throw new Error('Missing required appointment fields');
    }
  }

  /**
   * Get service for appointment creation
   */
  async getServiceForAppointment(tx, serviceId, tenantId) {
    const service = await tx.booking_services.findFirst({
      where: { id: serviceId, tenant_id: tenantId }
    });

    if (!service) {
      throw new Error('Service not found');
    }
    
    return service;
  }

  /**
   * Calculate appointment time range
   */
  calculateAppointmentTimeRange(startTime, durationMinutes, timezone) {
    const startTimeUTC = DateTime.fromISO(startTime, { zone: timezone }).toUTC();
    const endTimeUTC = startTimeUTC.plus({ minutes: durationMinutes });
    
    return {
      startTimeUTC,
      endTimeUTC
    };
  }

  /**
   * Check for appointment conflicts using pessimistic locking
   */
  async checkForAppointmentConflicts(tx, staffId, timeRange) {
    const conflicts = await tx.$queryRaw`
      SELECT id FROM appointments 
      WHERE staff_id = ${staffId}::uuid
      AND status NOT IN ('cancelled')
      AND ((start_time < ${timeRange.endTimeUTC.toJSDate()} AND end_time > ${timeRange.startTimeUTC.toJSDate()}) 
           OR (start_time < ${timeRange.endTimeUTC.toJSDate()} AND end_time > ${timeRange.endTimeUTC.toJSDate()})
           OR (start_time >= ${timeRange.startTimeUTC.toJSDate()} AND end_time <= ${timeRange.endTimeUTC.toJSDate()}))
      FOR UPDATE
    `;

    if (conflicts.length > 0) {
      throw new Error('Time slot no longer available');
    }
  }

  /**
   * Generate a unique confirmation code
   */
  async generateUniqueConfirmationCode(tx) {
    let confirmationCode = this.generateConfirmationCode();
    let codeExists = true;
    let attempts = 0;
    
    while (codeExists && attempts < 10) {
      const codeCheck = await tx.appointments.findFirst({
        where: { confirmation_code: confirmationCode }
      });

      if (!codeCheck) {
        codeExists = false;
      } else {
        confirmationCode = this.generateConfirmationCode();
        attempts++;
      }
    }
    
    return confirmationCode;
  }

  /**
   * Generate a unique confirmation code using cryptographically secure random bytes
   */
  generateConfirmationCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, L, 0, 1
    const randomBytes = crypto.randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      // Use modulo to map random byte to character set
      code += chars.charAt(randomBytes[i] % chars.length);
    }
    return code;
  }

  /**
   * Determine appointment status based on service requirements
   */
  determineAppointmentStatus(service) {
    return service.requires_approval ? 'pending' : 'confirmed';
  }

  /**
   * Create appointment record in database
   */
  async createAppointmentRecord(tx, { tenantId, appointmentData, service, timeRange, confirmationCode, status }) {
    return await tx.appointments.create({
      data: {
        tenant_id: tenantId,
        service_id: appointmentData.service_id,
        staff_id: appointmentData.staff_id,
        start_time: timeRange.startTimeUTC.toJSDate(),
        end_time: timeRange.endTimeUTC.toJSDate(),
        duration_minutes: service.duration_minutes,
        timezone: appointmentData.timezone || 'America/New_York',
        customer_name: appointmentData.customer_name,
        customer_email: appointmentData.customer_email,
        customer_phone: appointmentData.customer_phone || null,
        customer_notes: appointmentData.customer_notes || null,
        confirmation_code: confirmationCode,
        booking_source: appointmentData.booking_source || 'online',
        status,
        total_price_cents: service.price_cents,
        requires_approval: service.requires_approval,
      }
    });
  }

  /**
   * Send confirmation email asynchronously
   */
  sendConfirmationEmailAsync(appointment) {
    // Must be done after transaction commits so the appointment is visible to other connections
    this.sendConfirmationEmail(appointment).catch((error) => {
      console.error('Failed to send confirmation email:', error);
    });
  }

  /**
   * Send confirmation email for an appointment
   */
  async sendConfirmationEmail(appointment) {
    try {
      // Get full appointment details with service and staff info
      const appt = await prisma.appointments.findUnique({
        where: { id: appointment.id },
        include: {
          booking_services: true,
          booking_staff: true,
          booking_tenants: true
        }
      });

      if (!appt) {
        throw new Error('Appointment not found');
      }

      await this.notificationService.sendConfirmationEmail({
        confirmation_code: appt.confirmation_code,
        customer_name: appt.customer_name,
        customer_email: appt.customer_email,
        start_time: appt.start_time,
        end_time: appt.end_time,
        timezone: appt.timezone,
        service_name: appt.booking_services?.name,
        staff_name: appt.booking_staff?.name,
        total_price_cents: appt.total_price_cents,
        requires_approval: appt.requires_approval,
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        business_name: appt.booking_tenants?.business_name,
        business_email: appt.booking_tenants?.email,
        business_phone: appt.booking_tenants?.phone,
      });

      return true;
    } catch (error) {
      console.error('Error in sendConfirmationEmail:', error);
      return false;
    }
  }

  /**
   * Send cancellation email asynchronously
   */
  sendCancellationEmailAsync(appointment, reason, cancelled_by) {
    this.sendCancellationEmail(appointment, reason, cancelled_by).catch((error) => {
      console.error('Failed to send cancellation email:', error);
    });
  }

  /**
   * Send cancellation email for an appointment
   */
  async sendCancellationEmail(appointment, reason, cancelled_by) {
    try {
      // Get full appointment details
      const appt = await prisma.appointments.findUnique({
        where: { id: appointment.id },
        include: {
          booking_services: true,
          booking_tenants: true
        }
      });

      if (!appt) {
        throw new Error('Appointment not found');
      }

      await this.notificationService.sendCancellationEmail({
        confirmation_code: appt.confirmation_code,
        customer_name: appt.customer_name,
        customer_email: appt.customer_email,
        start_time: appt.start_time,
        timezone: appt.timezone,
        service_name: appt.booking_services?.name,
        cancellation_reason: reason,
        cancelled_by: cancelled_by,
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        business_name: appt.booking_tenants?.business_name,
        business_phone: appt.booking_tenants?.phone,
      });

      return true;
    } catch (error) {
      console.error('Error in sendCancellationEmail:', error);
      return false;
    }
  }
}

export default AppointmentService;




