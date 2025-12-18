/**
 * Service Requests Integration Tests
 * 
 * Tests the full service request submission flow including API routes
 * and template service integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { prisma } from '../../database/db.js';

// Mock Prisma
vi.mock('../../database/db.js', () => ({
  prisma: {
    sites: {
      findFirst: vi.fn(),
    },
    submissions: {
      create: vi.fn(),
    },
    users: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Service Requests API', () => {
  const testSubdomain = 'test-site';
  const testSiteId = 'site-123';
  const testUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock site lookup
    prisma.sites.findFirst.mockResolvedValue({
      id: testSiteId,
      subdomain: testSubdomain,
      site_data: {
        brand: { name: 'Test Business' },
        published: { email: 'owner@example.com' },
      },
      user_id: testUserId,
      users: {
        id: testUserId,
        email: 'owner@example.com',
        subscription_plan: 'growth',
      },
    });

    // Mock submission creation
    prisma.submissions.create.mockResolvedValue({
      id: 1,
      site_id: testSiteId,
      form_type: 'service_request',
      status: 'unread',
      created_at: new Date(),
    });
  });

  describe('POST /api/service-requests/submit', () => {
    it('should submit restaurant service request', async () => {
      const response = await request(app)
        .post('/api/service-requests/submit')
        .send({
          subdomain: testSubdomain,
          templateId: 'restaurant',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          partySize: 4,
          preferred_date: '2024-12-25',
          preferred_time: '19:00',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.submissionId).toBeDefined();
    });

    it('should submit auto repair quote request', async () => {
      const currentYear = new Date().getFullYear();
      const response = await request(app)
        .post('/api/service-requests/submit')
        .send({
          subdomain: testSubdomain,
          templateId: 'auto-repair',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-5678',
          vehicleYear: currentYear.toString(),
          vehicleMake: 'Toyota Camry',
          issueType: 'brakes',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject request for starter tier', async () => {
      prisma.sites.findFirst.mockResolvedValue({
        id: testSiteId,
        subdomain: testSubdomain,
        users: {
          subscription_plan: 'starter',
        },
      });

      const response = await request(app)
        .post('/api/service-requests/submit')
        .send({
          subdomain: testSubdomain,
          templateId: 'restaurant',
          name: 'John Doe',
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Growth tier');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/service-requests/submit')
        .send({
          subdomain: testSubdomain,
          templateId: 'restaurant',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent site', async () => {
      prisma.sites.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/service-requests/submit')
        .send({
          subdomain: 'non-existent',
          templateId: 'restaurant',
          name: 'John Doe',
          email: 'john@example.com',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/service-requests/fields/:templateId', () => {
    it('should return field definitions for restaurant', async () => {
      const response = await request(app)
        .get('/api/service-requests/fields/restaurant');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requiredFields).toBeInstanceOf(Array);
      expect(response.body.data.nicheFields).toBeInstanceOf(Array);
      expect(response.body.data.formType).toBe('service_request');
    });

    it('should return field definitions for auto-repair', async () => {
      const response = await request(app)
        .get('/api/service-requests/fields/auto-repair');

      expect(response.status).toBe(200);
      expect(response.body.data.formType).toBe('quote_request');
    });

    it('should handle layout variations', async () => {
      const response = await request(app)
        .get('/api/service-requests/fields/restaurant-fine-dining');

      expect(response.status).toBe(200);
      expect(response.body.data.templateId).toBe('restaurant-fine-dining');
    });

    it('should return basic fields for unknown template', async () => {
      const response = await request(app)
        .get('/api/service-requests/fields/unknown-template');

      expect(response.status).toBe(200);
      expect(response.body.data.requiredFields).toContain('name');
      expect(response.body.data.requiredFields).toContain('email');
    });
  });
});

