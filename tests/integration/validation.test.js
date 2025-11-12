import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate, schemas } from '../../server/middleware/validation.js';

// Mock Express app for testing
const app = express();
app.use(express.json());

// Test route with validation
app.post('/test/register', validate({ body: schemas.register }), (req, res) => {
  res.json({ success: true, data: req.body });
});

app.post('/test/login', validate({ body: schemas.login }), (req, res) => {
  res.json({ success: true, data: req.body });
});

app.post('/test/site', validate({ body: schemas.createSite }), (req, res) => {
  res.json({ success: true, data: req.body });
});

describe('Validation Middleware Integration Tests', () => {
  describe('POST /test/register', () => {
    it('should accept valid registration data', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveLength(1);
      expect(response.body.details[0].field).toBe('email');
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'test@example.com',
          password: 'short'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].field).toBe('password');
    });
  });

  describe('POST /test/site', () => {
    it('should accept valid site creation data', async () => {
      const response = await request(app)
        .post('/test/site')
        .send({
          subdomain: 'mysite',
          templateId: 'template-123',
          siteData: { name: 'My Site' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid subdomain', async () => {
      const response = await request(app)
        .post('/test/site')
        .send({
          subdomain: 'My-Site!', // Uppercase and special char
          templateId: 'template-123',
          siteData: {}
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].field).toBe('subdomain');
    });

    it('should reject short subdomain', async () => {
      const response = await request(app)
        .post('/test/site')
        .send({
          subdomain: 'ab', // Too short
          templateId: 'template-123',
          siteData: {}
        })
        .expect(400);

      expect(response.body.details[0].field).toBe('subdomain');
    });
  });
});

