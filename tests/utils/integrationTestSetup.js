/**
 * Integration Test Setup Utilities
 * 
 * Provides helpers for setting up integration tests with proper mocking
 * Handles Prisma mocking, test data seeding, and cleanup
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { createMockPrisma, resetPrismaMocks, seedPrismaData } from '../mocks/prisma.js';

/**
 * Setup integration test environment
 * Mocks Prisma and sets up test data
 */
export function setupIntegrationTest(options = {}) {
  const {
    seedData = {},
    mockPrisma = null
  } = options;

  let prismaMock = mockPrisma || createMockPrisma();

  // Mock the database module
  vi.mock('../../database/db.js', () => ({
    prisma: prismaMock,
    resetPrismaMocks,
    seedPrismaData
  }));

  // Seed initial data if provided
  if (Object.keys(seedData).length > 0) {
    seedPrismaData(seedData);
  }

  // Setup cleanup
  beforeEach(() => {
    resetPrismaMocks();
    if (Object.keys(seedData).length > 0) {
      seedPrismaData(seedData);
    }
  });

  afterEach(() => {
    resetPrismaMocks();
  });

  return prismaMock;
}

/**
 * Create test user data
 */
export function createTestUser(overrides = {}) {
  return {
    id: overrides.id || `user-${Date.now()}`,
    email: overrides.email || `test-${Date.now()}@example.com`,
    password_hash: overrides.password_hash || 'hashed-password',
    role: overrides.role || 'user',
    status: overrides.status || 'active',
    email_verified: overrides.email_verified !== undefined ? overrides.email_verified : true,
    subscription_status: overrides.subscription_status || null,
    subscription_plan: overrides.subscription_plan || null,
    stripe_customer_id: overrides.stripe_customer_id || null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Create test site data
 */
export function createTestSite(overrides = {}) {
  return {
    id: overrides.id || `site-${Date.now()}`,
    subdomain: overrides.subdomain || `test-site-${Date.now()}`,
    template_id: overrides.template_id || 'restaurant-casual',
    user_id: overrides.user_id || 'user-123',
    status: overrides.status || 'published',
    plan: overrides.plan || 'free',
    site_data: overrides.site_data || {
      businessName: 'Test Business',
      template: 'restaurant'
    },
    published_at: overrides.published_at || new Date(),
    expires_at: overrides.expires_at || null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Create test submission data
 */
export function createTestSubmission(overrides = {}) {
  return {
    id: overrides.id || `submission-${Date.now()}`,
    site_id: overrides.site_id || 'site-123',
    form_type: overrides.form_type || 'contact',
    data: overrides.data || {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message'
    },
    status: overrides.status || 'unread',
    created_at: new Date(),
    ...overrides
  };
}

/**
 * Create test app with mocked dependencies
 */
export function createTestApp(routes = []) {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Mock CSRF protection
  app.use((req, res, next) => {
    // Skip CSRF in tests
    next();
  });
  
  // Add routes
  routes.forEach(route => {
    app.use(route.path, route.router);
  });
  
  return app;
}

/**
 * Generate JWT token for testing
 */
export function generateTestToken(payload = {}) {
  const jwt = require('jsonwebtoken');
  const defaultPayload = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
    ...payload
  };
  
  return jwt.sign(
    defaultPayload,
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
}

export default {
  setupIntegrationTest,
  createTestUser,
  createTestSite,
  createTestSubmission,
  createTestApp,
  generateTestToken
};





