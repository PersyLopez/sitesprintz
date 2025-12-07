/**
 * Showcase Routes
 * Handles public gallery of sites and showcase generation
 * Migrated to Prisma ORM for type safety and better query building
 */

import express from 'express';
import ShowcaseService from '../services/showcaseService.js';
import { authenticateToken } from '../middleware/auth.js';
import { prisma } from '../../database/prisma.js';

const router = express.Router();
console.log('Showcase routes module loaded');
const showcaseService = new ShowcaseService();

/**
 * GET /api/showcases
 * List public sites with filtering and pagination
 * Access: Public
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 12)
 * - category: Filter by template (e.g., 'restaurant')
 * - search: Search by site name
 * - sortBy: Sort field (default: 'created_at')
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 */
router.get('/', async (req, res) => {
  try {
    const {
      page: pageParam = '1',
      pageSize: pageSizeParam = '12',
      category,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const page = parseInt(pageParam, 10) || 1;
    const pageSize = parseInt(pageSizeParam, 10) || 12;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where = {
      is_public: true,
      status: 'published'
    };

    // Filter by category (template prefix)
    if (category) {
      where.template_id = {
        startsWith: category
      };
    }

    // Search by name (in site_data JSON)
    // Prisma doesn't have great JSON path support yet, so we'll fetch all and filter in memory
    // For production, consider using raw SQL or upgrading when Prisma improves JSON support

    // Get total count
    let total = await prisma.sites.count({ where });

    // Build orderBy
    const validSortFields = ['created_at', 'subdomain'];
    let orderBy;

    if (sortBy === 'name') {
      // Prisma doesn't support ordering by JSON path directly in the same way
      // We'll fetch and sort in memory for now (acceptable for paginated results)
      orderBy = { created_at: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else if (validSortFields.includes(sortBy)) {
      orderBy = { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else {
      orderBy = { created_at: 'desc' };
    }

    // Fetch more sites than needed if we're searching, to account for filtering
    const fetchSize = search ? pageSize * 3 : pageSize;
    const fetchSkip = search ? 0 : skip;

    // Fetch sites
    let sites = await prisma.sites.findMany({
      where,
      select: {
        id: true,
        subdomain: true,
        template_id: true,
        status: true,
        plan: true,
        site_data: true,
        created_at: true
      },
      orderBy,
      skip: fetchSkip,
      take: fetchSize
    });

    // Map to response format
    let sitesResponse = sites.map(site => ({
      id: site.id,
      subdomain: site.subdomain,
      template: site.template_id,
      status: site.status,
      plan: site.plan,
      name: site.site_data?.brand?.name || site.subdomain,
      created_at: site.created_at
    }));

    // Filter by search term (in memory)
    if (search) {
      sitesResponse = sitesResponse.filter(site =>
        site.name.toLowerCase().includes(search.toLowerCase())
      );
      total = sitesResponse.length;
      // Apply pagination after filtering
      sitesResponse = sitesResponse.slice(skip, skip + pageSize);
    }

    // Sort by name if requested (in memory)
    if (sortBy === 'name') {
      sitesResponse.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    res.json({
      success: true,
      sites: sitesResponse,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error listing showcases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list showcases'
    });
  }
});

/**
 * GET /api/showcases/categories
 * Get list of template categories with counts
 * Access: Public
 */
router.get('/categories', async (req, res) => {
  try {
    // Get all public sites grouped by template prefix
    const sites = await prisma.sites.findMany({
      where: {
        is_public: true,
        status: 'published'
      },
      select: {
        template_id: true
      }
    });

    // Group by template prefix (everything before first hyphen)
    const categoryMap = new Map();
    sites.forEach(site => {
      const template = site.template_id?.split('-')[0] || 'unknown';
      categoryMap.set(template, (categoryMap.get(template) || 0) + 1);
    });

    // Convert to array and sort by count
    const categories = Array.from(categoryMap.entries())
      .map(([template, count]) => ({ template, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
});

/**
 * GET /api/showcases/stats
 * Get gallery statistics
 * Access: Public
 */
router.get('/stats', async (req, res) => {
  try {
    // Count total public sites
    const totalPublic = await prisma.sites.count({
      where: {
        is_public: true,
        status: 'published'
      }
    });

    // Get unique categories
    const sites = await prisma.sites.findMany({
      where: {
        is_public: true,
        status: 'published'
      },
      select: {
        template_id: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 1
    });

    // Count unique template prefixes
    const allSites = await prisma.sites.findMany({
      where: {
        is_public: true,
        status: 'published'
      },
      select: {
        template_id: true
      }
    });

    const uniqueCategories = new Set();
    allSites.forEach(site => {
      const template = site.template_id?.split('-')[0];
      if (template) uniqueCategories.add(template);
    });

    res.json({
      success: true,
      totalPublic,
      totalCategories: uniqueCategories.size,
      latestDate: sites[0]?.created_at || null
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

/**
 * GET /api/showcases/:subdomain
 * Get specific public site by subdomain
 * Access: Public
 */
router.get('/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Validate subdomain format
    const subdomainRegex = /^[a-zA-Z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subdomain format'
      });
    }

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
        site_data: true,
        created_at: true
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found or not public'
      });
    }

    res.json({
      success: true,
      site: {
        id: site.id,
        subdomain: site.subdomain,
        template: site.template_id,
        status: site.status,
        plan: site.plan,
        site_data: site.site_data,
        name: site.site_data?.brand?.name || site.subdomain,
        created_at: site.created_at
      }
    });
  } catch (error) {
    console.error('Error getting site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get site'
    });
  }
});

export default router;
