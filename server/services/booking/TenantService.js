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
        const adopted = await this.adoptExistingSiteTenant(userId, scopedSiteId);
        if (adopted) return adopted;
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

  /**
   * After a claim, the prospect tenant is still keyed to the previous owner.
   * If this user now owns the site, take over that tenant instead of seeding
   * an empty "My Business" copy.
   */
  async adoptExistingSiteTenant(userId, scopedSiteId) {
    if (typeof prisma.sites?.findFirst !== 'function') return null;

    const ownedSite = await prisma.sites.findFirst({
      where: {
        user_id: userId,
        OR: [{ id: scopedSiteId }, { subdomain: scopedSiteId }],
      },
      select: { id: true },
    });
    if (!ownedSite) return null;

    const existing = await prisma.booking_tenants.findFirst({
      where: {
        OR: [{ site_id: String(ownedSite.id) }, { site_id: scopedSiteId }],
      },
    });
    if (!existing) return null;
    if (existing.user_id === userId) return existing;
    return prisma.booking_tenants.update({
      where: { id: existing.id },
      data: { user_id: userId },
    });
  }
}

export default TenantService;







