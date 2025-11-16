import express from 'express';
import BookingService from '../services/bookingService.js';

const router = express.Router();
const bookingService = new BookingService();

/**
 * PUBLIC BOOKING API
 * These endpoints are used by customers to browse and book appointments
 */

/**
 * GET /api/booking/tenants/:userId/services
 * Get all available services for booking
 */
router.get('/tenants/:userId/services', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get or create tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Get active services
    const services = await bookingService.getServices(tenant.id, false);

    res.json({
      success: true,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        duration_minutes: s.duration_minutes,
        price_cents: s.price_cents,
        price_display: `$${(s.price_cents / 100).toFixed(2)}`,
        online_booking_enabled: s.online_booking_enabled,
        requires_approval: s.requires_approval,
      })),
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
    });
  }
});

/**
 * GET /api/booking/tenants/:userId/availability
 * Get available time slots for a service/staff/date
 * Query params: service_id, staff_id (optional), date, timezone (optional)
 */
router.get('/tenants/:userId/availability', async (req, res) => {
  try {
    const { userId } = req.params;
    const { service_id, staff_id, date, timezone = 'America/New_York' } = req.query;

    if (!service_id || !date) {
      return res.status(400).json({
        success: false,
        error: 'service_id and date are required',
      });
    }

    // Get or create tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Get or use default staff
    let staffIdToUse = staff_id;
    if (!staffIdToUse) {
      const defaultStaff = await bookingService.getOrCreateDefaultStaff(tenant.id);
      staffIdToUse = defaultStaff.id;
    }

    // Calculate available slots
    const slots = await bookingService.calculateAvailableSlots(
      tenant.id,
      service_id,
      staffIdToUse,
      date,
      timezone
    );

    res.json({
      success: true,
      date,
      timezone,
      service_id,
      staff_id: staffIdToUse,
      slots,
      total_slots: slots.length,
    });
  } catch (error) {
    console.error('Error calculating availability:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate availability',
    });
  }
});

/**
 * POST /api/booking/tenants/:userId/appointments
 * Create a new appointment
 */
router.post('/tenants/:userId/appointments', async (req, res) => {
  try {
    const { userId } = req.params;
    const appointmentData = req.body;

    // Validation
    const required = ['service_id', 'start_time', 'customer_name', 'customer_email'];
    for (const field of required) {
      if (!appointmentData[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`,
        });
      }
    }

    // Get or create tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Get or use default staff
    let staffId = appointmentData.staff_id;
    if (!staffId) {
      const defaultStaff = await bookingService.getOrCreateDefaultStaff(tenant.id);
      staffId = defaultStaff.id;
    }

    // Create appointment
    const appointment = await bookingService.createAppointment(tenant.id, {
      ...appointmentData,
      staff_id: staffId,
    });

    // Email notification is sent automatically by the service

    res.status(201).json({
      success: true,
      appointment: {
        id: appointment.id,
        confirmation_code: appointment.confirmation_code,
        service_id: appointment.service_id,
        staff_id: appointment.staff_id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email,
        status: appointment.status,
        total_price_cents: appointment.total_price_cents,
      },
      message: appointment.requires_approval
        ? 'Appointment pending approval'
        : 'Appointment confirmed!',
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(error.message.includes('no longer available') ? 409 : 500).json({
      success: false,
      error: error.message || 'Failed to create appointment',
    });
  }
});

/**
 * GET /api/booking/tenants/:userId/appointments/:identifier
 * Get appointment details (by ID or confirmation code)
 */
router.get('/tenants/:userId/appointments/:identifier', async (req, res) => {
  try {
    const { userId, identifier } = req.params;

    // Get tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Get appointment
    const appointment = await bookingService.getAppointment(identifier, tenant.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
    }

    res.json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment',
    });
  }
});

/**
 * DELETE /api/booking/tenants/:userId/appointments/:identifier
 * Cancel an appointment (by ID or confirmation code)
 */
router.delete('/tenants/:userId/appointments/:identifier', async (req, res) => {
  try {
    const { userId, identifier } = req.params;
    const { reason, cancelled_by = 'customer' } = req.body;

    // Get tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Cancel appointment
    const appointment = await bookingService.cancelAppointment(identifier, tenant.id, {
      reason,
      cancelled_by,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or already cancelled',
      });
    }

    // Email notification is sent automatically by the service

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: {
        id: appointment.id,
        confirmation_code: appointment.confirmation_code,
        status: appointment.status,
        cancelled_at: appointment.cancelled_at,
      },
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel appointment',
    });
  }
});

/**
 * ADMIN/DASHBOARD API
 * These endpoints require authentication and are used by business owners
 */

/**
 * POST /api/booking/admin/:userId/services
 * Create a new service (admin only)
 */
router.post('/admin/:userId/services', async (req, res) => {
  try {
    const { userId } = req.params;
    const serviceData = req.body;

    // TODO: Add authentication middleware

    // Get tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Create service
    const service = await bookingService.createService(tenant.id, serviceData);

    res.status(201).json({
      success: true,
      service,
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create service',
    });
  }
});

/**
 * PUT /api/booking/admin/:userId/services/:serviceId
 * Update a service (admin only)
 */
router.put('/admin/:userId/services/:serviceId', async (req, res) => {
  try {
    const { userId, serviceId } = req.params;
    const serviceData = req.body;

    // TODO: Add authentication middleware

    // Get tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Update service
    const service = await bookingService.updateService(serviceId, tenant.id, serviceData);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    res.json({
      success: true,
      service,
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update service',
    });
  }
});

/**
 * DELETE /api/booking/admin/:userId/services/:serviceId
 * Delete a service (admin only)
 */
router.delete('/admin/:userId/services/:serviceId', async (req, res) => {
  try {
    const { userId, serviceId } = req.params;

    // TODO: Add authentication middleware

    // Get tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Delete service
    const deleted = await bookingService.deleteService(serviceId, tenant.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service',
    });
  }
});

/**
 * GET /api/booking/admin/:userId/appointments
 * Get all appointments (admin only)
 * Query params: start_date, end_date, status, staff_id, service_id
 */
router.get('/admin/:userId/appointments', async (req, res) => {
  try {
    const { userId } = req.params;
    const filters = req.query;

    // TODO: Add authentication middleware

    // Get tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Get appointments
    const appointments = await bookingService.getAppointments(tenant.id, filters);

    res.json({
      success: true,
      appointments,
      total: appointments.length,
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
    });
  }
});

/**
 * POST /api/booking/admin/:userId/staff/:staffId/availability
 * Set availability schedule for staff (admin only)
 */
router.post('/admin/:userId/staff/:staffId/availability', async (req, res) => {
  try {
    const { userId, staffId } = req.params;
    const { scheduleRules } = req.body;

    if (!Array.isArray(scheduleRules) || scheduleRules.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'scheduleRules array is required',
      });
    }

    // TODO: Add authentication middleware

    // Get tenant
    const tenant = await bookingService.getOrCreateTenant(parseInt(userId), null);

    // Set availability
    const rules = await bookingService.setAvailabilityRules(staffId, tenant.id, scheduleRules);

    res.json({
      success: true,
      message: 'Availability schedule updated',
      rules,
    });
  } catch (error) {
    console.error('Error setting availability:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set availability',
    });
  }
});

/**
 * GET /api/booking/admin/:userId/staff/:staffId/availability
 * Get availability schedule for staff (admin only)
 */
router.get('/admin/:userId/staff/:staffId/availability', async (req, res) => {
  try {
    const { staffId } = req.params;

    // TODO: Add authentication middleware

    // Get availability
    const rules = await bookingService.getAvailabilityRules(staffId);

    res.json({
      success: true,
      rules,
    });
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get availability',
    });
  }
});

export default router;

