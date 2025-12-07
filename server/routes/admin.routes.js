import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const publicDir = path.join(__dirname, '../../public');
const usersDir = path.join(publicDir, 'users');

function getUserFilePath(email) {
  const sanitized = email.toLowerCase().replace(/[^a-z0-9@.]/g, '_');
  return path.join(usersDir, `${sanitized}.json`);
}

// GET /api/admin/users
router.get('/users', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        last_login: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      lastLogin: user.last_login
    }));

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// POST /api/admin/invite-user
router.post('/invite-user', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.users.create({
      data: {
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        role,
        status: 'invited',
        created_at: new Date()
      },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    try {
      await sendEmail(email, EmailTypes.INVITATION, { email, tempPassword });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    res.json({
      message: 'User invitation sent successfully',
      email: user.email,
      userId: user.id
    });
  } catch (error) {
    console.error('Error creating user invitation:', error);
    res.status(500).json({ error: 'Failed to create user invitation' });
  }
});

// GET /api/admin/analytics
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [usersCount, publishedSitesCount, draftsCount, totalSitesCount, recentUsers] = await Promise.all([
      prisma.users.count(),
      prisma.sites.count({ where: { status: 'published' } }),
      prisma.sites.count({ where: { status: 'draft' } }),
      prisma.sites.count(),
      prisma.users.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          created_at: true,
          status: true,
          subscription_plan: true
        }
      })
    ]);

    // Mock system stats for now
    const systemStats = {
      status: 'Online',
      uptime: '99.9%',
      responseTime: 45,
      activeUsers: 12,
      totalRequests: 15420,
      memory: 45.2,
      cpu: 12.5,
      storage: 65.4
    };

    // Construct the platform stats object expected by the frontend
    const responseData = {
      system: systemStats,
      platform: {
        totalUsers: usersCount,
        activeUsers: Math.floor(usersCount * 0.8), // Mock
        userGrowth: 5.2,
        totalSites: totalSitesCount,
        publishedSites: publishedSitesCount,
        draftSites: draftsCount,
        siteGrowth: 3.1,
        totalRevenue: usersCount * 12, // Mock revenue interaction
        mrr: usersCount * 12,
        revenueGrowth: 2.5,
        conversionRate: 4.5,
        conversionChange: 0.2,
        churnRate: 1.1,
        avgRevenuePerUser: 12.00
      },
      growth: {
        newUsersToday: 2,
        newUsersWeek: 15,
        newUsersMonth: 45,
        newSitesToday: 5,
        newSitesWeek: 25,
        newSitesMonth: 89,
        activeTrials: 5,
        conversions: 2,
        publishedToday: 1
      },
      subscriptions: {
        starter: Math.floor(usersCount * 0.6),
        checkout: Math.floor(usersCount * 0.3),
        pro: Math.floor(usersCount * 0.1),
        trial: 0
      },
      recentSignups: recentUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.email.split('@')[0],
        date: u.created_at,
        plan: u.subscription_plan || 'starter'
      })),
      topUsers: [
        { id: 1, name: 'Demo User', sites: 5, revenue: 120, plan: 'pro' }
      ],
      recentActivity: [
        {
          id: 1,
          type: 'user_signup',
          user: 'New User',
          description: 'Registered',
          date: new Date().toISOString()
        }
      ],
      alerts: []
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error loading admin analytics:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;

