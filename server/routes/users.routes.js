import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserFilePath } from '../utils/helpers.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');
const usersDir = path.join(publicDir, 'users');
const sitesDir = path.join(publicDir, 'sites');

// User invitation system endpoints
router.post('/admin/invite-user', requireAuth, async (req, res) => {
    try {
        const { email, role = 'user' } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user already exists
        const userPath = getUserFilePath(email);

        if (await fs.access(userPath).then(() => true).catch(() => false)) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const tempPasswordExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create user account
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const userData = {
            id: email.replace('@', '_at_').replace('.', '_dot_'),
            email: email,
            password: hashedPassword,
            role: role,
            status: 'invited',
            tempPassword: tempPassword,
            tempPasswordExpires: tempPasswordExpires.toISOString(),
            createdAt: new Date().toISOString(),
            lastLogin: null,
            sites: []
        };

        // Save user data
        await fs.writeFile(userPath, JSON.stringify(userData, null, 2));

        // Send invitation email
        await sendEmail(email, EmailTypes.INVITATION, { email, tempPassword });

        console.log(`✅ Invitation email sent to ${email}`);

        res.json({
            message: 'User invitation sent successfully',
            email: email,
            loginUrl: `${req.protocol}://${req.get('host')}/login.html`
        });
    } catch (error) {
        console.error('Error creating user invitation:', error);
        res.status(500).json({ error: 'Failed to create user invitation' });
    }
});

// List all users (admin only)
router.get('/admin/users', requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = [];
        const userFiles = await fs.readdir(usersDir);

        for (const userFile of userFiles) {
            if (userFile.endsWith('.json')) {
                try {
                    const userData = JSON.parse(await fs.readFile(path.join(usersDir, userFile), 'utf-8'));
                    // Don't include sensitive data
                    users.push({
                        id: userData.id,
                        email: userData.email,
                        role: userData.role,
                        status: userData.status,
                        createdAt: userData.createdAt,
                        lastLogin: userData.lastLogin,
                        sitesCount: userData.sites ? userData.sites.length : 0
                    });
                } catch (err) {
                    console.error(`Error reading user file ${userFile}:`, err.message);
                }
            }
        }

        // Sort by creation date (newest first)
        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ users });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

// User site management endpoints
router.get('/users/:userId/sites', requireAuth, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Verify user can only access their own sites
        if (req.user.id !== userId && req.user.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Load sites from database
        const sites = await prisma.sites.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                subdomain: true,
                template_id: true,
                status: true,
                plan: true,
                published_at: true,
                created_at: true,
                site_data: true
            }
        });

        const formattedSites = sites.map(site => ({
            id: site.id,
            subdomain: site.subdomain,
            name: site.site_data?.brand?.name || 'Untitled Site',
            url: `/sites/${site.subdomain}/`,
            status: site.status,
            createdAt: site.published_at || site.created_at,
            plan: site.plan,
            template: site.template_id
        }));

        res.json({ sites: formattedSites });
    } catch (error) {
        console.error('Error loading user sites:', error);
        res.status(500).json({ error: 'Failed to load sites' });
    }
});

// Delete user site
router.delete('/users/:userId/sites/:siteId', requireAuth, async (req, res) => {
    try {
        const userId = req.params.userId;
        const siteId = req.params.siteId;

        // Verify user can only delete their own sites
        if (req.user.id !== userId && req.user.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check if site exists and belongs to user
        const site = await prisma.sites.findFirst({
            where: { id: siteId, user_id: userId },
            select: { subdomain: true }
        });

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const subdomain = site.subdomain;

        // Delete from database (CASCADE will delete related submissions and analytics)
        await prisma.sites.delete({
            where: { id: siteId }
        });

        // Delete the site directory from file system
        const sitePath = path.join(sitesDir, subdomain);
        try {
            await fs.rm(sitePath, { recursive: true, force: true });
        } catch (err) {
            console.error(`Error deleting site directory ${subdomain}:`, err.message);
            // Continue even if file deletion fails - database record is gone
        }

        res.json({ message: 'Site deleted successfully' });
    } catch (error) {
        console.error('Error deleting site:', error);
        res.status(500).json({ error: 'Failed to delete site' });
    }
});

// Get user analytics
router.get('/users/:userId/analytics', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;

        // Users can only view their own analytics unless they're admin
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Load user data
        const userPath = getUserFilePath(req.user.email);
        const userData = JSON.parse(await fs.readFile(userPath, 'utf-8'));

        // Get user's sites
        const userSites = userData.sites || [];

        const sitesAnalytics = [];
        let totalViews = 0;
        let viewsThisMonth = 0;
        let publishedCount = 0;
        let draftCount = 0;

        // Analyze each site
        for (const siteId of userSites) {
            try {
                const sitePath = path.join(sitesDir, siteId, 'site.json');
                const siteData = JSON.parse(await fs.readFile(sitePath, 'utf-8'));

                // Generate mock analytics (in production, this would come from real tracking)
                const views = Math.floor(Math.random() * 1000);
                const viewsLast7Days = Math.floor(Math.random() * 100);

                totalViews += views;

                // Count published vs draft
                if (siteData.status === 'published') {
                    publishedCount++;
                } else {
                    draftCount++;
                }

                sitesAnalytics.push({
                    id: siteId,
                    name: siteData.brand?.name || siteId,
                    template: siteData.template || 'Unknown',
                    status: siteData.status || 'draft',
                    views: views,
                    viewsLast7Days: viewsLast7Days,
                    createdAt: siteData.createdAt || new Date().toISOString()
                });
            } catch (err) {
                console.error(`Error reading site ${siteId}:`, err.message);
            }
        }

        // Calculate month views (mock data)
        const now = new Date();
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        viewsThisMonth = Math.floor(totalViews * 0.3); // Mock: 30% of total views this month

        // Calculate changes (mock)
        const viewsChange = Math.floor(Math.random() * 50) - 10; // -10 to +40
        const engagementChange = Math.floor(Math.random() * 20) - 5; // -5 to +15

        res.json({
            totalSites: userSites.length,
            publishedSites: publishedCount,
            totalViews: totalViews,
            viewsThisMonth: viewsThisMonth,
            viewsChange: viewsChange,
            avgEngagement: Math.floor(Math.random() * 40) + 30, // 30-70%
            engagementChange: engagementChange,
            activeSites: publishedCount,
            sites: sitesAnalytics.sort((a, b) => b.views - a.views)
        });
    } catch (error) {
        console.error('Error loading user analytics:', error);
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});



export default router;
