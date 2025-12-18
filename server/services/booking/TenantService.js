import { prisma } from '../../../database/db.js';

/**
 * Tenant Service - Manages booking tenants
 * Single Responsibility: Tenant lifecycle management
 */
class TenantService {
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
}

export default TenantService;



