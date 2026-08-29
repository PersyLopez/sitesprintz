import { prisma } from '../../../database/db.js';

/**
 * Service Management Service - Manages booking services
 * Single Responsibility: Service CRUD operations
 */
class ServiceManagementService {
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

    this.validateServiceData(name, duration_minutes);

    const tenant = await prisma.booking_tenants.findUnique({
      where: { id: tenantId },
      select: {
        payment_enabled: true,
        default_payment_type: true,
        default_deposit_percentage: true,
      },
    });

    const paymentType = tenant?.default_payment_type || 'none';
    const requiresPayment = Boolean(tenant?.payment_enabled) && paymentType !== 'none';

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
          requires_payment: requiresPayment,
          payment_type: requiresPayment ? paymentType : 'none',
          deposit_percentage: tenant?.default_deposit_percentage ?? 50,
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
      if (Object.prototype.hasOwnProperty.call(serviceData, field)) {
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
   * Shop payment switches apply to services already on the tenant.
   * New services inherit in createService; this keeps existing rows in sync.
   *
   * @param {string} tenantId
   * @param {{ payment_enabled?: boolean, default_payment_type?: string, default_deposit_percentage?: number }|null} [tenant]
   * @returns {Promise<number>} count of services updated
   */
  async syncExistingServicesToShopPayment(tenantId, tenant = null) {
    const row = tenant || await prisma.booking_tenants.findUnique({
      where: { id: tenantId },
      select: {
        payment_enabled: true,
        default_payment_type: true,
        default_deposit_percentage: true,
      },
    });
    if (!row) return 0;

    const paymentType = row.default_payment_type || 'none';
    const requiresPayment = Boolean(row.payment_enabled) && paymentType !== 'none';

    const result = await prisma.booking_services.updateMany({
      where: { tenant_id: tenantId },
      data: {
        requires_payment: requiresPayment,
        payment_type: requiresPayment ? paymentType : 'none',
        deposit_percentage: row.default_deposit_percentage ?? 50,
        updated_at: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Validate service data
   */
  validateServiceData(name, duration_minutes) {
    if (!name) {
      throw new Error('Service name is required');
    }

    if (typeof duration_minutes !== 'number' || duration_minutes === null || duration_minutes === undefined) {
      throw new Error('Service duration is required');
    }

    if (duration_minutes < 1 || duration_minutes > 480) {
      throw new Error('Duration must be between 1 and 480 minutes');
    }
  }
}

export default ServiceManagementService;






