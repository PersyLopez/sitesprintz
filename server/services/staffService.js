import { prisma } from '../../database/db.js';
import { DateTime } from 'luxon';

/**
 * Staff Service
 * Handles staff dashboard data, appointments, and orders
 */
class StaffService {
  /**
   * Get all tenant assignments for a staff user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of tenant assignments
   */
  async getStaffAssignments(userId) {
    try {
      const staffUsers = await prisma.staff_users.findMany({
        where: { user_id: userId },
        include: {
          booking_staff: {
            select: {
              id: true,
              name: true,
              email: true,
              title: true
            }
          }
        }
      });

      // Get tenant details for each assignment
      const assignments = await Promise.all(
        staffUsers.map(async (su) => {
          const tenant = await prisma.booking_tenants.findUnique({
            where: { id: su.tenant_id },
            select: {
              id: true,
              business_name: true,
              business_type: true,
              site_id: true
            }
          });

          return {
            tenantId: su.tenant_id,
            staffId: su.staff_id,
            role: su.role,
            permissions: su.permissions,
            tenant: tenant,
            staff: su.booking_staff
          };
        })
      );

      return assignments;
    } catch (error) {
      console.error('Error getting staff assignments:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data for staff
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Dashboard data
   */
  async getDashboardData(tenantId, userId) {
    try {
      const staffUser = await prisma.staff_users.findUnique({
        where: {
          user_id_tenant_id: {
            user_id: userId,
            tenant_id: tenantId
          }
        },
        include: {
          booking_staff: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!staffUser) {
        throw new Error('Staff access not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's appointments
      const todayAppointments = await prisma.appointments.count({
        where: {
          tenant_id: tenantId,
          staff_id: staffUser.staff_id,
          start_time: {
            gte: today,
            lt: tomorrow
          },
          status: {
            not: 'cancelled'
          }
        }
      });

      // Get upcoming appointments (next 7 days)
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingAppointments = await prisma.appointments.findMany({
        where: {
          tenant_id: tenantId,
          staff_id: staffUser.staff_id,
          start_time: {
            gte: today,
            lt: nextWeek
          },
          status: {
            not: 'cancelled'
          }
        },
        orderBy: { start_time: 'asc' },
        take: 10,
        include: {
          booking_services: {
            select: {
              name: true
            }
          }
        }
      });

      // Get new orders count (if permitted)
      let newOrdersCount = 0;
      if (staffUser.permissions?.canViewOrders) {
        try {
          newOrdersCount = await prisma.orders.count({
            where: {
              site_id: {
                in: await this.getSiteIdsForTenant(tenantId)
              },
              status: 'new'
            }
          });
        } catch (e) {
          // Orders table might not exist
          console.warn('Could not fetch orders count:', e.message);
        }
      }

      return {
        todayAppointments,
        upcomingAppointments: upcomingAppointments.map(apt => ({
          id: apt.id,
          startTime: apt.start_time,
          endTime: apt.end_time,
          customerName: apt.customer_name,
          customerEmail: apt.customer_email,
          serviceName: apt.booking_services.name,
          status: apt.status,
          confirmationCode: apt.confirmation_code
        })),
        newOrdersCount,
        staffId: staffUser.staff_id,
        role: staffUser.role,
        canViewTeamSchedule: canViewTeamSchedule(staffUser)
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get appointments for staff member
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @returns {Promise<Array>} List of appointments
   */
  async getStaffAppointments(tenantId, userId, filters = {}) {
    try {
      const staffUser = await prisma.staff_users.findUnique({
        where: {
          user_id_tenant_id: {
            user_id: userId,
            tenant_id: tenantId
          }
        }
      });

      if (!staffUser) {
        throw new Error('Staff access not found');
      }

      const where = {
        tenant_id: tenantId,
        staff_id: staffUser.staff_id
      };

      if (filters.status && filters.status !== 'all') {
        where.status = filters.status;
      }

      if (filters.date) {
        const date = new Date(filters.date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        where.start_time = {
          gte: date,
          lt: nextDay
        };
      }

      const appointments = await prisma.appointments.findMany({
        where,
        include: {
          booking_services: {
            select: {
              name: true,
              duration_minutes: true
            }
          }
        },
        orderBy: { start_time: 'desc' },
        take: 100
      });

      return appointments.map(apt => ({
        id: apt.id,
        startTime: apt.start_time,
        endTime: apt.end_time,
        customerName: apt.customer_name,
        customerEmail: apt.customer_email,
        customerPhone: apt.customer_phone,
        serviceName: apt.booking_services.name,
        status: apt.status,
        confirmationCode: apt.confirmation_code,
        customerNotes: apt.customer_notes,
        totalPriceCents: apt.total_price_cents
      }));
    } catch (error) {
      console.error('Error getting staff appointments:', error);
      throw error;
    }
  }

  /**
   * Schedule board for a staff member.
   * scope=mine: only this person's appointments, full customer details.
   * scope=team: every active staff column. Colleague customer PII is hidden
   * unless the viewer is a manager or has canViewTeamSchedule.
   */
  async getSchedule(tenantId, userId, { from, to, scope = 'mine' } = {}) {
    const staffUser = await prisma.staff_users.findUnique({
      where: {
        user_id_tenant_id: {
          user_id: userId,
          tenant_id: tenantId
        }
      }
    });

    if (!staffUser) {
      throw new Error('Staff access not found');
    }

    const revealTeamDetails = canViewTeamSchedule(staffUser);
    const requestedScope = scope === 'team' ? 'team' : 'mine';

    const rangeFrom = from ? new Date(from) : startOfToday();
    let rangeTo = to ? new Date(to) : new Date(rangeFrom);
    if (!to) {
      rangeTo = new Date(rangeFrom);
      rangeTo.setDate(rangeTo.getDate() + (requestedScope === 'team' ? 1 : 7));
    }

    const staffList = await prisma.booking_staff.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { id: true, name: true, is_primary: true, display_order: true },
      orderBy: [{ is_primary: 'desc' }, { display_order: 'asc' }, { name: 'asc' }]
    });

    const where = {
      tenant_id: tenantId,
      start_time: { gte: rangeFrom, lt: rangeTo },
      status: { not: 'cancelled' }
    };
    if (requestedScope === 'mine') {
      where.staff_id = staffUser.staff_id;
    }

    const rows = await prisma.appointments.findMany({
      where,
      include: {
        booking_services: { select: { name: true, duration_minutes: true } },
        booking_staff: { select: { id: true, name: true } }
      },
      orderBy: { start_time: 'asc' }
    });

    const columns = (requestedScope === 'mine'
      ? staffList.filter((member) => member.id === staffUser.staff_id)
      : staffList
    ).map((member) => ({
      staffId: member.id,
      staffName: member.name,
      isSelf: member.id === staffUser.staff_id
    }));

    const appointments = rows.map((apt) => {
      const isSelf = apt.staff_id === staffUser.staff_id;
      const reveal = isSelf || revealTeamDetails;
      return {
        id: apt.id,
        staffId: apt.staff_id,
        staffName: apt.booking_staff?.name || 'Staff',
        startTime: apt.start_time,
        endTime: apt.end_time,
        serviceName: apt.booking_services?.name || 'Appointment',
        durationMinutes: apt.booking_services?.duration_minutes || null,
        status: apt.status,
        isSelf,
        privacy: reveal ? 'full' : 'busy',
        customerName: reveal ? apt.customer_name : null,
        customerPhone: reveal ? apt.customer_phone : null,
        customerEmail: reveal ? apt.customer_email : null,
        customerNotes: reveal ? apt.customer_notes : null
      };
    });

    return {
      scope: requestedScope,
      hasTeam: staffList.length > 1,
      canViewTeamDetails: revealTeamDetails,
      selfStaffId: staffUser.staff_id,
      range: { from: rangeFrom, to: rangeTo },
      columns,
      appointments
    };
  }

  /**
   * Get orders for tenant (if staff has permission)
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filter options
   * @returns {Promise<Array>} List of orders
   */
  async getStaffOrders(tenantId, filters = {}) {
    try {
      const siteIds = await this.getSiteIdsForTenant(tenantId);

      const where = {
        site_id: { in: siteIds }
      };

      if (filters.status && filters.status !== 'all') {
        where.status = filters.status;
      }

      const orders = await prisma.orders.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 100
      });

      return orders;
    } catch (error) {
      console.error('Error getting staff orders:', error);
      throw error;
    }
  }

  /**
   * Update appointment status
   * @param {string} appointmentId - Appointment ID
   * @param {string} tenantId - Tenant ID
   * @param {string} status - New status
   * @param {string} userId - User ID
   * @returns {Promise<object>} Updated appointment
   */
  async updateAppointmentStatus(appointmentId, tenantId, status, userId) {
    try {
      // Verify appointment belongs to tenant
      const appointment = await prisma.appointments.findFirst({
        where: {
          id: appointmentId,
          tenant_id: tenantId
        }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const updated = await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          status,
          updated_at: new Date()
        }
      });

      return updated;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} tenantId - Tenant ID
   * @param {string} status - New status
   * @param {string} userId - User ID
   * @returns {Promise<object>} Updated order
   */
  async updateOrderStatus(orderId, tenantId, status, userId) {
    try {
      const siteIds = await this.getSiteIdsForTenant(tenantId);

      const order = await prisma.orders.findFirst({
        where: {
          id: orderId,
          site_id: { in: siteIds }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const updated = await prisma.orders.update({
        where: { id: orderId },
        data: {
          status,
          updated_at: new Date()
        }
      });

      return updated;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Helper: Get site IDs for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of site IDs
   */
  async getSiteIdsForTenant(tenantId) {
    const tenant = await prisma.booking_tenants.findUnique({
      where: { id: tenantId },
      select: { site_id: true }
    });

    if (!tenant || !tenant.site_id) {
      return [];
    }

    return [tenant.site_id];
  }
}

function canViewTeamSchedule(staffUser) {
  if (!staffUser) return false;
  if (staffUser.role === 'manager') return true;
  return Boolean(staffUser.permissions?.canViewTeamSchedule);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export default StaffService;



