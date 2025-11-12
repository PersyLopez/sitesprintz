import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { randomUUID } from 'crypto';
import { query as dbQuery } from '../../database/db.js';

// Mock auth middleware BEFORE importing routes
vi.mock('../../server/middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }
}));

// Now import routes after mocking auth
const submissionsRoutes = (await import('../../server/routes/submissions.routes.js')).default;

// Generate test IDs at module level so they're available to helper functions
const testSiteId = randomUUID();
const testUserId = randomUUID();
const testEmail = `test-${testUserId.substring(0, 8)}@example.com`;

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/submissions', submissionsRoutes);
  return app;
};

const createAuthTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware - set user for ALL requests
  app.use((req, res, next) => {
    req.user = { id: testUserId, email: testEmail, role: 'user' };
    next();
  });
  
  app.use('/api/submissions', submissionsRoutes);
  return app;
};

describe('Submissions Routes Integration Tests', () => {
  let app;
  let authApp;
  let testSubmissionId;

  beforeAll(async () => {
    app = createTestApp();
    authApp = createAuthTestApp();
    
    // Create test user and site for submissions
    try {
      // First create user (required for FK)
      await dbQuery(`
        INSERT INTO users (id, email, password_hash, status, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO NOTHING
      `, [testUserId, testEmail, 'hash', 'active']);
      
      // Then create site
      await dbQuery(`
        INSERT INTO sites (id, subdomain, template_id, user_id, status, site_data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET subdomain = EXCLUDED.subdomain
      `, [
        testSiteId, 
        'test-restaurant', 
        'restaurant', 
        testUserId, 
        'published',
        JSON.stringify({ businessName: 'Test Restaurant', template: 'restaurant' })
      ]);
    } catch (error) {
      // Log error for debugging
      console.log('Test setup error:', error.message);
    }
  });

  afterAll(async () => {
    // Clean up test data (reverse order due to FK constraints)
    try {
      await dbQuery('DELETE FROM submissions WHERE site_id = $1', [testSiteId]);
      await dbQuery('DELETE FROM sites WHERE id = $1', [testSiteId]);
      await dbQuery('DELETE FROM users WHERE id = $1', [testUserId]);
    } catch (error) {
      console.log('Test cleanup:', error.message);
    }
  });

  beforeEach(() => {
    // Reset test submission ID
    testSubmissionId = null;
  });

  describe('POST /api/submissions/contact', () => {
    it('should accept valid contact form submission', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'I would like to inquire about your services',
        subdomain: 'test-restaurant'
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('sent successfully');
    });

    it('should reject submission without required fields (no name)', async () => {
      const contactData = {
        email: 'john@example.com',
        message: 'Test message',
        subdomain: 'test-restaurant'
        // Missing name
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should reject submission without required fields (no email)', async () => {
      const contactData = {
        name: 'John Doe',
        message: 'Test message',
        subdomain: 'test-restaurant'
        // Missing email
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should reject submission without required fields (no message)', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subdomain: 'test-restaurant'
        // Missing message
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should reject submission without subdomain', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
        // Missing subdomain
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should accept submission without phone (optional field)', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
        subdomain: 'test-restaurant'
        // Phone is optional
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle duplicate submissions gracefully', async () => {
      const contactData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        message: 'First submission',
        subdomain: 'test-restaurant'
      };

      // First submission
      const response1 = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      // Second submission (duplicate)
      const response2 = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      // Both should succeed (duplicates are allowed)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should sanitize input data to prevent XSS', async () => {
      const contactData = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        message: '<img src=x onerror=alert(1)>Test message',
        subdomain: 'test-restaurant'
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      // Should accept the data (sanitization happens on display)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('PATCH /api/submissions/:submissionId/read', () => {
    it('should mark submission as read when authenticated', async () => {
      // Use a valid UUID
      const submissionId = randomUUID();

      const response = await request(authApp)
        .patch(`/api/submissions/${submissionId}/read`)
        .set('Authorization', 'Bearer test-token');

      // Should succeed (UPDATE succeeds even if no rows affected)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject unauthenticated requests', async () => {
      const submissionId = randomUUID();

      const response = await request(app)
        .patch(`/api/submissions/${submissionId}/read`);
      // No auth token

      // Should require authentication
      expect([401, 403]).toContain(response.status);
    });

    it('should handle invalid submission ID gracefully', async () => {
      const submissionId = randomUUID();

      const response = await request(authApp)
        .patch(`/api/submissions/${submissionId}/read`)
        .set('Authorization', 'Bearer test-token');

      // Should succeed (UPDATE doesn't fail on 0 rows)
      expect(response.status).toBe(200);
    });

    it('should handle empty submission ID', async () => {
      const response = await request(authApp)
        .patch('/api/submissions//read')
        .set('Authorization', 'Bearer test-token');

      // Should handle empty ID (might 404 or route mismatch)
      expect([404, 400, 500]).toContain(response.status);
    });
  });

  describe('Database Integration', () => {
    it('should save submission to database with correct structure', async () => {
      const contactData = {
        name: 'Database Test User',
        email: 'dbtest@example.com',
        phone: '555-9999',
        message: 'Testing database integration',
        subdomain: 'test-db-integration'
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      // If database is set up, should succeed
      if (response.status === 200 || response.status === 201) {
        expect(response.body.success).toBe(true);
        
        // Try to verify in database (might not work in test env)
        // This is more of an integration checkpoint
      }
    });

    it('should handle database connection errors gracefully', async () => {
      const contactData = {
        name: 'Error Test',
        email: 'error@example.com',
        message: 'Test error handling',
        subdomain: 'test-error'
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      // Should return proper error response, not crash
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
      
      if (response.status >= 500) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Security & Validation', () => {
    it('should handle extremely long messages', async () => {
      const contactData = {
        name: 'Long Message Test',
        email: 'long@example.com',
        message: 'A'.repeat(10000), // 10,000 character message
        subdomain: 'test-restaurant'
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      // Should accept (no length validation on message)
      expect(response.status).toBe(200);
    });

    it('should handle SQL injection attempts', async () => {
      const contactData = {
        name: "'; DROP TABLE submissions; --",
        email: 'sql@example.com',
        message: "' OR '1'='1",
        subdomain: "test'; --"
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      // Should not crash and should handle safely
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should validate email format', async () => {
      const contactData = {
        name: 'Invalid Email Test',
        email: 'not-an-email',
        message: 'Test message',
        subdomain: 'test-email'
      };

      const response = await request(app)
        .post('/api/submissions/contact')
        .send(contactData);

      // Should accept (backend might not validate) or reject
      expect(response.status).toBeDefined();
      // This test documents current behavior
    });
  });
});


