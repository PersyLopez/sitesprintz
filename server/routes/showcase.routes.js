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
import { toPublicSiteData } from '../../src/utils/liveSiteContact.js';
import { visitorOnlinePaymentReady } from '../services/payments/processorConnectHelpers.js';

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
 * Load only gallery-card JSON paths for a set of site ids (avoids ~25KB/site blobs).
 */
async function loadShowcaseCardMeta(ids) {
  if (!ids.length) return new Map();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       id,
       site_data #>> '{brand,name}' AS name,
       site_data #>> '{hero,image}' AS "heroImage",
       COALESCE(
         site_data #>> '{galleryTheme,id}',
         site_data #>> '{colors,themeId}',
         site_data ->> '_themeId'
       ) AS "themeId",
       site_data #>> '{galleryTheme,name}' AS "themeName",
       COALESCE(
         site_data #>> '{galleryTheme,mode}',
         site_data #>> '{colors,mode}'
       ) AS "themeMode",
       COALESCE(
         site_data #>> '{colors,accent}',
         site_data #>> '{colors,primary}'
       ) AS "themeAccent"
     FROM sites
     WHERE id IN (${placeholders})`,
    ...ids
  );
  return new Map(rows.map((row) => [row.id, row]));
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
    sortBy = 'featured',
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
  } else if (sortBy === 'featured') {
    orderBy = [{ is_featured: 'desc' }, { created_at: 'desc' }];
  } else if (validSortFields.includes(sortBy)) {
    orderBy = { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };
  } else {
    orderBy = [{ is_featured: 'desc' }, { created_at: 'desc' }];
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
        created_at: true
      },
      orderBy,
      skip: fetchSkip,
      take: fetchSize
    }),
    prisma.sites.count({ where })
  ]);

  const cardMeta = await loadShowcaseCardMeta(sites.map((site) => site.id));

  // Map to response format
  let sitesResponse = sites.map(site => {
    const card = cardMeta.get(site.id) || {};
    return {
      id: site.id,
      subdomain: site.subdomain,
      template: site.template_id,
      status: site.status,
      plan: site.plan,
      name: card.name || site.subdomain,
      heroImage: card.heroImage || null,
      createdAt: site.created_at,
      themeId: card.themeId || null,
      themeName: card.themeName || null,
      themeMode: card.themeMode || null,
      themeAccent: card.themeAccent || null,
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

  // Prefer explicitly featured public sites, then newest
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
    orderBy: [
      { is_featured: 'desc' },
      { created_at: 'desc' }
    ],
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
      user_id: true,
      created_at: true,
      users: { select: { stripe_connected: true, stripe_account_id: true } },
    }
  });

  if (!site) {
    return sendNotFound(res, 'Site not found or not public', 'SITE_NOT_FOUND');
  }

  const siteData = toPublicSiteData(parseSiteData(site));

  return sendSuccess(res, {
    site: {
      id: site.id,
      subdomain: site.subdomain,
      template: site.template_id,
      status: site.status,
      plan: site.plan,
      name: siteData?.brand?.name || site.subdomain,
      data: siteData,
      userId: site.user_id,
      stripe_connected: site.users?.stripe_connected === true,
      online_payment_ready: visitorOnlinePaymentReady({ user: site.users }),
      createdAt: site.created_at
    }
  });
}));

export default router;
