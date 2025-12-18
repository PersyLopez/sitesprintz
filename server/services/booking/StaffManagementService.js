import { prisma } from '../../../database/db.js';

/**
 * Staff Management Service - Manages booking staff
 * Single Responsibility: Staff and availability rule management
 */
class StaffManagementService {
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
}

export default StaffManagementService;




