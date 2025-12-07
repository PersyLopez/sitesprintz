/**
 * Gallery Service
 * 
 * Manages public showcase gallery functionality
 * - Query public sites
 * - Filter and search
 * - Opt-in/opt-out management
 * - Category statistics
 */

import { prisma } from '../../database/db.js';

class GalleryService {
  constructor() {
    this.defaultPageSize = 12;
    this.maxPageSize = 50;
  }

  /**
   * Get all public sites with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<{sites: Array, total: number, page: number, pageSize: number}>}
   */
  async getPublicSites(options = {}) {
    const {
      page = 1,
      pageSize = this.defaultPageSize,
      category = null,
      search = null,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    // Enforce page size limits
    const limit = Math.min(pageSize, this.maxPageSize);
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {
      is_public: true,
      status: 'published'
    };

    if (category) {
      where.template_id = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        // Add other searchable fields if needed
      ];
    }

    // Build sort
    const allowedSortFields = ['created_at', 'name', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const orderBy = { [safeSortBy]: safeSortOrder };

    try {
      const [sites, total] = await Promise.all([
        prisma.sites.findMany({
          where,
          select: {
            id: true,
            subdomain: true,
            template_id: true,
            status: true,
            plan: true,
            is_public: true,
            created_at: true,
            updated_at: true,
            site_data: true
          },
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.sites.count({ where })
      ]);

      return {
        sites,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error fetching public sites:', error);
      throw error;
    }
  }

  /**
   * Get a single public site by subdomain
   * @param {string} subdomain
   * @returns {Promise<Object|null>}
   */
  async getSiteBySubdomain(subdomain) {
    // Validate subdomain
    if (!subdomain || typeof subdomain !== 'string') {
      throw new Error('Invalid subdomain');
    }

    // Validate subdomain format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      throw new Error('Invalid subdomain');
    }

    try {
      const site = await prisma.sites.findFirst({
        where: {
          subdomain,
          is_public: true,
          status: 'published'
        },
        select: {
          id: true,
          subdomain: true,
          template_id: true,
          status: true,
          plan: true,
          is_public: true,
          created_at: true,
          updated_at: true,
          site_data: true,
          user_id: true
        }
      });
      return site;
    } catch (error) {
      console.error('Error fetching site by subdomain:', error);
      throw error;
    }
  }

  /**
   * Toggle public status for a site
   * @param {string} siteId
   * @param {string} userId
   * @param {boolean} isPublic
   * @returns {Promise<Object>}
   */
  async togglePublicStatus(siteId, userId, isPublic) {
    // Validate inputs
    if (!siteId || typeof siteId !== 'string') {
      throw new Error('Invalid site ID');
    }
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    try {
      // First verify ownership and status
      // Using updateMany to match the WHERE clause logic of original SQL
      // But updateMany doesn't return the updated record.
      // So we'll use findFirst then update.

      const site = await prisma.sites.findFirst({
        where: {
          id: siteId,
          user_id: userId,
          status: 'published'
        }
      });

      if (!site) {
        throw new Error('Site not found or unauthorized');
      }

      const updatedSite = await prisma.sites.update({
        where: { id: siteId },
        data: {
          is_public: isPublic,
          updated_at: new Date()
        },
        select: {
          id: true,
          subdomain: true,
          is_public: true,
          status: true
        }
      });

      return updatedSite;
    } catch (error) {
      console.error('Error toggling public status:', error);
      throw error;
    }
  }

  /**
   * Get available categories with counts
   * @returns {Promise<Array>}
   */
  async getCategories() {
    try {
      const groups = await prisma.sites.groupBy({
        by: ['template_id'],
        where: {
          is_public: true,
          status: 'published'
        },
        _count: {
          _all: true
        },
        orderBy: {
          _count: {
            template_id: 'desc'
          }
        }
      });

      return groups.map(group => ({
        template: group.template_id,
        count: group._count._all
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get gallery statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      // Get total count and max date
      const aggregate = await prisma.sites.aggregate({
        where: {
          is_public: true,
          status: 'published'
        },
        _count: {
          _all: true
        },
        _max: {
          created_at: true
        }
      });

      // Get distinct categories count
      // Prisma aggregate doesn't support COUNT(DISTINCT) directly easily
      // So we group by template_id and count the groups
      const categories = await prisma.sites.groupBy({
        by: ['template_id'],
        where: {
          is_public: true,
          status: 'published'
        }
      });

      return {
        totalPublic: aggregate._count._all,
        totalCategories: categories.length,
        latestDate: aggregate._max.created_at
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Validate if a site is eligible to be made public
   * @param {string} siteId
   * @returns {Promise<{eligible: boolean, reasons: Array}>}
   */
  async validatePublicEligibility(siteId) {
    try {
      const site = await prisma.sites.findUnique({
        where: { id: siteId },
        select: {
          status: true,
          plan: true,
          site_data: true
        }
      });

      if (!site) {
        return {
          eligible: false,
          reasons: ['Site not found']
        };
      }

      const reasons = [];

      // Check if published
      if (site.status !== 'published') {
        reasons.push('Site must be published');
      }

      // Check if has required content
      // Parse site_data if it's a string (Prisma might return it as string depending on schema)
      // Assuming site_data is Json in schema, Prisma returns object.
      // But just in case:
      const siteData = typeof site.site_data === 'string' ? JSON.parse(site.site_data) : (site.site_data || {});

      if (!siteData.hero?.title) {
        reasons.push('Site missing required content');
      }

      return {
        eligible: reasons.length === 0,
        reasons
      };
    } catch (error) {
      console.error('Error validating eligibility:', error);
      throw error;
    }
  }
}

export default GalleryService;

