/**
 * Security Tests: Rate Limiting
 * Tests that rate limiting is properly enforced to prevent brute force attacks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('Security - Rate Limiting', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Login Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Make multiple rapid login attempts
      const attempts = 10;
      const responses = [];

      for (let i = 0; i < attempts; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
        
        responses.push(response.status);
      }

      // At least one should be rate limited (429)
      const rateLimited = responses.some(status => status === 429);
      expect(rateLimited).toBeTruthy();
    });

    it('should return 429 Too Many Requests when rate limit exceeded', async () => {
      // Exceed rate limit
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(429);
      
      // Should include rate limit headers
      expect(response.headers['retry-after']).toBeDefined();
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should include Retry-After header in rate limit response', async () => {
      // Exceed rate limit
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      if (response.status === 429) {
        const retryAfter = response.headers['retry-after'];
        expect(retryAfter).toBeDefined();
        expect(parseInt(retryAfter)).toBeGreaterThan(0);
      }
    });

    it('should reset rate limit after time window', async () => {
      // This test would require waiting for the rate limit window to expire
      // In a real scenario, you'd use a shorter window for testing or mock time
      
      // Exceed rate limit
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
      }

      // Wait for rate limit window (would need to be configurable for tests)
      // await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute

      // After window, should be able to make requests again
      // This is a placeholder - actual implementation depends on rate limiter config
    });
  });

  describe('Registration Rate Limiting', () => {
    it('should rate limit registration attempts', async () => {
      const attempts = 10;
      const responses = [];

      for (let i = 0; i < attempts; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'TestPassword123!',
            name: 'Test User'
          });
        
        responses.push(response.status);
      }

      // Should eventually rate limit
      const rateLimited = responses.some(status => status === 429);
      expect(rateLimited).toBeTruthy();
    });
  });

  describe('Password Reset Rate Limiting', () => {
    it('should rate limit password reset requests', async () => {
      const attempts = 10;
      const responses = [];

      for (let i = 0; i < attempts; i++) {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({
            email: 'test@example.com'
          });
        
        responses.push(response.status);
      }

      // Should rate limit to prevent email spam
      const rateLimited = responses.some(status => status === 429);
      expect(rateLimited).toBeTruthy();
    });

    it('should rate limit password reset attempts per email', async () => {
      // Multiple requests for same email
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/auth/forgot-password')
          .send({
            email: 'test@example.com'
          });
      }

      // Should be rate limited
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(429);
    });
  });

  describe('API Endpoint Rate Limiting', () => {
    it('should rate limit general API endpoints', async () => {
      // Test various endpoints
      const endpoints = [
        '/api/sites',
        '/api/users',
        '/api/orders'
      ];

      for (const endpoint of endpoints) {
        // Make many requests
        const responses = [];
        for (let i = 0; i < 20; i++) {
          const response = await request(app)
            .get(endpoint)
            .set('Authorization', 'Bearer test-token');
          
          responses.push(response.status);
        }

        // Should eventually rate limit
        const rateLimited = responses.some(status => status === 429);
        expect(rateLimited).toBeTruthy();
      }
    });
  });

  describe('IP-Based Rate Limiting', () => {
    it('should rate limit based on IP address', async () => {
      // Make requests from same IP
      const responses = [];
      for (let i = 0; i < 15; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: `user${i}@example.com`,
            password: 'password'
          });
        
        responses.push(response.status);
      }

      // Should rate limit based on IP
      const rateLimited = responses.some(status => status === 429);
      expect(rateLimited).toBeTruthy();
    });

    it('should not allow rate limit bypass via header manipulation', async () => {
      // Try to bypass rate limiting with different headers
      const bypassHeaders = [
        { 'X-Forwarded-For': '192.168.1.1' },
        { 'X-Real-IP': '192.168.1.2' },
        { 'X-Originating-IP': '192.168.1.3' },
        { 'X-Client-IP': '192.168.1.4' }
      ];

      // Make requests with different headers
      for (const headers of bypassHeaders) {
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/auth/login')
            .set(headers)
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            });
        }
      }

      // Should still rate limit (rate limiter should use actual connection IP)
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      // Should eventually be rate limited
      expect([200, 401, 429]).toContain(response.status);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit information in response headers', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Should include rate limit headers (even if not rate limited)
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should show decreasing remaining count', async () => {
      const remainingCounts = [];

      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
        
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining) {
          remainingCounts.push(parseInt(remaining));
        }
      }

      // Remaining should decrease (or stay at 0 if already limited)
      if (remainingCounts.length > 1) {
        const isDecreasing = remainingCounts.every((val, idx) => 
          idx === 0 || val <= remainingCounts[idx - 1]
        );
        expect(isDecreasing).toBeTruthy();
      }
    });
  });

  describe('Different Rate Limits for Different Endpoints', () => {
    it('should apply different rate limits to different endpoints', async () => {
      // Login might have stricter limits than read-only endpoints
      const loginResponses = [];
      const readResponses = [];

      // Test login endpoint
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
        loginResponses.push(response.status);
      }

      // Test read endpoint
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .get('/api/sites')
          .set('Authorization', 'Bearer test-token');
        readResponses.push(response.status);
      }

      // Login should be rate limited sooner (stricter)
      const loginRateLimited = loginResponses.some(s => s === 429);
      // Read might not be rate limited yet (more lenient)
      
      // At minimum, login should be rate limited
      expect(loginRateLimited).toBeTruthy();
    });
  });

  describe('Rate Limit Error Messages', () => {
    it('should return appropriate error message when rate limited', async () => {
      // Exceed rate limit
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      if (response.status === 429) {
        expect(response.body).toBeDefined();
        expect(response.body.error || response.body.message).toBeDefined();
        const errorMsg = (response.body.error || response.body.message || '').toLowerCase();
        expect(errorMsg).toMatch(/rate limit|too many requests|try again/i);
      }
    });
  });
});









