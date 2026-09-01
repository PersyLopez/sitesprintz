/**
 * Share Card API Routes (TDD Implementation)
 * 
 * Endpoints:
 * - POST /api/share/generate - Generate share card
 * - GET /api/share/:subdomain/:format - Get cached share card
 * - DELETE /api/share/:subdomain - Clear cache for subdomain
 */

import express from 'express';
import NodeCache from 'node-cache';
import { generateShareCard, generateQrPng } from '../services/shareCardService.js';
import { prisma } from '../../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import { toPublicSiteData } from '../../src/utils/liveSiteContact.js';
import { getAbsolutePublishedSiteUrl } from '../../src/utils/siteWorkspace.js';

const router = express.Router();

// Cache for generated cards (TTL: 1 hour)
const shareCardCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false // Store buffers directly
});

const CARD_CACHE_VERSION = 'v4';

function cardCacheKey(subdomain, format) {
  return `${subdomain}:${format}:${CARD_CACHE_VERSION}`;
}

function sharePngFilename(subdomain, format) {
  const safe = String(subdomain || 'site').replace(/[^A-Za-z0-9._-]+/g, '-');
  if (format === 'qr') return `${safe}-qr.png`;
  if (format === 'social') return `${safe}-social.png`;
  return `${safe}-flyer-${format}.png`;
}

function sendSharePng(res, buffer, { cacheStatus, subdomain, format }) {
  const disposition = format === 'social' ? 'inline' : 'attachment';
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=3600');
  res.set('X-Cache', cacheStatus);
  res.set('Content-Disposition', `${disposition}; filename="${sharePngFilename(subdomain, format)}"`);
  return res.send(buffer);
}

/**
 * Rate limiter for share card generation
 * Prevents abuse (max 10 cards per minute per IP)
 */
const rateLimits = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (!limit) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (now > limit.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 10) {
    return false;
  }

  limit.count++;
  return true;
}

// Clean up rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimits.entries()) {
    if (now > limit.resetAt) {
      rateLimits.delete(ip);
    }
  }
}, 300000);

/**
 * POST /api/share/generate
 * Generate a share card for a site
 * 
 * Body:
 * - subdomain: string (required)
 * - format: 'social' | 'story' | 'square' (default: 'social')
 * 
 * Response:
 * - image/png buffer
 * 
 * Errors:
 * - 400: Invalid request
 * - 404: Site not found
 * - 429: Rate limit exceeded
 * - 500: Generation failed
 */
router.post('/generate', async (req, res) => {
  try {
    const { subdomain, format = 'social' } = req.body;

    // Validate input
    if (!subdomain || typeof subdomain !== 'string') {
      return res.status(400).json({
        error: 'Invalid subdomain'
      });
    }

    if (!['social', 'story', 'square'].includes(format)) {
      return res.status(400).json({
        error: 'Invalid format. Must be: social, story, or square'
      });
    }

    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Max 10 cards per minute.'
      });
    }

    // Check cache first
    const cacheKey = cardCacheKey(subdomain, format);
    const cached = shareCardCache.get(cacheKey);

    if (cached) {
      console.log(`✅ Share card cache HIT: ${cacheKey}`);
      return sendSharePng(res, cached, { cacheStatus: 'HIT', subdomain, format });
    }

    // Fetch site data
    const site = await prisma.sites.findUnique({
      where: { subdomain },
      select: { site_data: true }
    });

    if (!site) {
      return res.status(404).json({
        error: 'Site not found'
      });
    }

    const templateData = toPublicSiteData(typeof site.site_data === 'string'
      ? JSON.parse(site.site_data)
      : site.site_data);

    // Add subdomain to template data if not present
    if (!templateData.subdomain) {
      templateData.subdomain = subdomain;
    }

    // Generate card
    console.log(`🎨 Generating share card: ${subdomain} (${format})`);
    const cardBuffer = await generateShareCard(templateData, format);

    // Cache the result
    shareCardCache.set(cacheKey, cardBuffer);
    console.log(`✅ Share card cached: ${cacheKey}`);

    return sendSharePng(res, cardBuffer, { cacheStatus: 'MISS', subdomain, format });

  } catch (error) {
    console.error('Share card generation error:', error);
    res.status(500).json({
      error: 'Failed to generate share card',
      message: error.message
    });
  }
});

/**
 * GET /api/share/:subdomain/:format
 * Get share card (cached or generate)
 * 
 * Params:
 * - subdomain: string
 * - format: 'social' | 'story' | 'square'
 * 
 * Response:
 * - image/png buffer
 */
const getShareCard = async (req, res) => {
  try {
    const subdomain = req.params.subdomain;
    const format = req.params.format || 'social';

    // Validate format
    if (!['social', 'story', 'square', 'qr'].includes(format)) {
      return res.status(400).json({
        error: 'Invalid format'
      });
    }

    // Dedicated QR PNG of the live production URL
    if (format === 'qr') {
      const cacheKey = cardCacheKey(subdomain, 'qr');
      const cachedQr = shareCardCache.get(cacheKey);

      if (cachedQr) {
        return sendSharePng(res, cachedQr, { cacheStatus: 'HIT', subdomain, format: 'qr' });
      }

      const clientIp = req.ip || req.connection.remoteAddress;
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({
          error: 'Rate limit exceeded'
        });
      }

      const qrSite = await prisma.sites.findUnique({
        where: { subdomain },
        select: { subdomain: true }
      });

      if (!qrSite) {
        return res.status(404).json({
          error: 'Site not found'
        });
      }

      const qrBuffer = await generateQrPng(getAbsolutePublishedSiteUrl(subdomain));
      shareCardCache.set(cacheKey, qrBuffer);
      return sendSharePng(res, qrBuffer, { cacheStatus: 'MISS', subdomain, format: 'qr' });
    }

    // Check cache
    const cacheKey = cardCacheKey(subdomain, format);
    const cached = shareCardCache.get(cacheKey);

    if (cached) {
      return sendSharePng(res, cached, { cacheStatus: 'HIT', subdomain, format });
    }

    // Rate limit only on cache miss / generation (OG crawlers can re-fetch cached PNGs)
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Rate limit exceeded'
      });
    }

    // Not cached, generate
    const site = await prisma.sites.findUnique({
      where: { subdomain },
      select: { site_data: true }
    });

    if (!site) {
      return res.status(404).json({
        error: 'Site not found'
      });
    }

    const templateData = toPublicSiteData(typeof site.site_data === 'string'
      ? JSON.parse(site.site_data)
      : site.site_data);

    if (!templateData.subdomain) {
      templateData.subdomain = subdomain;
    }

    const cardBuffer = await generateShareCard(templateData, format);
    shareCardCache.set(cacheKey, cardBuffer);
    return sendSharePng(res, cardBuffer, { cacheStatus: 'MISS', subdomain, format });

  } catch (error) {
    console.error('Share card fetch error:', error);
    res.status(500).json({
      error: 'Failed to get share card',
      message: error.message
    });
  }
};

// Register both routes (with and without format)
router.get('/:subdomain/:format', getShareCard);
router.get('/:subdomain', getShareCard);

/**
 * DELETE /api/share/:subdomain
 * Clear cache for a subdomain (requires auth)
 * 
 * Params:
 * - subdomain: string
 * 
 * Response:
 * - { success: true, cleared: number }
 */
router.delete('/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Verify user owns this site
    const site = await prisma.sites.findUnique({
      where: { subdomain },
      select: { user_id: true }
    });

    if (!site) {
      return res.status(404).json({
        error: 'Site not found'
      });
    }

    if (site.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Not authorized to clear cache for this site'
      });
    }

    // Clear all format variants
    const formats = ['social', 'story', 'square', 'qr'];
    let cleared = 0;

    for (const format of formats) {
      const cacheKey = cardCacheKey(subdomain, format);
      if (shareCardCache.del(cacheKey)) {
        cleared++;
      }
    }

    console.log(`🗑️  Cleared ${cleared} share card(s) for: ${subdomain}`);

    res.json({
      success: true,
      cleared,
      message: `Cache cleared for ${subdomain}`
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/share/stats
 * Get cache statistics (admin only)
 */
router.get('/admin/stats', requireAuth, (req, res) => {
  // Only admins can view stats
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const stats = shareCardCache.getStats();
  res.json({
    ...stats,
    currentEntries: shareCardCache.keys().length
  });
});

export default router;

