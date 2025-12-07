import { prisma } from '../../database/db.js';
import { DateTime } from 'luxon';
import BookingNotificationService from './bookingNotificationService.js';

/**
 * Booking Service - Core business logic for appointment booking
 * Phase 1: MVP Features
 */
class BookingService {
  constructor() {
    this.notificationService = new BookingNotificationService();
  }
  /**
   * Get or create tenant for a user/site
   */
  async getOrCreateTenant(userId, siteId) {
    try {
      // Check if tenant exists
      const existingTenant = await prisma.booking_tenants.findFirst({
        where: { user_id: userId }
      });

      if (existingTenant) {
        return existingTenant;
      }

      // Get user details
      const user = await prisma.users.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create tenant
      const newTenant = await prisma.booking_tenants.create({
        data: {
          user_id: userId,
          site_id: siteId,
          business_name: 'My Business',
          email: user.email,
          status: 'active'
        }
      });

      return newTenant;
    } catch (error) {
      console.error('Error getting/creating tenant:', error);
      throw error;
    }
  }

  /**
   * Create a new service
   */
  async createService(tenantId, serviceData) {
    const {
      name,
      description = '',
      category = 'general',
      duration_minutes,
      price_cents = 0,
      online_booking_enabled = true,
      requires_approval = false,
    } = serviceData;

    // Validation
    if (!name) {
      throw new Error('Service name is required');
    }

    if (typeof duration_minutes !== 'number' || duration_minutes === null || duration_minutes === undefined) {
      throw new Error('Service duration is required');
    }

    if (duration_minutes < 1 || duration_minutes > 480) {
      throw new Error('Duration must be between 1 and 480 minutes');
    }

    try {
      const result = await prisma.booking_services.create({
        data: {
          tenant_id: tenantId,
          name,
          description,
          category,
          duration_minutes,
          price_cents,
          online_booking_enabled,
          requires_approval,
          status: 'active'
        }
      });

      return result;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  /**
   * Get all services for a tenant
   */
  async getServices(tenantId, includeInactive = false) {
    try {
      const where = { tenant_id: tenantId };
      if (!includeInactive) {
        where.status = 'active';
      }

      const services = await prisma.booking_services.findMany({
        where,
        orderBy: [
          { display_order: 'asc' },
          { created_at: 'desc' }
        ]
      });

      return services;
    } catch (error) {
      console.error('Error getting services:', error);
      throw error;
    }
  }

  /**
   * Get service by ID
   */
  /**
   * Get service by ID
   */
  async getService(serviceId, tenantId) {
    try {
      const service = await prisma.booking_services.findFirst({
        where: {
          id: serviceId,
          tenant_id: tenantId
        }
      });

      return service || null;
    } catch (error) {
      console.error('Error getting service:', error);
      throw error;
    }
  }

  /**
   * Update a service
   */
  async updateService(serviceId, tenantId, serviceData) {
    const allowedFields = [
      'name',
      'description',
      'category',
      'duration_minutes',
      'price_cents',
      'online_booking_enabled',
      'requires_approval',
      'status',
      'display_order',
    ];

    const dataToUpdate = {};
    for (const field of allowedFields) {
      if (serviceData.hasOwnProperty(field)) {
        dataToUpdate[field] = serviceData[field];
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      throw new Error('No fields to update');
    }

    dataToUpdate.updated_at = new Date();

    try {
      // Check existence and ownership first
      const service = await prisma.booking_services.findFirst({
        where: { id: serviceId, tenant_id: tenantId }
      });

      if (!service) {
        return null;
      }

      const updatedService = await prisma.booking_services.update({
        where: { id: serviceId },
        data: dataToUpdate
      });

      return updatedService;
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  /**
   * Delete a service (soft delete)
   */
  async deleteService(serviceId, tenantId) {
    try {
      // Check existence and ownership first
      const service = await prisma.booking_services.findFirst({
        where: { id: serviceId, tenant_id: tenantId }
      });

      if (!service) {
        return false;
      }

      await prisma.booking_services.update({
        where: { id: serviceId },
        data: {
          status: 'inactive',
          updated_at: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  }

  /**
   * Create or get default staff member for a tenant
   */
  async getOrCreateDefaultStaff(tenantId) {
    try {
      // Check if staff exists
      const existingStaff = await prisma.booking_staff.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'asc' }
      });

      if (existingStaff) {
        return existingStaff;
      }

      // Get tenant info
      const tenant = await prisma.booking_tenants.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Create default staff
      const newStaff = await prisma.booking_staff.create({
        data: {
          tenant_id: tenantId,
          name: tenant.business_name,
          email: tenant.email,
          title: 'Service Provider',
          is_primary: true,
          status: 'active'
        }
      });

      return newStaff;
    } catch (error) {
      console.error('Error getting/creating default staff:', error);
      throw error;
    }
  }

  /**
   * Set availability rules for staff (weekly schedule)
   */
  /**
   * Set availability rules for staff (weekly schedule)
   */
  async setAvailabilityRules(staffId, tenantId, scheduleRules) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Delete existing rules for this staff
        await tx.booking_availability_rules.deleteMany({
          where: { staff_id: staffId }
        });

        // Insert new rules
        const insertedRules = [];
        for (const rule of scheduleRules) {
          // Prisma expects Date objects for DateTime fields (even @db.Time)
          // We construct a dummy date with the time
          const startTime = new Date(`1970-01-01T${rule.start_time}Z`);
          const endTime = new Date(`1970-01-01T${rule.end_time}Z`);

          const newRule = await tx.booking_availability_rules.create({
            data: {
              tenant_id: tenantId,
              staff_id: staffId,
              day_of_week: rule.day_of_week,
              start_time: startTime,
              end_time: endTime,
              is_available: rule.is_available !== false,
            }
          });

          // Convert back to strings for return value consistency
          insertedRules.push({
            ...newRule,
            start_time: rule.start_time,
            end_time: rule.end_time
          });
        }

        return insertedRules;
      });
    } catch (error) {
      console.error('Error setting availability rules:', error);
      throw error;
    }
  }

  /**
   * Get availability rules for staff
   */
  async getAvailabilityRules(staffId) {
    try {
      const rules = await prisma.booking_availability_rules.findMany({
        where: {
          staff_id: staffId,
          is_available: true
        },
        orderBy: [
          { day_of_week: 'asc' },
          { start_time: 'asc' }
        ]
      });

      // Convert Date objects back to HH:MM strings for compatibility
      return rules.map(rule => ({
        ...rule,
        start_time: rule.start_time.toISOString().split('T')[1].substring(0, 5),
        end_time: rule.end_time.toISOString().split('T')[1].substring(0, 5)
      }));
    } catch (error) {
      console.error('Error getting availability rules:', error);
      throw error;
    }
  }

  /**
   * Calculate available time slots for a given date
   * This is the core availability algorithm
   */
  async calculateAvailableSlots(tenantId, serviceId, staffId, date, timezone = 'America/New_York') {
    try {
      // 1. Get service details (duration)
      const service = await this.getService(serviceId, tenantId);
      if (!service) {
        throw new Error('Service not found');
      }

      // 2. Get staff details (buffer times)
      const staff = await prisma.booking_staff.findFirst({
        where: { id: staffId, tenant_id: tenantId }
      });

      if (!staff) {
        throw new Error('Staff member not found');
      }

      // 3. Parse the date in the specified timezone
      const dateObj = DateTime.fromISO(date, { zone: timezone });
      if (!dateObj.isValid) {
        throw new Error('Invalid date format');
      }

      const dayOfWeek = dateObj.weekday % 7; // Convert to 0=Sunday, 6=Saturday

      // 4. Get availability rules for this day
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
        return []; // Staff not available on this day
      }
      console.log(`Found ${availabilityRulesRaw.length} rules for day ${dayOfWeek}`);

      // Map rules to use string times
      const availabilityRules = availabilityRulesRaw.map(rule => ({
        ...rule,
        start_time: rule.start_time.toISOString().split('T')[1].substring(0, 5),
        end_time: rule.end_time.toISOString().split('T')[1].substring(0, 5)
      }));

      // 5. Get existing appointments for this day
      const dayStart = dateObj.startOf('day').toUTC().toISO();
      const dayEnd = dateObj.endOf('day').toUTC().toISO();

      const existingAppointments = await prisma.appointments.findMany({
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

      // 6. Generate time slots
      const slots = [];
      const slotDuration = service.duration_minutes;
      const bufferTime = staff.buffer_time_after || 0;
      const totalSlotTime = slotDuration + bufferTime;

      // Get current time
      const now = DateTime.now().setZone(timezone);

      for (const rule of availabilityRules) {
        // Parse start and end times for this availability rule
        const ruleStart = DateTime.fromISO(
          `${dateObj.toISODate()}T${rule.start_time}`,
          { zone: timezone }
        );
        const ruleEnd = DateTime.fromISO(
          `${dateObj.toISODate()}T${rule.end_time}`,
          { zone: timezone }
        );

        // Generate slots for this availability window
        let currentSlotStart = ruleStart;

        while (currentSlotStart.plus({ minutes: slotDuration }) <= ruleEnd) {
          const currentSlotEnd = currentSlotStart.plus({ minutes: slotDuration });

          // Check if slot is in the past
          if (currentSlotEnd <= now) {
            currentSlotStart = currentSlotStart.plus({ minutes: totalSlotTime });
            continue;
          }

          // Check min advance booking time
          const minAdvanceHours = staff.min_advance_booking_hours || 0;
          if (currentSlotStart < now.plus({ hours: minAdvanceHours })) {
            currentSlotStart = currentSlotStart.plus({ minutes: totalSlotTime });
            continue;
          }

          // Check if slot conflicts with existing appointments
          const hasConflict = existingAppointments.some((appt) => {
            // Prisma returns Date objects, convert to ISO string for Luxon
            const apptStart = DateTime.fromISO(appt.start_time.toISOString(), { zone: 'utc' }).setZone(timezone);
            const apptEnd = DateTime.fromISO(appt.end_time.toISOString(), { zone: 'utc' }).setZone(timezone);

            // Check if there's any overlap
            return (
              (currentSlotStart >= apptStart && currentSlotStart < apptEnd) ||
              (currentSlotEnd > apptStart && currentSlotEnd <= apptEnd) ||
              (currentSlotStart <= apptStart && currentSlotEnd >= apptEnd)
            );
          });

          if (!hasConflict) {
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
      }

      return slots;
    } catch (error) {
      console.error('Error calculating available slots:', error);
      throw error;
    }
  }

  /**
   * Generate a unique confirmation code
   */
  generateConfirmationCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, L, 0, 1
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create an appointment
   */
  /**
   * Create an appointment
   */
  async createAppointment(tenantId, appointmentData) {
    const {
      service_id,
      staff_id,
      start_time,
      timezone = 'America/New_York',
      customer_name,
      customer_email,
      customer_phone,
      customer_notes,
      booking_source = 'online',
    } = appointmentData;

    // Validation
    if (!service_id || !staff_id || !start_time || !customer_name || !customer_email) {
      throw new Error('Missing required appointment fields');
    }

    let appointment;
    try {
      appointment = await prisma.$transaction(async (tx) => {
        // 1. Get service details
        const service = await tx.booking_services.findFirst({
          where: { id: service_id, tenant_id: tenantId }
        });

        if (!service) {
          throw new Error('Service not found');
        }

        // 2. Calculate end time
        const startTimeUTC = DateTime.fromISO(start_time, { zone: timezone }).toUTC();
        const endTimeUTC = startTimeUTC.plus({ minutes: service.duration_minutes });

        // 3. Check for conflicts (pessimistic locking)
        // Prisma doesn't support FOR UPDATE natively in findFirst, so we use raw query
        const conflicts = await tx.$queryRaw`
          SELECT id FROM appointments 
          WHERE staff_id = ${staff_id}::uuid
          AND status NOT IN ('cancelled')
          AND ((start_time < ${endTimeUTC.toJSDate()} AND end_time > ${startTimeUTC.toJSDate()}) 
               OR (start_time < ${endTimeUTC.toJSDate()} AND end_time > ${endTimeUTC.toJSDate()})
               OR (start_time >= ${startTimeUTC.toJSDate()} AND end_time <= ${endTimeUTC.toJSDate()}))
          FOR UPDATE
        `;

        if (conflicts.length > 0) {
          throw new Error('Time slot no longer available');
        }

        // 4. Generate confirmation code
        let confirmationCode = this.generateConfirmationCode();

        // Ensure uniqueness
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

        // 5. Determine status
        const status = service.requires_approval ? 'pending' : 'confirmed';

        // 6. Create appointment
        const newAppointment = await tx.appointments.create({
          data: {
            tenant_id: tenantId,
            service_id: service_id,
            staff_id: staff_id,
            start_time: startTimeUTC.toJSDate(),
            end_time: endTimeUTC.toJSDate(),
            duration_minutes: service.duration_minutes,
            timezone,
            customer_name,
            customer_email,
            customer_phone: customer_phone || null,
            customer_notes: customer_notes || null,
            confirmation_code: confirmationCode,
            booking_source,
            status,
            total_price_cents: service.price_cents,
            requires_approval: service.requires_approval,
          }
        });

        return newAppointment;
      });

      // Send confirmation email asynchronously (don't wait)
      // Must be done after transaction commits so the appointment is visible to other connections
      this.sendConfirmationEmail(appointment).catch((error) => {
        console.error('Failed to send confirmation email:', error);
      });

      return appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
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
      this.sendCancellationEmail(updatedAppt, reason, cancelled_by).catch((error) => {
        console.error('Failed to send cancellation email:', error);
      });

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
      this.sendCancellationEmail(updatedAppt, reason, cancelled_by).catch((error) => {
        console.error('Failed to send cancellation email:', error);
        // Don't fail the cancellation if email fails
      });

      return updatedAppt;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
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

export default BookingService;

