import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const publicDir = path.join(__dirname, '../../public');

// GET /api/users/:userId/sites
router.get('/:userId/sites', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sites = await prisma.sites.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        subdomain: true,
        template_id: true,
        status: true,
        plan: true,
        published_at: true,
        created_at: true,
        site_data: true
      },
      orderBy: { created_at: 'desc' }
    });

    const sitesResponse = sites.map(site => ({
      id: site.id,
      subdomain: site.subdomain,
      name: site.site_data?.brand?.name || 'Untitled Site',
      url: `/sites/${site.subdomain}/`,
      status: site.status,
      createdAt: site.published_at || site.created_at,
      plan: site.plan,
      template: site.template_id
    }));

    res.json({ sites: sitesResponse });
  } catch (error) {
    console.error('Error loading user sites:', error);
    res.status(500).json({ error: 'Failed to load sites' });
  }
});

// DELETE /api/users/:userId/sites/:siteId
router.delete('/:userId/sites/:siteId', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const siteId = req.params.siteId;

    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: {
        subdomain: true,
        user_id: true
      }
    });

    if (!site || site.user_id !== userId) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const subdomain = site.subdomain;

    await prisma.sites.delete({
      where: { id: siteId }
    });

    const sitePath = path.join(publicDir, 'sites', subdomain);
    try {
      await fs.rm(sitePath, { recursive: true, force: true });
    } catch (err) {
      console.error(`Error deleting site directory ${subdomain}:`, err.message);
    }

    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Error deleting site:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

// GET /api/users/:userId/analytics
router.get('/:userId/analytics', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const totalSites = await prisma.sites.count({
      where: { user_id: userId }
    });

    const publishedSites = await prisma.sites.count({
      where: {
        user_id: userId,
        status: 'published'
      }
    });

    res.json({
      totalSites,
      publishedSites
    });
  } catch (error) {
    console.error('Error loading user analytics:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;
