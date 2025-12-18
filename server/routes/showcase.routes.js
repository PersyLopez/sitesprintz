/**
 * Showcase Routes
 * Handles public gallery of sites
 * Uses standardized API responses and Prisma ORM
 */

import express from 'express';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';
import { validateSubdomain } from '../utils/validators.js';

const router = express.Router();

/**
 * Helper: Parse site_data from database
 */
function parseSiteData(site) {
  if (!site?.site_data) return {};
  if (typeof site.site_data === 'string') {
    try {
      return JSON.parse(site.site_data);
    } catch (e) {
      return {};
    }
  }
  return site.site_data;
}

/**
 * GET /api/showcases
 * List public sites with filtering and pagination
 * Access: Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    page: pageParam = '1',
    pageSize: pageSizeParam = '12',
    category,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const pageSize = Math.min(Math.max(1, parseInt(pageSizeParam, 10) || 12), 50);
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where = {
    is_public: true,
    status: 'published'
  };

  // Filter by category (template prefix)
  if (category) {
    where.template_id = { startsWith: String(category).substring(0, 50) };
  }

  // Build orderBy
  const validSortFields = ['created_at', 'subdomain'];
  let orderBy;

  if (sortBy === 'name') {
    orderBy = { created_at: sortOrder === 'asc' ? 'asc' : 'desc' };
  } else if (validSortFields.includes(sortBy)) {
    orderBy = { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };
  } else {
    orderBy = { created_at: 'desc' };
  }

  // Fetch more sites if searching (for in-memory filtering)
  const fetchSize = search ? pageSize * 3 : pageSize;
  const fetchSkip = search ? 0 : skip;

  const [sites, totalCount] = await Promise.all([
    prisma.sites.findMany({
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
    }),
    prisma.sites.count({ where })
  ]);

  // Map to response format
  let sitesResponse = sites.map(site => {
    const siteData = parseSiteData(site);
    return {
      id: site.id,
      subdomain: site.subdomain,
      template: site.template_id,
      status: site.status,
      plan: site.plan,
      name: siteData?.brand?.name || site.subdomain,
      heroImage: siteData?.hero?.image || null,
      createdAt: site.created_at
    };
  });

  // Filter by search term (in memory)
  let total = totalCount;
  if (search) {
    const searchLower = String(search).toLowerCase();
    sitesResponse = sitesResponse.filter(site =>
      site.name.toLowerCase().includes(searchLower) ||
      site.subdomain.toLowerCase().includes(searchLower)
    );
    total = sitesResponse.length;
    sitesResponse = sitesResponse.slice(skip, skip + pageSize);
  }

  // Sort by name if requested
  if (sortBy === 'name') {
    sitesResponse.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  return sendSuccess(res, {
    sites: sitesResponse,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}));

/**
 * GET /api/showcases/categories
 * Get list of template categories with counts
 * Access: Public
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const sites = await prisma.sites.findMany({
    where: {
      is_public: true,
      status: 'published'
    },
    select: {
      template_id: true
    }
  });

  // Group by template prefix
  const categoryMap = new Map();
  sites.forEach(site => {
    const template = site.template_id?.split('-')[0] || 'other';
    categoryMap.set(template, (categoryMap.get(template) || 0) + 1);
  });

  // Convert to array and sort by count
  const categories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return sendSuccess(res, { categories });
}));

/**
 * GET /api/showcases/stats
 * Get gallery statistics
 * Access: Public
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const [totalPublic, sites] = await Promise.all([
    prisma.sites.count({
      where: {
        is_public: true,
        status: 'published'
      }
    }),
    prisma.sites.findMany({
      where: {
        is_public: true,
        status: 'published'
      },
      select: {
        template_id: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' },
      take: 1
    })
  ]);

  // Count unique template prefixes
  const allTemplates = await prisma.sites.findMany({
    where: {
      is_public: true,
      status: 'published'
    },
    select: { template_id: true }
  });

  const uniqueCategories = new Set();
  allTemplates.forEach(site => {
    const template = site.template_id?.split('-')[0];
    if (template) uniqueCategories.add(template);
  });

  return sendSuccess(res, {
    totalPublic,
    totalCategories: uniqueCategories.size,
    latestDate: sites[0]?.created_at || null
  });
}));

/**
 * GET /api/showcases/featured
 * Get featured/highlighted sites
 * Access: Public
 */
router.get('/featured', asyncHandler(async (req, res) => {
  const { limit = 6 } = req.query;

  // Get latest published public sites as "featured"
  const sites = await prisma.sites.findMany({
    where: {
      is_public: true,
      status: 'published'
    },
    select: {
      id: true,
      subdomain: true,
      template_id: true,
      plan: true,
      site_data: true,
      created_at: true
    },
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 6, 20)
  });

  const featured = sites.map(site => {
    const siteData = parseSiteData(site);
    return {
      id: site.id,
      subdomain: site.subdomain,
      template: site.template_id,
      plan: site.plan,
      name: siteData?.brand?.name || site.subdomain,
      heroImage: siteData?.hero?.image || null,
      description: siteData?.hero?.subtitle || null,
      createdAt: site.created_at
    };
  });

  return sendSuccess(res, { featured });
}));

/**
 * GET /api/showcases/:subdomain
 * Get specific public site by subdomain
 * Access: Public
 */
router.get('/:subdomain', asyncHandler(async (req, res) => {
  const { subdomain } = req.params;

  // Validate subdomain
  const subdomainValidation = validateSubdomain(subdomain);
  if (!subdomainValidation.valid) {
    return sendBadRequest(res, subdomainValidation.error, 'INVALID_SUBDOMAIN');
  }

  const site = await prisma.sites.findFirst({
    where: {
      subdomain: subdomainValidation.value,
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
    return sendNotFound(res, 'Site not found or not public', 'SITE_NOT_FOUND');
  }

  const siteData = parseSiteData(site);

  return sendSuccess(res, {
    site: {
      id: site.id,
      subdomain: site.subdomain,
      template: site.template_id,
      status: site.status,
      plan: site.plan,
      name: siteData?.brand?.name || site.subdomain,
      data: siteData,
      createdAt: site.created_at
    }
  });
}));

export default router;
