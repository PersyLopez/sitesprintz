import { prisma } from '../../../database/db.js';

/**
 * Tenant Service - Manages booking tenants
 * Single Responsibility: Tenant lifecycle management
 */
class TenantService {
  /**
   * Get or create tenant for a user/site
   */
  /**
   * Prefer a site-scoped tenant when siteId is known (gallery demos share one owner).
   * Falls back to the first tenant for the user.
   */
  async getOrCreateTenant(userId, siteId) {
    try {
      const scopedSiteId = siteId ? String(siteId) : null;

      if (scopedSiteId) {
        const bySite = await prisma.booking_tenants.findFirst({
          where: {
            user_id: userId,
            OR: [{ site_id: scopedSiteId }, { site_id: siteId }],
          },
        });
        if (bySite) return bySite;
      } else {
        const existingTenant = await prisma.booking_tenants.findFirst({
          where: { user_id: userId },
        });
        if (existingTenant) return existingTenant;
      }

      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return prisma.booking_tenants.create({
        data: {
          user_id: userId,
          site_id: scopedSiteId,
          business_name: 'My Business',
          email: user.email,
          status: 'active',
        },
      });
    } catch (error) {
      console.error('Error getting/creating tenant:', error);
      throw error;
    }
  }
}

export default TenantService;







