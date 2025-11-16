/**
 * Integration Tests for Share Card API Routes
 * Testing the full HTTP API with database mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import shareRoutes from '../../server/routes/share.routes.js';

// Mock the database
vi.mock('../../database/db.js', () => ({
  query: vi.fn()
}));

// Mock the shareCardService
vi.mock('../../server/services/shareCardService.js', () => ({
  generateShareCard: vi.fn()
}));

// Mock auth middleware
vi.mock('../../server/middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: 1, role: 'user' };
    next();
  }
}));

import { query as dbQuery } from '../../database/db.js';
import { generateShareCard } from '../../server/services/shareCardService.js';

describe('Share Card API Integration Tests', () => {
  let app;
  let agent;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Mock IP for testing
    app.use((req, res, next) => {
      req.ip = '127.0.0.1';
      next();
    });
    
    app.use('/api/share', shareRoutes);
    
    // Create agent
    agent = request(app);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('POST /api/share/generate', () => {
    it('should generate a share card successfully', async () => {
      const mockTemplateData = {
        subdomain: 'testsite',
        brand: { name: 'Test Business' }
      };

      dbQuery.mockResolvedValue({
        rows: [{ template_data: mockTemplateData }],
        rowCount: 1
      });

      const mockCardBuffer = Buffer.from('fake-image-data');
      generateShareCard.mockResolvedValue(mockCardBuffer);

      const response = await agent
        .post('/api/share/generate')
        .send({ subdomain: 'testsite', format: 'social' })
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(response.body).toEqual(mockCardBuffer);
      expect(generateShareCard).toHaveBeenCalledWith(
        expect.objectContaining({ subdomain: 'testsite' }),
        'social'
      );
    });

    it('should return 400 for invalid subdomain', async () => {
      const response = await agent
        .post('/api/share/generate')
        .send({ format: 'social' })
        .expect(400);

      expect(response.body.error).toBe('Invalid subdomain');
    });

    it('should return 400 for invalid format', async () => {
      const response = await agent
        .post('/api/share/generate')
        .send({ subdomain: 'testsite', format: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('Invalid format');
    });

    it('should return 404 for non-existent site', async () => {
      dbQuery.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const response = await agent
        .post('/api/share/generate')
        .send({ subdomain: 'nonexistent', format: 'social' })
        .expect(404);

      expect(response.body.error).toBe('Site not found');
    });

    it('should handle generation errors gracefully', async () => {
      dbQuery.mockResolvedValue({
        rows: [{ template_data: { subdomain: 'test' } }],
        rowCount: 1
      });

      generateShareCard.mockRejectedValue(new Error('Generation failed'));

      const response = await agent
        .post('/api/share/generate')
        .send({ subdomain: 'testsite', format: 'social' })
        .expect(500);

      expect(response.body.error).toBe('Failed to generate share card');
    });

    it('should default to social format if not specified', async () => {
      const mockTemplateData = {
        subdomain: 'testsite',
        brand: { name: 'Test' }
      };

      dbQuery.mockResolvedValue({
        rows: [{ template_data: mockTemplateData }],
        rowCount: 1
      });

      generateShareCard.mockResolvedValue(Buffer.from('image'));

      await agent
        .post('/api/share/generate')
        .send({ subdomain: 'testsite' })
        .expect(200);

      expect(generateShareCard).toHaveBeenCalledWith(
        expect.anything(),
        'social'
      );
    });
  });

  describe('GET /api/share/:subdomain/:format?', () => {
    it('should get share card for subdomain', async () => {
      dbQuery.mockResolvedValue({
        rows: [{ template_data: { subdomain: 'test', brand: { name: 'Test' } } }],
        rowCount: 1
      });

      generateShareCard.mockResolvedValue(Buffer.from('image'));

      const response = await agent
        .get('/api/share/testsite/social')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
    });

    it('should default to social format', async () => {
      dbQuery.mockResolvedValue({
        rows: [{ template_data: { subdomain: 'test' } }],
        rowCount: 1
      });

      generateShareCard.mockResolvedValue(Buffer.from('image'));

      await agent
        .get('/api/share/testsite')
        .expect(200);

      expect(generateShareCard).toHaveBeenCalledWith(
        expect.anything(),
        'social'
      );
    });

    it('should return 404 for non-existent site', async () => {
      dbQuery.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const response = await agent
        .get('/api/share/nonexistent/social')
        .expect(404);

      expect(response.body.error).toBe('Site not found');
    });

    it('should return 400 for invalid format', async () => {
      const response = await agent
        .get('/api/share/testsite/invalid')
        .expect(400);

      expect(response.body.error).toBe('Invalid format');
    });
  });

  describe('DELETE /api/share/:subdomain', () => {
    it('should clear cache for authenticated user', async () => {
      dbQuery.mockResolvedValue({
        rows: [{ user_id: 1 }],
        rowCount: 1
      });

      const response = await agent
        .delete('/api/share/testsite')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cache cleared');
    });

    it('should return 401 for unauthenticated request', async () => {
      await agent
        .delete('/api/share/testsite')
        .expect(401);
    });

    it('should return 404 for non-existent site', async () => {
      dbQuery.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      await agent
        .delete('/api/share/nonexistent')
        .set('Authorization', 'Bearer token')
        .expect(404);
    });

    it('should return 403 if user does not own site', async () => {
      dbQuery.mockResolvedValue({
        rows: [{ user_id: 999 }],
        rowCount: 1
      });

      const response = await agent
        .delete('/api/share/testsite')
        .set('Authorization', 'Bearer token')
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow up to 10 requests per minute', async () => {
      dbQuery.mockResolvedValue({
        rows: [{ template_data: { subdomain: 'test' } }],
        rowCount: 1
      });

      generateShareCard.mockResolvedValue(Buffer.from('image'));

      // Make 10 requests - all should succeed
      for (let i = 0; i < 10; i++) {
        await agent
          .post('/api/share/generate')
          .send({ subdomain: 'testsite' })
          .expect(200);
      }
    });

    it('should return 429 after rate limit exceeded', async () => {
      dbQuery.mockResolvedValue({
        rows: [{ template_data: { subdomain: 'test' } }],
        rowCount: 1
      });

      generateShareCard.mockResolvedValue(Buffer.from('image'));

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await agent
          .post('/api/share/generate')
          .send({ subdomain: 'testsite' });
      }

      // 11th request should be rate limited
      const response = await agent
        .post('/api/share/generate')
        .send({ subdomain: 'testsite' })
        .expect(429);

      expect(response.body.error).toContain('Rate limit exceeded');
    });
  });

  describe('Caching', () => {
    it('should set cache headers on response', async () => {
      dbQuery.mockResolvedValue({
        rows: [{ template_data: { subdomain: 'test' } }],
        rowCount: 1
      });

      generateShareCard.mockResolvedValue(Buffer.from('image'));

      const response = await agent
        .post('/api/share/generate')
        .send({ subdomain: 'testsite' })
        .expect(200);

      expect(response.headers['cache-control']).toBe('public, max-age=3600');
    });
  });
});

