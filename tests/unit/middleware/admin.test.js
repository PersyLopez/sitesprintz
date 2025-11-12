/**
 * @vitest-environment node
 * @vitest-setup-file ./tests/setup.node.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireAdmin } from '../../../server/middleware/auth.js';
import jwt from 'jsonwebtoken';
import * as db from '../../../database/db.js';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../../../database/db.js');

describe('Admin Authorization Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {},
      ip: '192.168.1.1',
      path: '/api/admin/users',
      method: 'GET'
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Requirements', () => {
    it('should return 401 if no token provided', async () => {
      mockReq.headers.authorization = undefined;

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      vi.mocked(jwt.verify).mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', async () => {
      mockReq.headers.authorization = 'Bearer expired-token';
      vi.mocked(jwt.verify).mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token expired' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if user not found in database', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({ userId: 999, email: 'notfound@example.com' });
      vi.mocked(db.query).mockResolvedValue({ rows: [] });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user account is suspended', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({ userId: 1 });
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'suspended@example.com',
          role: 'admin',
          status: 'suspended',
          subscription_status: null,
          subscription_plan: null
        }]
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Account is suspended' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Authorization Checks', () => {
    it('should return 403 if user is not an admin', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({ userId: 1 });
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'user@example.com',
          role: 'user',
          status: 'active',
          subscription_status: 'active',
          subscription_plan: 'pro'
        }]
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access if user is admin', async () => {
      mockReq.headers.authorization = 'Bearer admin-token';
      vi.mocked(jwt.verify).mockReturnValue({ userId: 1, email: 'admin@example.com' });
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
          subscription_status: 'active',
          subscription_plan: 'pro'
        }]
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach user object to request for admin', async () => {
      mockReq.headers.authorization = 'Bearer admin-token';
      vi.mocked(jwt.verify).mockReturnValue({ userId: 1 });
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
          subscription_status: 'active',
          subscription_plan: 'enterprise'
        }]
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({
        id: 1,
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        subscriptionStatus: 'active',
        subscriptionPlan: 'enterprise'
      });
    });
  });

  describe('Token Format Support', () => {
    it('should support userId in token', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({ userId: 1 });
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
          subscription_status: null,
          subscription_plan: null
        }]
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [1]
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should support id in token (backwards compatibility)', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({ id: 1 }); // Old format
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
          subscription_status: null,
          subscription_plan: null
        }]
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [1]
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected errors', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on database errors', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({ userId: 1 });
      vi.mocked(db.query).mockRejectedValue(new Error('Database connection failed'));

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should reject regular user trying to access admin panel', async () => {
      mockReq.headers.authorization = 'Bearer user-token';
      mockReq.path = '/api/admin/users';
      
      vi.mocked(jwt.verify).mockReturnValue({ userId: 5 });
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: 5,
          email: 'regular@example.com',
          role: 'user',
          status: 'active',
          subscription_status: 'active',
          subscription_plan: 'starter'
        }]
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow superadmin with enterprise subscription', async () => {
      mockReq.headers.authorization = 'Bearer superadmin-token';
      
      vi.mocked(jwt.verify).mockReturnValue({ userId: 1 });
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'superadmin@company.com',
          role: 'admin',
          status: 'active',
          subscription_status: 'active',
          subscription_plan: 'enterprise'
        }]
      });

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.role).toBe('admin');
    });

    it('should reject token from deleted user', async () => {
      mockReq.headers.authorization = 'Bearer old-token';
      
      vi.mocked(jwt.verify).mockReturnValue({ userId: 999 });
      vi.mocked(db.query).mockResolvedValue({ rows: [] }); // User deleted

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});

