/**
 * Database Helper Functions for E2E Tests
 * Migrated to Prisma ORM for reliable test data management
 */

import { prisma, closePrisma } from '../../database/db.js';
import bcrypt from 'bcryptjs';

/**
 * Initialize database connection
 * Prisma handles connection pooling automatically
 * @returns {Promise<void>}
 */
export async function initDb() {
  // Prisma client is always ready - just ensure connection
  await prisma.$connect();
}

/**
 * Clean up test data from database
 * @param {Object} options - Cleanup options
 * @returns {Promise<void>}
 */
export async function cleanupTestData(options = {}) {
  const { 
    userEmail = null,
    olderThan = null, // timestamp
    testOnly = true, // only delete test@* emails
  } = options;

  try {
    // Delete specific user and cascade
    if (userEmail) {
      await prisma.users.deleteMany({
        where: { email: userEmail }
      });
      return;
    }

    // Delete test users (email starts with 'test')
    if (testOnly) {
      const where = {
        email: { startsWith: 'test' }
      };
      
      if (olderThan) {
        where.created_at = { lt: new Date(olderThan) };
      }
      
      await prisma.users.deleteMany({ where });
      return;
    }

    // Delete all users older than timestamp
    if (olderThan) {
      await prisma.users.deleteMany({
        where: {
          created_at: { lt: new Date(olderThan) }
        }
      });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
}

/**
 * Delete a specific site by ID
 * @param {string} siteId
 * @returns {Promise<void>}
 */
export async function deleteSite(siteId) {
  await prisma.sites.delete({
    where: { id: siteId }
  });
}

/**
 * Delete all sites for a user
 * @param {string} userEmail
 * @returns {Promise<void>}
 */
export async function deleteUserSites(userEmail) {
  const user = await prisma.users.findUnique({
    where: { email: userEmail },
    select: { id: true }
  });
  
  if (user) {
    await prisma.sites.deleteMany({
      where: { user_id: user.id }
    });
  }
}

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function getUserByEmail(email) {
  return await prisma.users.findUnique({
    where: { email }
  });
}

/**
 * Get user's sites
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function getUserSites(email) {
  const user = await prisma.users.findUnique({
    where: { email },
    include: {
      sites: true
    }
  });
  
  return user?.sites || [];
}

/**
 * Create a test user directly in database
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
export async function createTestUser(userData = {}) {
  const timestamp = Date.now();
  
  const plainPassword = userData.password || 'Test123!@#';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  const user = await prisma.users.create({
    data: {
      email: userData.email || `test${timestamp}@example.com`,
      password_hash: hashedPassword,
      role: userData.role || 'user',
      status: userData.status || 'active',
      created_at: new Date()
    }
  });

  return {
    ...user,
    password: plainPassword, // Return plaintext for testing
  };
}

/**
 * Create a test site directly in database
 * @param {number} userId
 * @param {Object} siteData
 * @returns {Promise<Object>}
 */
export async function createTestSite(userId, siteData = {}) {
  const timestamp = Date.now();
  
  const site = await prisma.sites.create({
    data: {
      id: siteData.id || `site-${timestamp}`,
      subdomain: siteData.subdomain || `test${timestamp}`,
      template_id: siteData.template_id || 'restaurant-fine-dining',
      status: siteData.status || 'draft',
      plan: siteData.plan || 'free',
      site_data: siteData.site_data || {},
      is_public: siteData.isPublic !== undefined ? siteData.isPublic : false,
      published_at: siteData.status === 'published' ? new Date() : null,
      expires_at: null,
      user_id: userId,
      created_at: new Date()
    }
  });

  return site;
}

/**
 * Verify database tables exist
 * Uses Prisma introspection - if models exist, tables exist
 * @returns {Promise<Object>}
 */
export async function verifyTablesExist() {
  const results = {};
  
  try {
    // Try to query each table
    await prisma.users.findFirst();
    results.users = true;
  } catch {
    results.users = false;
  }
  
  try {
    await prisma.sites.findFirst();
    results.sites = true;
  } catch {
    results.sites = false;
  }
  
  try {
    await prisma.pricing.findFirst();
    results.pricing_tiers = true;
  } catch {
    results.pricing_tiers = false;
  }
  
  try {
    await prisma.submissions.findFirst();
    results.subscriptions = true;
  } catch {
    results.subscriptions = false;
  }
  
  return results;
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
export async function closeDb() {
  await closePrisma();
}
