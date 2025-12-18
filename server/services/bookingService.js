import BookingNotificationService from './bookingNotificationService.js';
import TenantService from './booking/TenantService.js';
import ServiceManagementService from './booking/ServiceManagementService.js';
import StaffManagementService from './booking/StaffManagementService.js';
import AvailabilityService from './booking/AvailabilityService.js';
import AppointmentService from './booking/AppointmentService.js';

/**
 * Booking Service - Facade for booking operations
 * 
 * This class acts as a facade, delegating to focused services:
 * - TenantService: Tenant management
 * - ServiceManagementService: Service CRUD
 * - StaffManagementService: Staff and availability rules
 * - AvailabilityService: Availability calculation
 * - AppointmentService: Appointment lifecycle
 * 
 * This maintains backward compatibility with existing routes while
 * following Single Responsibility Principle internally.
 */
class BookingService {
  constructor() {
    this.notificationService = new BookingNotificationService();
    this.tenantService = new TenantService();
    this.serviceManagementService = new ServiceManagementService();
    this.staffManagementService = new StaffManagementService();
    this.availabilityService = new AvailabilityService(
      this.serviceManagementService,
      this.staffManagementService
    );
    this.appointmentService = new AppointmentService(
      this.serviceManagementService,
      this.notificationService
    );
  }
  // ============================================================================
  // Tenant Management (delegated to TenantService)
  // ============================================================================

  /**
   * Get or create tenant for a user/site
   */
  async getOrCreateTenant(userId, siteId) {
    return await this.tenantService.getOrCreateTenant(userId, siteId);
  }

  // ============================================================================
  // Service Management (delegated to ServiceManagementService)
  // ============================================================================

  /**
   * Create a new service
   */
  async createService(tenantId, serviceData) {
    return await this.serviceManagementService.createService(tenantId, serviceData);
  }

  /**
   * Get all services for a tenant
   */
  async getServices(tenantId, includeInactive = false) {
    return await this.serviceManagementService.getServices(tenantId, includeInactive);
  }

  /**
   * Get service by ID
   */
  async getService(serviceId, tenantId) {
    return await this.serviceManagementService.getService(serviceId, tenantId);
  }

  /**
   * Update a service
   */
  async updateService(serviceId, tenantId, serviceData) {
    return await this.serviceManagementService.updateService(serviceId, tenantId, serviceData);
  }

  /**
   * Delete a service (soft delete)
   */
  async deleteService(serviceId, tenantId) {
    return await this.serviceManagementService.deleteService(serviceId, tenantId);
  }

  // ============================================================================
  // Staff Management (delegated to StaffManagementService)
  // ============================================================================

  /**
   * Create or get default staff member for a tenant
   */
  async getOrCreateDefaultStaff(tenantId) {
    return await this.staffManagementService.getOrCreateDefaultStaff(tenantId);
  }

  /**
   * Set availability rules for staff (weekly schedule)
   */
  async setAvailabilityRules(staffId, tenantId, scheduleRules) {
    return await this.staffManagementService.setAvailabilityRules(staffId, tenantId, scheduleRules);
  }

  /**
   * Get availability rules for staff
   */
  async getAvailabilityRules(staffId) {
    return await this.staffManagementService.getAvailabilityRules(staffId);
  }

  // ============================================================================
  // Availability Calculation (delegated to AvailabilityService)
  // ============================================================================

  /**
   * Calculate available time slots for a given date
   * This is the core availability algorithm
   */
  async calculateAvailableSlots(tenantId, serviceId, staffId, date, timezone = 'America/New_York') {
    return await this.availabilityService.calculateAvailableSlots(tenantId, serviceId, staffId, date, timezone);
  }

  // ============================================================================
  // Appointment Management (delegated to AppointmentService)
  // ============================================================================

  /**
   * Create an appointment
   */
  async createAppointment(tenantId, appointmentData) {
    return await this.appointmentService.createAppointment(tenantId, appointmentData);
  }

  /**
   * Get appointments for a tenant (with filters)
   */
  async getAppointments(tenantId, filters = {}) {
    return await this.appointmentService.getAppointments(tenantId, filters);
  }

  /**
   * Get appointment by ID or confirmation code
   */
  async getAppointment(identifier, tenantId) {
    return await this.appointmentService.getAppointment(identifier, tenantId);
  }

  /**
   * Get appointment by confirmation code (Global lookup)
   */
  async getAppointmentByCode(confirmationCode) {
    return await this.appointmentService.getAppointmentByCode(confirmationCode);
  }

  /**
   * Cancel appointment by confirmation code (Global lookup)
   */
  async cancelAppointmentByCode(confirmationCode, cancelData = {}) {
    return await this.appointmentService.cancelAppointmentByCode(confirmationCode, cancelData);
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(identifier, tenantId, cancelData = {}) {
    return await this.appointmentService.cancelAppointment(identifier, tenantId, cancelData);
  }

  /**
   * Send confirmation email for an appointment
   */
  async sendConfirmationEmail(appointment) {
    return await this.appointmentService.sendConfirmationEmail(appointment);
  }

  /**
   * Send cancellation email for an appointment
   */
  async sendCancellationEmail(appointment, reason, cancelled_by) {
    return await this.appointmentService.sendCancellationEmail(appointment, reason, cancelled_by);
  }
}

export default BookingService;

