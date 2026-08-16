import { prisma } from '../../../database/db.js';

/**
 * Business Mode Service
 * 
 * Handles the core logic for solo vs. team business operations.
 * This service enables templates to flawlessly handle both scenarios:
 * 
 * - SOLO MODE: Single operator, no staff selection needed
 * - TEAM MODE: Multiple staff, customers can select specific providers
 * - HYBRID MODE: Team exists but staff selection is optional
 * 
 * Key Features:
 * - Auto-detects business mode based on staff count
 * - Manages "Any Available" / "No Preference" option
 * - Controls service-staff assignments
 * - Provides intelligent staff suggestions
 */

export const BUSINESS_MODES = {
  SOLO: 'solo',
  TEAM: 'team',
  HYBRID: 'hybrid'
};

class BusinessModeService {
  /**
   * Get the current business mode configuration for a tenant
   */
  async getBusinessModeConfig(tenantId) {
    const tenant = await prisma.booking_tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        business_name: true,
        business_mode: true,
        staff_selection_enabled: true,
        allow_no_preference: true,
        no_preference_text: true
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get staff count for auto-detection
    const staffCount = await prisma.booking_staff.count({
      where: {
        tenant_id: tenantId,
        status: 'active'
      }
    });

    // Determine effective mode
    const effectiveMode = this.determineEffectiveMode(
      tenant.business_mode,
      staffCount,
      tenant.staff_selection_enabled
    );

    return {
      tenantId: tenant.id,
      businessName: tenant.business_name,
      configuredMode: tenant.business_mode || BUSINESS_MODES.SOLO,
      effectiveMode,
      staffCount,
      staffSelectionEnabled: tenant.staff_selection_enabled ?? (staffCount > 1),
      allowNoPreference: tenant.allow_no_preference ?? true,
      noPreferenceText: tenant.no_preference_text || 'Any Available',
      // Computed flags for UI
      showStaffSelection: effectiveMode !== BUSINESS_MODES.SOLO && (tenant.staff_selection_enabled ?? true),
      isSoloOperation: staffCount <= 1
    };
  }

  /**
   * Determine the effective business mode based on configuration and reality
   */
  determineEffectiveMode(configuredMode, staffCount, staffSelectionEnabled) {
    // If only one staff member, it's effectively solo regardless of config
    if (staffCount <= 1) {
      return BUSINESS_MODES.SOLO;
    }

    // If configured as solo but has team, respect the configuration
    if (configuredMode === BUSINESS_MODES.SOLO) {
      return BUSINESS_MODES.SOLO;
    }

    // If staff selection is disabled, it's hybrid (team exists but auto-assigned)
    if (staffSelectionEnabled === false) {
      return BUSINESS_MODES.HYBRID;
    }

    // Default to team mode when multiple staff
    return BUSINESS_MODES.TEAM;
  }

  /**
   * Update business mode configuration
   */
  async updateBusinessModeConfig(tenantId, config) {
    const {
      businessMode,
      staffSelectionEnabled,
      allowNoPreference,
      noPreferenceText
    } = config;

    const updateData = {};

    if (businessMode !== undefined) {
      if (!Object.values(BUSINESS_MODES).includes(businessMode)) {
        throw new Error(`Invalid business mode: ${businessMode}`);
      }
      updateData.business_mode = businessMode;
    }

    if (staffSelectionEnabled !== undefined) {
      updateData.staff_selection_enabled = staffSelectionEnabled;
    }

    if (allowNoPreference !== undefined) {
      updateData.allow_no_preference = allowNoPreference;
    }

    if (noPreferenceText !== undefined) {
      updateData.no_preference_text = noPreferenceText;
    }

    const updated = await prisma.booking_tenants.update({
      where: { id: tenantId },
      data: updateData
    });

    return this.getBusinessModeConfig(tenantId);
  }

  /**
   * Get staff available for a specific service
   * Respects service-staff assignments if they exist
   */
  async getStaffForService(tenantId, serviceId) {
    // First check if there are specific staff assigned to this service
    const serviceStaff = await prisma.service_staff.findMany({
      where: {
        service_id: serviceId,
        booking_staff: {
          status: 'active'
        }
      },
      include: {
        booking_staff: true
      },
      orderBy: [
        { is_primary: 'desc' },
        { booking_staff: { display_order: 'asc' } }
      ]
    });

    // If service has specific staff assigned, return only those
    if (serviceStaff.length > 0) {
      return serviceStaff.map(ss => ({
        ...ss.booking_staff,
        isPrimaryForService: ss.is_primary
      }));
    }

    // Otherwise, return all active staff for the tenant
    const allStaff = await prisma.booking_staff.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active'
      },
      orderBy: [
        { is_primary: 'desc' },
        { display_order: 'asc' }
      ]
    });

    return allStaff.map(staff => ({
      ...staff,
      isPrimaryForService: false
    }));
  }

  /**
   * Assign staff members to a service
   */
  async assignStaffToService(tenantId, serviceId, staffAssignments) {
    // Validate service belongs to tenant
    const service = await prisma.booking_services.findFirst({
      where: { id: serviceId, tenant_id: tenantId }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Use transaction to replace all assignments
    return await prisma.$transaction(async (tx) => {
      // Remove existing assignments
      await tx.service_staff.deleteMany({
        where: { service_id: serviceId }
      });

      // Create new assignments
      const assignments = [];
      for (const assignment of staffAssignments) {
        // Validate staff belongs to tenant
        const staff = await tx.booking_staff.findFirst({
          where: { id: assignment.staffId, tenant_id: tenantId }
        });

        if (!staff) {
          throw new Error(`Staff ${assignment.staffId} not found`);
        }

        const created = await tx.service_staff.create({
          data: {
            service_id: serviceId,
            staff_id: assignment.staffId,
            tenant_id: tenantId,
            is_primary: assignment.isPrimary || false
          },
          include: {
            booking_staff: true
          }
        });

        assignments.push(created);
      }

      return assignments;
    });
  }

  /**
   * Get the best available staff for "Any Available" / "No Preference" selection
   * Uses intelligent load balancing and availability checking
   */
  async getNextAvailableStaff(tenantId, serviceId, date, timezone = 'America/New_York') {
    // Get staff available for this service
    const availableStaff = await this.getStaffForService(tenantId, serviceId);

    if (availableStaff.length === 0) {
      throw new Error('No staff available for this service');
    }

    if (availableStaff.length === 1) {
      return availableStaff[0];
    }

    // Get appointment counts for each staff on the given date
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const staffWithLoad = await Promise.all(
      availableStaff.map(async (staff) => {
        const appointmentCount = await prisma.appointments.count({
          where: {
            staff_id: staff.id,
            start_time: {
              gte: startOfDay,
              lte: endOfDay
            },
            status: {
              in: ['confirmed', 'pending']
            }
          }
        });

        return {
          ...staff,
          appointmentCount
        };
      })
    );

    // Sort by appointment count (least busy first), then by primary status
    staffWithLoad.sort((a, b) => {
      // Primary staff for service gets slight priority
      if (a.isPrimaryForService && !b.isPrimaryForService) return -1;
      if (!a.isPrimaryForService && b.isPrimaryForService) return 1;
      // Then sort by load
      return a.appointmentCount - b.appointmentCount;
    });

    return staffWithLoad[0];
  }

  /**
   * Validate and resolve staff selection for booking
   * Handles "no_preference" magic value
   */
  async resolveStaffForBooking(tenantId, serviceId, staffId, date, timezone) {
    const config = await this.getBusinessModeConfig(tenantId);

    // Solo mode: always use the default/only staff
    if (config.effectiveMode === BUSINESS_MODES.SOLO || config.isSoloOperation) {
      const defaultStaff = await prisma.booking_staff.findFirst({
        where: {
          tenant_id: tenantId,
          status: 'active'
        },
        orderBy: { is_primary: 'desc' }
      });

      if (!defaultStaff) {
        throw new Error('No staff available');
      }

      return defaultStaff;
    }

    // Handle "no_preference" / "any" selection
    if (!staffId || staffId === 'no_preference' || staffId === 'any') {
      if (!config.allowNoPreference) {
        throw new Error('Staff selection is required');
      }

      return await this.getNextAvailableStaff(tenantId, serviceId, date, timezone);
    }

    // Validate selected staff exists and can provide this service
    const availableStaff = await this.getStaffForService(tenantId, serviceId);
    const selectedStaff = availableStaff.find(s => s.id === staffId);

    if (!selectedStaff) {
      throw new Error('Selected staff is not available for this service');
    }

    return selectedStaff;
  }

  /**
   * Auto-detect and suggest business mode based on current setup
   */
  async suggestBusinessMode(tenantId) {
    const staffCount = await prisma.booking_staff.count({
      where: {
        tenant_id: tenantId,
        status: 'active'
      }
    });

    const serviceCount = await prisma.booking_services.count({
      where: {
        tenant_id: tenantId,
        status: 'active'
      }
    });

    // Check if there are service-specific staff assignments
    const hasServiceAssignments = await prisma.service_staff.count({
      where: {
        tenant_id: tenantId
      }
    }) > 0;

    let suggestedMode;
    let recommendation;

    if (staffCount <= 1) {
      suggestedMode = BUSINESS_MODES.SOLO;
      recommendation = 'Solo mode is ideal for single-operator businesses. ' +
        'Customers book directly without staff selection.';
    } else if (hasServiceAssignments) {
      suggestedMode = BUSINESS_MODES.TEAM;
      recommendation = 'Team mode with service-specific assignments. ' +
        'Some services are tied to specific staff members.';
    } else if (staffCount <= 3) {
      suggestedMode = BUSINESS_MODES.TEAM;
      recommendation = 'Team mode recommended. ' +
        'With a small team, letting customers choose their preferred provider improves satisfaction.';
    } else {
      suggestedMode = BUSINESS_MODES.HYBRID;
      recommendation = 'Hybrid mode suggested for larger teams. ' +
        'Offer "Any Available" as default with option to select specific staff.';
    }

    return {
      staffCount,
      serviceCount,
      hasServiceAssignments,
      suggestedMode,
      recommendation,
      currentMode: (await this.getBusinessModeConfig(tenantId)).configuredMode
    };
  }

  /**
   * Migrate a tenant from solo to team mode
   * Ensures all services have at least one staff assigned
   */
  async migrateToTeamMode(tenantId) {
    return await prisma.$transaction(async (tx) => {
      // Get all services
      const services = await tx.booking_services.findMany({
        where: { tenant_id: tenantId, status: 'active' }
      });

      // Get all active staff
      const staff = await tx.booking_staff.findMany({
        where: { tenant_id: tenantId, status: 'active' }
      });

      if (staff.length < 2) {
        throw new Error('Need at least 2 staff members for team mode');
      }

      // Assign all staff to all services (default behavior)
      for (const service of services) {
        // Check if assignments already exist
        const existingAssignments = await tx.service_staff.count({
          where: { service_id: service.id }
        });

        if (existingAssignments === 0) {
          // Create assignments for all staff
          for (const member of staff) {
            await tx.service_staff.create({
              data: {
                service_id: service.id,
                staff_id: member.id,
                tenant_id: tenantId,
                is_primary: member.is_primary || false
              }
            });
          }
        }
      }

      // Update tenant configuration
      await tx.booking_tenants.update({
        where: { id: tenantId },
        data: {
          business_mode: BUSINESS_MODES.TEAM,
          staff_selection_enabled: true,
          allow_no_preference: true
        }
      });

      return { success: true, servicesUpdated: services.length, staffCount: staff.length };
    });
  }
}

export default BusinessModeService;


