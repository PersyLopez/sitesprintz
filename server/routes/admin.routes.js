/**
 * Admin Routes
 * 
 * Admin-only endpoints for user management, analytics, and system administration.
 * All routes require admin authentication.
 */

import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';
import bcrypt from 'bcryptjs';
import adminPlanFeaturesRoutes from './admin-plan-features.routes.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendConflict,
  asyncHandler
} from '../utils/apiResponse.js';
import { validateEmail, generateSecurePassword } from '../utils/validators.js';

const router = express.Router();

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
router.get('/users', requireAdmin, asyncHandler(async (req, res) => {
  const { status, role, limit = 100, offset = 0 } = req.query;

  // Build query
  const where = {};
  if (status) where.status = status;
  if (role) where.role = role;

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        subscription_plan: true,
        subscription_status: true,
        created_at: true,
        last_login: true,
        email_verified: true,
        _count: {
          select: { sites: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: Math.min(parseInt(limit) || 100, 500),
      skip: parseInt(offset) || 0
    }),
    prisma.users.count({ where })
  ]);

  const formattedUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    plan: user.subscription_plan,
    subscriptionStatus: user.subscription_status,
    emailVerified: user.email_verified,
    sitesCount: user._count.sites,
    createdAt: user.created_at,
    lastLogin: user.last_login
  }));

  return sendSuccess(res, {
    users: formattedUsers,
    total,
    limit: parseInt(limit) || 100,
    offset: parseInt(offset) || 0
  });
}));

/**
 * GET /api/admin/users/:userId
 * Get single user details (admin only)
 */
router.get('/users/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      subscription_plan: true,
      subscription_status: true,
      stripe_customer_id: true,
      created_at: true,
      last_login: true,
      email_verified: true,
      sites: {
        select: {
          id: true,
          subdomain: true,
          status: true,
          plan: true,
          created_at: true
        }
      }
    }
  });

  if (!user) {
    return sendNotFound(res, 'User', 'USER_NOT_FOUND');
  }

  return sendSuccess(res, { user });
}));

/**
 * POST /api/admin/invite-user
 * Invite a new user (admin only)
 */
router.post('/invite-user', requireAdmin, asyncHandler(async (req, res) => {
  const { email, role = 'user' } = req.body;

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return sendBadRequest(res, emailValidation.error, 'INVALID_EMAIL');
  }

  // Validate role
  const validRoles = ['user', 'admin'];
  if (!validRoles.includes(role)) {
    return sendBadRequest(res, 'Invalid role. Must be "user" or "admin"', 'INVALID_ROLE');
  }

  // Check if user exists
  const existingUser = await prisma.users.findUnique({
    where: { email: emailValidation.value }
  });

  if (existingUser) {
    return sendConflict(res, 'User with this email already exists', 'USER_EXISTS');
  }

  // Generate secure temporary password
  const tempPassword = generateSecurePassword(16);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // Set temp password expiration (7 days)
  const tempPasswordExpires = new Date();
  tempPasswordExpires.setDate(tempPasswordExpires.getDate() + 7);

  // Create user
  const user = await prisma.users.create({
    data: {
      email: emailValidation.value,
      password_hash: hashedPassword,
      role,
      status: 'invited',
      temp_password: true,
      temp_password_expires: tempPasswordExpires,
      created_at: new Date()
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true
    }
  });

  // Send invitation email (non-blocking)
  sendEmail(emailValidation.value, EmailTypes.INVITATION, {
    email: emailValidation.value,
    tempPassword
  }).catch(err => {
    console.error('Failed to send invitation email:', err);
  });

  return sendCreated(res, {
    userId: user.id,
    email: user.email,
    role: user.role
  }, 'User invitation sent successfully');
}));

/**
 * PATCH /api/admin/users/:userId/status
 * Update user status (admin only)
 */
router.patch('/users/:userId/status', requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const validStatuses = ['active', 'suspended', 'invited', 'pending'];
  if (!validStatuses.includes(status)) {
    return sendBadRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 'INVALID_STATUS');
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true }
  });

  if (!user) {
    return sendNotFound(res, 'User', 'USER_NOT_FOUND');
  }

  await prisma.users.update({
    where: { id: userId },
    data: { status }
  });

  return sendSuccess(res, { userId, status }, `User status updated to ${status}`);
}));

/**
 * PATCH /api/admin/users/:userId/role
 * Update user role (admin only)
 */
router.patch('/users/:userId/role', requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = ['user', 'admin'];
  if (!validRoles.includes(role)) {
    return sendBadRequest(res, 'Invalid role. Must be "user" or "admin"', 'INVALID_ROLE');
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true }
  });

  if (!user) {
    return sendNotFound(res, 'User', 'USER_NOT_FOUND');
  }

  await prisma.users.update({
    where: { id: userId },
    data: { role }
  });

  return sendSuccess(res, { userId, role }, `User role updated to ${role}`);
}));

/**
 * DELETE /api/admin/users/:userId
 * Delete a user (admin only)
 */
router.delete('/users/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true }
  });

  if (!user) {
    return sendNotFound(res, 'User', 'USER_NOT_FOUND');
  }

  // Prevent deleting other admins
  if (user.role === 'admin') {
    return sendForbidden(res, 'Cannot delete admin users', 'CANNOT_DELETE_ADMIN');
  }

  // Delete user (cascade will handle related data)
  await prisma.users.delete({
    where: { id: userId }
  });

  return sendSuccess(res, { userId }, 'User deleted successfully');
}));

/**
 * GET /api/admin/analytics
 * Get platform analytics (admin only)
 */
router.get('/analytics', requireAdmin, asyncHandler(async (req, res) => {
  // Get counts
  const [
    totalUsers,
    activeUsers,
    totalSites,
    publishedSites,
    draftSites,
    recentUsers,
    recentSites
  ] = await Promise.all([
    prisma.users.count(),
    prisma.users.count({ where: { status: 'active' } }),
    prisma.sites.count(),
    prisma.sites.count({ where: { status: 'published' } }),
    prisma.sites.count({ where: { status: 'draft' } }),
    prisma.users.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        subscription_plan: true,
        created_at: true,
        _count: {
          select: { sites: true }
        }
      }
    }),
    prisma.sites.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        subdomain: true,
        status: true,
        plan: true,
        created_at: true
      }
    })
  ]);

  // Get subscription breakdown
  const subscriptionBreakdown = await prisma.users.groupBy({
    by: ['subscription_plan'],
    _count: true
  });

  const subscriptions = {
    free: 0,
    starter: 0,
    pro: 0,
    premium: 0
  };

  subscriptionBreakdown.forEach(item => {
    const plan = item.subscription_plan || 'free';
    if (subscriptions.hasOwnProperty(plan)) {
      subscriptions[plan] = item._count;
    }
  });

  // Calculate growth (last 7 days vs previous 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [newUsersThisWeek, newUsersPrevWeek, newSitesThisWeek] = await Promise.all([
    prisma.users.count({ where: { created_at: { gte: sevenDaysAgo } } }),
    prisma.users.count({ where: { created_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    prisma.sites.count({ where: { created_at: { gte: sevenDaysAgo } } })
  ]);

  const userGrowth = newUsersPrevWeek > 0
    ? ((newUsersThisWeek - newUsersPrevWeek) / newUsersPrevWeek * 100).toFixed(1)
    : newUsersThisWeek > 0 ? 100 : 0;

  return sendSuccess(res, {
    platform: {
      totalUsers,
      activeUsers,
      userGrowth: parseFloat(userGrowth),
      totalSites,
      publishedSites,
      draftSites,
      siteGrowth: 0,
      totalRevenue: 0,
      revenueGrowth: 0,
      conversionRate: 0,
      conversionChange: 0
    },
    growth: {
      newUsersToday: 0,
      newUsersThisWeek,
      newUsersWeek: newUsersThisWeek,
      newUsersMonth: totalUsers,
      newSitesToday: 0,
      newSitesThisWeek,
      newSitesWeek: newSitesThisWeek,
      newSitesMonth: totalSites,
      activeTrials: 0,
      conversions: 0,
      publishedToday: 0
    },
    subscriptions: {
      starter: subscriptions.starter || 0,
      checkout: subscriptions.checkout || 0,
      pro: subscriptions.pro || 0,
      premium: subscriptions.premium || 0
    },
    topUsers: recentUsers.slice(0, 5).map(u => ({
      id: u.id,
      name: u.email.split('@')[0],
      sites: u._count?.sites || 0,
      revenue: 0,
      plan: u.subscription_plan || 'free'
    })),
    recentSignups: recentUsers.map(u => ({
      id: u.id,
      name: u.email.split('@')[0],
      email: u.email,
      plan: u.subscription_plan || 'free',
      date: u.created_at
    })),
    recentActivity: [],
    recentSites: recentSites.map(s => ({
      id: s.id,
      subdomain: s.subdomain,
      status: s.status,
      plan: s.plan,
      createdAt: s.created_at
    })),
    system: {
      status: 'Online',
      uptime: Math.floor(process.uptime()),
      responseTime: 0,
      activeUsers,
      totalRequests: 0,
      cpu: 0,
      memory: 0,
      storage: 0
    }
  });
}));

/**
 * GET /api/admin/system
 * Get system health status (admin only)
 */
router.get('/system', requireAdmin, asyncHandler(async (req, res) => {
  // Test database connection
  let dbStatus = 'healthy';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = 'unhealthy';
  }

  // Get memory usage
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

  return sendSuccess(res, {
    status: dbStatus === 'healthy' ? 'Online' : 'Degraded',
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    memory: {
      used: memUsedMB,
      total: memTotalMB,
      percentage: Math.round((memUsedMB / memTotalMB) * 100)
    },
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
}));

// Mount plan features routes
router.use('/', adminPlanFeaturesRoutes);

export default router;
