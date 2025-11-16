import { query, transaction } from '../../database/db.js';
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
      const existingTenant = await query(
        'SELECT * FROM booking_tenants WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (existingTenant.rows.length > 0) {
        return existingTenant.rows[0];
      }

      // Get user details
      const userResult = await query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Create tenant
      const result = await query(
        `INSERT INTO booking_tenants 
        (user_id, site_id, business_name, email, status)
        VALUES ($1, $2, $3, $4, 'active')
        RETURNING *`,
        [userId, siteId, 'My Business', user.email]
      );

      return result.rows[0];
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
      const result = await query(
        `INSERT INTO booking_services 
        (tenant_id, name, description, category, duration_minutes, price_cents, 
         online_booking_enabled, requires_approval, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
        RETURNING *`,
        [
          tenantId,
          name,
          description,
          category,
          duration_minutes,
          price_cents,
          online_booking_enabled,
          requires_approval,
        ]
      );

      return result.rows[0];
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
      const whereClause = includeInactive
        ? 'WHERE tenant_id = $1'
        : 'WHERE tenant_id = $1 AND status = $2';
      const params = includeInactive ? [tenantId] : [tenantId, 'active'];

      const result = await query(
        `SELECT * FROM booking_services 
         ${whereClause}
         ORDER BY display_order ASC, created_at DESC`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting services:', error);
      throw error;
    }
  }

  /**
   * Get service by ID
   */
  async getService(serviceId, tenantId) {
    try {
      const result = await query(
        'SELECT * FROM booking_services WHERE id = $1 AND tenant_id = $2',
        [serviceId, tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting service:', error);
      throw error;
    }
  }

  /**
   * Update a service
   */
  async updateService(serviceId, tenantId, serviceData) {
    const updates = [];
    const values = [];
    let paramCount = 1;

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

    for (const field of allowedFields) {
      if (serviceData.hasOwnProperty(field)) {
        updates.push(`${field} = $${paramCount}`);
        values.push(serviceData[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(serviceId, tenantId);

    try {
      const result = await query(
        `UPDATE booking_services 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
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
      const result = await query(
        `UPDATE booking_services 
         SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`,
        [serviceId, tenantId]
      );

      return result.rows.length > 0;
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
      const existingStaff = await query(
        'SELECT * FROM booking_staff WHERE tenant_id = $1 ORDER BY created_at LIMIT 1',
        [tenantId]
      );

      if (existingStaff.rows.length > 0) {
        return existingStaff.rows[0];
      }

      // Get tenant info
      const tenantResult = await query(
        'SELECT business_name, email FROM booking_tenants WHERE id = $1',
        [tenantId]
      );

      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      const tenant = tenantResult.rows[0];

      // Create default staff
      const result = await query(
        `INSERT INTO booking_staff 
        (tenant_id, name, email, title, is_primary, status)
        VALUES ($1, $2, $3, $4, true, 'active')
        RETURNING *`,
        [tenantId, tenant.business_name, tenant.email, 'Service Provider']
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting/creating default staff:', error);
      throw error;
    }
  }

  /**
   * Set availability rules for staff (weekly schedule)
   */
  async setAvailabilityRules(staffId, tenantId, scheduleRules) {
    try {
      return await transaction(async (client) => {
        // Delete existing rules for this staff
        await client.query(
          'DELETE FROM booking_availability_rules WHERE staff_id = $1',
          [staffId]
        );

        // Insert new rules
        const insertedRules = [];
        for (const rule of scheduleRules) {
          const result = await client.query(
            `INSERT INTO booking_availability_rules 
            (tenant_id, staff_id, day_of_week, start_time, end_time, is_available)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
              tenantId,
              staffId,
              rule.day_of_week,
              rule.start_time,
              rule.end_time,
              rule.is_available !== false,
            ]
          );
          insertedRules.push(result.rows[0]);
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
      const result = await query(
        `SELECT * FROM booking_availability_rules 
         WHERE staff_id = $1 AND is_available = true
         ORDER BY day_of_week, start_time`,
        [staffId]
      );

      return result.rows;
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
      const staffResult = await query(
        'SELECT * FROM booking_staff WHERE id = $1 AND tenant_id = $2',
        [staffId, tenantId]
      );
      if (staffResult.rows.length === 0) {
        throw new Error('Staff member not found');
      }
      const staff = staffResult.rows[0];

      // 3. Parse the date in the specified timezone
      const dateObj = DateTime.fromISO(date, { zone: timezone });
      if (!dateObj.isValid) {
        throw new Error('Invalid date format');
      }

      const dayOfWeek = dateObj.weekday % 7; // Convert to 0=Sunday, 6=Saturday

      // 4. Get availability rules for this day
      const availabilityRules = await query(
        `SELECT * FROM booking_availability_rules 
         WHERE staff_id = $1 AND day_of_week = $2 AND is_available = true
         ORDER BY start_time`,
        [staffId, dayOfWeek]
      );

      if (availabilityRules.rows.length === 0) {
        return []; // Staff not available on this day
      }

      // 5. Get existing appointments for this day
      const dayStart = dateObj.startOf('day').toUTC().toISO();
      const dayEnd = dateObj.endOf('day').toUTC().toISO();

      const existingAppointments = await query(
        `SELECT start_time, end_time FROM appointments 
         WHERE staff_id = $1 
         AND status NOT IN ('cancelled')
         AND start_time >= $2 
         AND start_time < $3
         ORDER BY start_time`,
        [staffId, dayStart, dayEnd]
      );

      // 6. Generate time slots
      const slots = [];
      const slotDuration = service.duration_minutes;
      const bufferTime = staff.buffer_time_after || 0;
      const totalSlotTime = slotDuration + bufferTime;

      // Get current time
      const now = DateTime.now().setZone(timezone);

      for (const rule of availabilityRules.rows) {
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
          const hasConflict = existingAppointments.rows.some((appt) => {
            const apptStart = DateTime.fromISO(appt.start_time, { zone: 'utc' }).setZone(timezone);
            const apptEnd = DateTime.fromISO(appt.end_time, { zone: 'utc' }).setZone(timezone);

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

    try {
      return await transaction(async (client) => {
        // 1. Get service details
        const serviceResult = await client.query(
          'SELECT * FROM booking_services WHERE id = $1 AND tenant_id = $2',
          [service_id, tenantId]
        );
        if (serviceResult.rows.length === 0) {
          throw new Error('Service not found');
        }
        const service = serviceResult.rows[0];

        // 2. Calculate end time
        const startTimeUTC = DateTime.fromISO(start_time, { zone: timezone }).toUTC();
        const endTimeUTC = startTimeUTC.plus({ minutes: service.duration_minutes });

        // 3. Check for conflicts (pessimistic locking)
        const conflicts = await client.query(
          `SELECT id FROM appointments 
           WHERE staff_id = $1 
           AND status NOT IN ('cancelled')
           AND ((start_time < $2 AND end_time > $2) 
                OR (start_time < $3 AND end_time > $3)
                OR (start_time >= $2 AND end_time <= $3))
           FOR UPDATE`,
          [staff_id, startTimeUTC.toISO(), endTimeUTC.toISO()]
        );

        if (conflicts.rows.length > 0) {
          throw new Error('Time slot no longer available');
        }

        // 4. Generate confirmation code
        let confirmationCode = this.generateConfirmationCode();
        
        // Ensure uniqueness
        let codeExists = true;
        let attempts = 0;
        while (codeExists && attempts < 10) {
          const codeCheck = await client.query(
            'SELECT id FROM appointments WHERE confirmation_code = $1',
            [confirmationCode]
          );
          if (codeCheck.rows.length === 0) {
            codeExists = false;
          } else {
            confirmationCode = this.generateConfirmationCode();
            attempts++;
          }
        }

        // 5. Determine status
        const status = service.requires_approval ? 'pending' : 'confirmed';

        // 6. Create appointment
        const result = await client.query(
          `INSERT INTO appointments 
          (tenant_id, service_id, staff_id, start_time, end_time, duration_minutes, timezone,
           customer_name, customer_email, customer_phone, customer_notes,
           confirmation_code, booking_source, status, total_price_cents, requires_approval)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            tenantId,
            service_id,
            staff_id,
            startTimeUTC.toISO(),
            endTimeUTC.toISO(),
            service.duration_minutes,
            timezone,
            customer_name,
            customer_email,
            customer_phone || null,
            customer_notes || null,
            confirmationCode,
            booking_source,
            status,
            service.price_cents,
            service.requires_approval,
          ]
        );

        const appointment = result.rows[0];

        // Send confirmation email asynchronously (don't wait)
        this.sendConfirmationEmail(appointment).catch((error) => {
          console.error('Failed to send confirmation email:', error);
          // Don't fail the booking if email fails
        });

        return appointment;
      });
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
      const details = await query(
        `SELECT 
          a.*,
          s.name as service_name,
          s.duration_minutes,
          st.name as staff_name,
          st.email as staff_email,
          t.business_name,
          t.email as business_email,
          t.phone as business_phone
         FROM appointments a
         LEFT JOIN booking_services s ON a.service_id = s.id
         LEFT JOIN booking_staff st ON a.staff_id = st.id
         LEFT JOIN booking_tenants t ON a.tenant_id = t.id
         WHERE a.id = $1`,
        [appointment.id]
      );

      if (details.rows.length === 0) {
        throw new Error('Appointment not found');
      }

      const appt = details.rows[0];

      await this.notificationService.sendConfirmationEmail({
        confirmation_code: appt.confirmation_code,
        customer_name: appt.customer_name,
        customer_email: appt.customer_email,
        start_time: appt.start_time,
        end_time: appt.end_time,
        timezone: appt.timezone,
        service_name: appt.service_name,
        staff_name: appt.staff_name,
        total_price_cents: appt.total_price_cents,
        requires_approval: appt.requires_approval,
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        business_name: appt.business_name,
        business_email: appt.business_email,
        business_phone: appt.business_phone,
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
      let whereConditions = ['tenant_id = $1'];
      let params = [tenantId];
      let paramCount = 2;

      if (start_date) {
        whereConditions.push(`start_time >= $${paramCount}`);
        params.push(start_date);
        paramCount++;
      }

      if (end_date) {
        whereConditions.push(`start_time <= $${paramCount}`);
        params.push(end_date);
        paramCount++;
      }

      if (staff_id) {
        whereConditions.push(`staff_id = $${paramCount}`);
        params.push(staff_id);
        paramCount++;
      }

      if (service_id) {
        whereConditions.push(`service_id = $${paramCount}`);
        params.push(service_id);
        paramCount++;
      }

      if (status) {
        whereConditions.push(`status = $${paramCount}`);
        params.push(status);
        paramCount++;
      }

      if (customer_email) {
        whereConditions.push(`customer_email = $${paramCount}`);
        params.push(customer_email);
        paramCount++;
      }

      const result = await query(
        `SELECT a.*, 
                s.name as service_name,
                st.name as staff_name
         FROM appointments a
         LEFT JOIN booking_services s ON a.service_id = s.id
         LEFT JOIN booking_staff st ON a.staff_id = st.id
         WHERE ${whereConditions.join(' AND ')}
         ORDER BY start_time DESC`,
        params
      );

      return result.rows;
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

      const field = isUUID ? 'id' : 'confirmation_code';

      const result = await query(
        `SELECT a.*, 
                s.name as service_name, s.duration_minutes, s.price_cents,
                st.name as staff_name, st.email as staff_email
         FROM appointments a
         LEFT JOIN booking_services s ON a.service_id = s.id
         LEFT JOIN booking_staff st ON a.staff_id = st.id
         WHERE a.${field} = $1 AND a.tenant_id = $2`,
        [identifier, tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting appointment:', error);
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
      const field = isUUID ? 'id' : 'confirmation_code';

      const result = await query(
        `UPDATE appointments 
         SET status = 'cancelled',
             cancelled_at = CURRENT_TIMESTAMP,
             cancellation_reason = $1,
             cancelled_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE ${field} = $3 AND tenant_id = $4 AND status != 'cancelled'
         RETURNING *`,
        [reason, cancelled_by, identifier, tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const appointment = result.rows[0];

      // Send cancellation email asynchronously (don't wait)
      this.sendCancellationEmail(appointment, reason, cancelled_by).catch((error) => {
        console.error('Failed to send cancellation email:', error);
        // Don't fail the cancellation if email fails
      });

      return appointment;
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
      const details = await query(
        `SELECT 
          a.*,
          s.name as service_name,
          t.business_name,
          t.phone as business_phone
         FROM appointments a
         LEFT JOIN booking_services s ON a.service_id = s.id
         LEFT JOIN booking_tenants t ON a.tenant_id = t.id
         WHERE a.id = $1`,
        [appointment.id]
      );

      if (details.rows.length === 0) {
        throw new Error('Appointment not found');
      }

      const appt = details.rows[0];

      await this.notificationService.sendCancellationEmail({
        confirmation_code: appt.confirmation_code,
        customer_name: appt.customer_name,
        customer_email: appt.customer_email,
        start_time: appt.start_time,
        timezone: appt.timezone,
        service_name: appt.service_name,
        cancellation_reason: reason,
        cancelled_by: cancelled_by,
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        business_name: appt.business_name,
        business_phone: appt.business_phone,
      });

      return true;
    } catch (error) {
      console.error('Error in sendCancellationEmail:', error);
      return false;
    }
  }
}

export default BookingService;

