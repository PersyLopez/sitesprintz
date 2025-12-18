/**
 * SEO Routes
 * Handles sitemap.xml, robots.txt, and SEO configuration endpoints
 * Migrated to Prisma ORM
 */

import express from 'express';
import SEOService from '../services/seoService.js';
import { prisma } from '../../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { sanitizeSiteDataForStorage } from '../utils/siteDataSanitizer.js';

const router = express.Router();
const seoService = new SEOService();

/**
 * GET /sitemap.xml
 * Generate and serve XML sitemap for a published site
 * Access: Public (subdomain-based routing)
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Extract subdomain from request (assumes middleware sets req.subdomain)
    const subdomain = req.subdomain || req.hostname.split('.')[0];

    if (!subdomain) {
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><error>Invalid subdomain</error>');
    }

    // Fetch site data using Prisma
    const site = await prisma.sites.findFirst({
      where: {
        subdomain,
        status: 'published'
      }
    });

    if (!site) {
      return res.status(404).send('<?xml version="1.0" encoding="UTF-8"?><error>Site not found</error>');
    }

    // Build pages array (customize based on site template/content)
    const pages = [
      { path: '/', priority: 1.0, changefreq: 'daily' },
      { path: '/services', priority: 0.8, changefreq: 'weekly' },
      { path: '/about', priority: 0.6, changefreq: 'monthly' },
      { path: '/contact', priority: 0.7, changefreq: 'monthly' }
    ];

    // Add dynamic pages if they exist (menu items, products, services, etc.)
    const customPages = site.site_data?.pages || [];
    customPages.forEach(page => {
      if (page.path && !pages.find(p => p.path === page.path)) {
        pages.push({
          path: page.path,
          priority: 0.6,
          changefreq: 'weekly'
        });
      }
    });

    // Generate sitemap
    const sitemap = await seoService.generateSitemap(
      subdomain,
      pages,
      {}
    );

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemap);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal server error</error>');
  }
});

/**
 * GET /robots.txt
 * Generate and serve robots.txt for a published site
 * Access: Public (subdomain-based routing)
 */
router.get('/robots.txt', async (req, res) => {
  try {
    // Extract subdomain from request
    const subdomain = req.subdomain || req.hostname.split('.')[0];

    if (!subdomain) {
      return res.status(400).send('User-agent: *\nDisallow: /');
    }

    // Fetch site data using Prisma
    const site = await prisma.sites.findFirst({
      where: {
        subdomain,
        status: 'published'
      }
    });

    if (!site) {
      return res.status(404).send('User-agent: *\nDisallow: /');
    }

    const seoConfig = {};

    // Generate robots.txt
    const robotsTxt = seoService.generateRobotsTxt(subdomain, {
      disallow: seoConfig.disallow || [],
      noindex: seoConfig.noindex || false
    });

    res.header('Content-Type', 'text/plain');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(robotsTxt);

  } catch (error) {
    console.error('Error generating robots.txt:', error);
    res.status(500).send('User-agent: *\nDisallow: /');
  }
});

/**
 * GET /api/seo/:subdomain
 * Get SEO configuration for a site
 * Access: Authenticated (site owner)
 */
router.get('/api/seo/:subdomain', authenticateToken, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userId = req.user.id;

    // Verify site ownership using Prisma
    const site = await prisma.sites.findFirst({
      where: {
        subdomain,
        user_id: userId
      }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found or access denied' });
    }

    // Generate meta tags
    const metaTags = seoService.generateMetaTags(site.site_data || {});

    // Get current SEO config
    const seoConfig = {
      metaTags: {},
      disallow: [],
      noindex: false
    };

    res.json({
      subdomain,
      seoConfig,
      generatedMetaTags: metaTags,
      canonicalUrl: seoService.getCanonicalUrl(subdomain, '/', {})
    });

  } catch (error) {
    console.error('Error fetching SEO config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/seo/:subdomain
 * Update SEO configuration for a site
 * Access: Authenticated (site owner)
 */
router.put('/api/seo/:subdomain', authenticateToken, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userId = req.user.id;
    const { metaTags, disallow, noindex } = req.body;

    // Verify site ownership using Prisma
    const site = await prisma.sites.findFirst({
      where: {
        subdomain,
        user_id: userId
      }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found or access denied' });
    }

    // Validate meta tags if provided
    if (metaTags) {
      const validation = seoService.validateMetaTags(metaTags);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid meta tags',
          validation
        });
      }
    }

    // Update SEO config (stored in site_data for now)
    const seoConfig = {
      metaTags: metaTags || {},
      disallow: disallow || [],
      noindex: noindex || false,
      updatedAt: new Date().toISOString()
    };

    // Sanitize site data before storing
    const currentSiteData = typeof site.site_data === 'string' 
      ? JSON.parse(site.site_data) 
      : site.site_data || {};
    
    const updatedSiteData = {
      ...currentSiteData,
      seo: seoConfig
    };
    
    // Sanitize site data to prevent XSS
    const sanitizedSiteData = sanitizeSiteDataForStorage(updatedSiteData);

    // Store sanitized site_data
    await prisma.sites.update({
      where: { id: site.id },
      data: {
        site_data: sanitizedSiteData
      }
    });

    res.json({
      success: true,
      seoConfig
    });

  } catch (error) {
    console.error('Error updating SEO config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/seo/:subdomain/schema
 * Get Schema.org markup for a site
 * Access: Public
 */
router.get('/api/seo/:subdomain/schema', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Fetch site data using Prisma
    const site = await prisma.sites.findFirst({
      where: {
        subdomain,
        status: 'published'
      }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const siteData = site.site_data || {};

    // Determine schema type from template category
    const category = siteData.category || 'consultant';

    // Generate Schema.org markup
    const schema = seoService.generateSchemaMarkup(category, siteData);

    res.json(schema);

  } catch (error) {
    console.error('Error generating schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/seo/:subdomain/validate
 * Validate SEO configuration and get recommendations
 * Access: Authenticated (site owner)
 */
router.post('/api/seo/:subdomain/validate', authenticateToken, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userId = req.user.id;
    const { metaTags } = req.body;

    // Verify site ownership using Prisma
    const site = await prisma.sites.findFirst({
      where: {
        subdomain,
        user_id: userId
      }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found or access denied' });
    }

    // Validate meta tags
    const validation = seoService.validateMetaTags(metaTags);

    res.json({
      validation,
      recommendations: [
        ...(validation.errors.length > 0 ? ['Fix errors before publishing'] : []),
        ...(validation.warnings.length > 0 ? ['Consider addressing warnings for better SEO'] : []),
        'Add alt tags to all images',
        'Ensure mobile responsiveness',
        'Use HTTPS for all resources'
      ]
    });

  } catch (error) {
    console.error('Error validating SEO:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
