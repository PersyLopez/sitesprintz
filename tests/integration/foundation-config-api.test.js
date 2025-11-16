/**
 * Integration Tests for Foundation Config API
 * 
 * Tests the HTTP endpoints for foundation configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the database
vi.mock('../../database/db.js', () => ({
  query: vi.fn()
}));

import { query as dbQuery } from '../../database/db.js';

describe('Foundation Config API - Integration Tests', () => {
  let app;
  let foundationRoutes;

  beforeEach(async () => {
    // Dynamically import routes module
    const module = await import('../../server/routes/foundation.routes.js');
    
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Initialize foundation routes with mocked dbQuery
    foundationRoutes = module.initializeFoundationRoutes(dbQuery);
    app.use('/api/foundation', foundationRoutes);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('GET /api/foundation/config/:subdomain', () => {
    it('should return foundation config for existing site', async () => {
      const mockSiteData = {
        brand: { name: 'Test Business' },
        foundation: {
          trustSignals: {
            enabled: true,
            yearsInBusiness: 10
          }
        }
      };

      dbQuery.mockResolvedValueOnce({
        rows: [{
          site_data: mockSiteData,
          plan: 'starter'
        }]
      });

      const response = await request(app)
        .get('/api/foundation/config/test-site')
        .expect(200);

      expect(response.body).toHaveProperty('foundation');
      expect(response.body).toHaveProperty('plan');
      expect(response.body.foundation.trustSignals.yearsInBusiness).toBe(10);
      expect(response.body.plan).toBe('starter');
    });

    it('should return default config when site has no foundation config', async () => {
      const mockSiteData = {
        brand: { name: 'Test Business' }
        // No foundation property
      };

      dbQuery.mockResolvedValueOnce({
        rows: [{
          site_data: mockSiteData,
          plan: 'starter'
        }]
      });

      const response = await request(app)
        .get('/api/foundation/config/test-site')
        .expect(200);

      expect(response.body.foundation).toBeDefined();
      expect(response.body.foundation.trustSignals).toBeDefined();
      expect(response.body.foundation.contactForm).toBeDefined();
    });

    it('should return 404 when site does not exist', async () => {
      dbQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/foundation/config/nonexistent-site')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Site not found');
    });

    it('should handle database errors gracefully', async () => {
      dbQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/foundation/config/test-site')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to fetch configuration');
    });
  });

  describe('PUT /api/foundation/config/:subdomain', () => {
    it('should update foundation config successfully', async () => {
      const existingSiteData = {
        brand: { name: 'Test Business' },
        foundation: {
          trustSignals: { enabled: true }
        }
      };

      const updatedFoundation = {
        trustSignals: {
          enabled: true,
          yearsInBusiness: 15
        },
        contactForm: {
          enabled: true,
          recipientEmail: 'test@example.com'
        }
      };

      // Mock SELECT query
      dbQuery.mockResolvedValueOnce({
        rows: [{
          site_data: existingSiteData
        }]
      });

      // Mock UPDATE query
      dbQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .put('/api/foundation/config/test-site')
        .send({ foundation: updatedFoundation })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('foundation');
      expect(response.body.foundation.trustSignals.yearsInBusiness).toBe(15);
      expect(response.body.foundation.contactForm.recipientEmail).toBe('test@example.com');

      // Verify UPDATE query was called
      expect(dbQuery).toHaveBeenCalledTimes(2);
    });

    it('should return 400 when foundation config is invalid', async () => {
      const response = await request(app)
        .put('/api/foundation/config/test-site')
        .send({ foundation: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid foundation configuration');
    });

    it('should return 404 when site does not exist', async () => {
      dbQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .put('/api/foundation/config/nonexistent-site')
        .send({
          foundation: {
            trustSignals: { enabled: true }
          }
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Site not found');
    });
  });

  describe('POST /api/foundation/contact', () => {
    it('should process valid contact form submission', async () => {
      const mockSiteData = {
        foundation: {
          contactForm: {
            enabled: true,
            recipientEmail: 'owner@example.com'
          }
        }
      };

      // Mock site query
      dbQuery.mockResolvedValueOnce({
        rows: [{
          site_data: mockSiteData
        }]
      });

      // Mock submission insert
      dbQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .post('/api/foundation/contact')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          message: 'Test message',
          subdomain: 'test-site'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify submission was inserted
      expect(dbQuery).toHaveBeenCalledTimes(2);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/foundation/contact')
        .send({
          name: 'John Doe',
          // Missing email, message, subdomain
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app)
        .post('/api/foundation/contact')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          message: 'Test message',
          subdomain: 'test-site'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid email format');
    });

    it('should return 400 when contact form is not configured', async () => {
      const mockSiteData = {
        foundation: {
          // No contactForm config
        }
      };

      dbQuery.mockResolvedValueOnce({
        rows: [{
          site_data: mockSiteData
        }]
      });

      const response = await request(app)
        .post('/api/foundation/contact')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Test message',
          subdomain: 'test-site'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Contact form not configured');
    });
  });

  describe('GET /api/foundation/submissions/:subdomain', () => {
    it('should return submissions for a site', async () => {
      const mockSubmissions = [
        {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          message: 'Test message',
          status: 'unread',
          created_at: new Date()
        },
        {
          id: '456',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: null,
          message: 'Another message',
          status: 'read',
          created_at: new Date()
        }
      ];

      dbQuery.mockResolvedValueOnce({
        rows: mockSubmissions
      });

      const response = await request(app)
        .get('/api/foundation/submissions/test-site')
        .expect(200);

      expect(response.body).toHaveProperty('submissions');
      expect(response.body.submissions).toHaveLength(2);
      expect(response.body.submissions[0].name).toBe('John Doe');
      expect(response.body.submissions[1].name).toBe('Jane Smith');
    });

    it('should return empty array when no submissions exist', async () => {
      dbQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/foundation/submissions/test-site')
        .expect(200);

      expect(response.body).toHaveProperty('submissions');
      expect(response.body.submissions).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      dbQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/foundation/submissions/test-site')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
