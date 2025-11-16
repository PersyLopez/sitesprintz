/**
 * Gallery Service
 * 
 * Manages public showcase gallery functionality
 * - Query public sites
 * - Filter and search
 * - Opt-in/opt-out management
 * - Category statistics
 */

import { pool } from '../../database/db.js';

const db = { query: (...args) => pool.query(...args) };

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

    // Build query
    let query = `
      SELECT 
        id, subdomain, template_id, status, plan, is_public,
        created_at, updated_at,
        site_data
      FROM sites
      WHERE is_public = TRUE AND status = $1
    `;
    const params = ['published'];
    let paramIndex = 2;

    // Add category filter
    if (category) {
      query += ` AND template_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Add search filter
    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add sorting
    const allowedSortFields = ['created_at', 'name', 'updated_at'];
    const allowedSortOrders = ['asc', 'desc'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = allowedSortOrders.includes(sortOrder.toLowerCase()) 
      ? sortOrder.toUpperCase() 
      : 'DESC';

    query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    try {
      const result = await db.query(query, params);

      return {
        sites: result.rows,
        total: result.rowCount,
        page,
        pageSize: limit,
        totalPages: Math.ceil(result.rowCount / limit)
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

    const query = `
      SELECT 
        id, subdomain, template_id, status, plan, is_public,
        created_at, updated_at,
        site_data, user_id
      FROM sites
      WHERE subdomain = $1 AND is_public = TRUE AND status = $2
    `;

    try {
      const result = await db.query(query, [subdomain, 'published']);
      return result.rows[0] || null;
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

    const query = `
      UPDATE sites
      SET is_public = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3 AND status = $4
      RETURNING id, subdomain, is_public, status
    `;

    try {
      const result = await db.query(query, [isPublic, siteId, userId, 'published']);

      if (result.rowCount === 0) {
        throw new Error('Site not found or unauthorized');
      }

      return result.rows[0];
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
    const query = `
      SELECT template_id, COUNT(*) as count
      FROM sites
      WHERE is_public = TRUE AND status = $1
      GROUP BY template_id
      ORDER BY count DESC
    `;

    try {
      const result = await db.query(query, ['published']);
      return result.rows.map(row => ({
        template: row.template_id,
        count: parseInt(row.count, 10)
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
    const query = `
      SELECT 
        COUNT(*) as total_public,
        COUNT(DISTINCT template_id) as total_categories,
        MAX(created_at) as latest_date
      FROM sites
      WHERE is_public = TRUE AND status = $1
    `;

    try {
      const result = await db.query(query, ['published']);
      const row = result.rows[0];

      return {
        totalPublic: parseInt(row.total_public, 10),
        totalCategories: parseInt(row.total_categories, 10),
        latestDate: row.latest_date
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
    const query = `
      SELECT status, plan, site_data
      FROM sites
      WHERE id = $1
    `;

    try {
      const result = await db.query(query, [siteId]);

      if (result.rowCount === 0) {
        return {
          eligible: false,
          reasons: ['Site not found']
        };
      }

      const site = result.rows[0];
      const reasons = [];

      // Check if published
      if (site.status !== 'published') {
        reasons.push('Site must be published');
      }

      // Check if has required content
      const siteData = site.site_data || {};
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

