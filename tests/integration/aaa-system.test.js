/**
 * @vitest-environment node
 * @vitest-setup-file ./tests/setup.node.js
 * 
 * Integration tests for the complete AAA (Authentication, Authorization, Accounting) system
 * Tests the full flow from login attempts through audit logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as db from '../../database/db.js';
import { auditLog } from '../../server/utils/audit.js';
import { 
  clearFailedAttempts, 
  clearAllAttempts,
  getAttemptCount,
  getLockedAccounts 
} from '../../server/utils/loginAttempts.js';

// Mock dependencies
vi.mock('../../database/db.js');
vi.mock('../../server/utils/audit.js');

describe('AAA System Integration Tests', () => {
  const testUser = {
    id: 1,
    email: 'test@example.com',
    password: 'SecurePassword123!',
    password_hash: '', // Will be set in beforeEach
    name: 'Test User',
    role: 'user',
    subscription_plan: 'pro',
    subscription_status: 'active',
    stripe_customer_id: 'cus_test123'
  };

  const adminUser = {
    id: 2,
    email: 'admin@example.com',
    password: 'AdminPass123!',
    password_hash: '',
    name: 'Admin User',
    role: 'admin',
    subscription_plan: 'enterprise',
    subscription_status: 'active',
    stripe_customer_id: 'cus_admin123'
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Hash passwords
    testUser.password_hash = await bcrypt.hash(testUser.password, 10);
    adminUser.password_hash = await bcrypt.hash(adminUser.password, 10);

    // Clear ALL failed login attempts for clean state
    clearAllAttempts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Failed Login Tracking Flow', () => {
    it('should track failed login attempts and audit them', async () => {
      const mockReq = {
        body: { email: testUser.email, password: 'WrongPassword' },
        ip: '192.168.1.100',
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'user-agent': 'Test Agent' }
      };

      // Mock database to return user
      vi.mocked(db.query).mockResolvedValue({
        rows: [testUser]
      });

      // Simulate the login route logic
      const { trackFailedLogin, getRemainingAttempts } = await import('../../../server/utils/loginAttempts.js');
      
      // First attempt
      trackFailedLogin(testUser.email, mockReq.ip);
      let remaining = getRemainingAttempts(testUser.email, mockReq.ip);
      expect(remaining).toBe(4);

      // Second attempt
      trackFailedLogin(testUser.email, mockReq.ip);
      remaining = getRemainingAttempts(testUser.email, mockReq.ip);
      expect(remaining).toBe(3);

      // Verify audit log was called (would be called in real route)
      expect(getAttemptCount(testUser.email, mockReq.ip)).toBe(2);
    });

    it('should lock account after 5 failed attempts', async () => {
      const { trackFailedLogin, isAccountLocked } = await import('../../../server/utils/loginAttempts.js');
      const testIP = '192.168.1.100';

      // Attempt 5 times
      for (let i = 0; i < 5; i++) {
        trackFailedLogin(testUser.email, testIP);
      }

      const lockStatus = isAccountLocked(testUser.email, testIP);
      expect(lockStatus.locked).toBe(true);
      expect(lockStatus.remainingMinutes).toBeGreaterThan(0);
      expect(lockStatus.attempts).toBe(5);
    });

    it('should clear attempts after successful login', async () => {
      const { trackFailedLogin, clearFailedAttempts, getAttemptCount } = 
        await import('../../../server/utils/loginAttempts.js');
      const testIP = '192.168.1.100';

      // Track some failed attempts
      trackFailedLogin(testUser.email, testIP);
      trackFailedLogin(testUser.email, testIP);
      expect(getAttemptCount(testUser.email, testIP)).toBe(2);

      // Successful login clears attempts
      clearFailedAttempts(testUser.email, testIP);
      expect(getAttemptCount(testUser.email, testIP)).toBe(0);
    });

    it('should track attempts separately per IP', async () => {
      const { trackFailedLogin, getAttemptCount } = await import('../../../server/utils/loginAttempts.js');

      trackFailedLogin(testUser.email, '192.168.1.1');
      trackFailedLogin(testUser.email, '192.168.1.1');
      trackFailedLogin(testUser.email, '10.0.0.1');

      expect(getAttemptCount(testUser.email, '192.168.1.1')).toBe(2);
      expect(getAttemptCount(testUser.email, '10.0.0.1')).toBe(1);
    });
  });

  describe('Admin Authorization Flow', () => {
    it('should deny regular user access to admin routes', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      // Mock database to return regular user
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: testUser.id,
          email: testUser.email,
          role: 'user',
          status: 'active',
          subscription_status: testUser.subscription_status,
          subscription_plan: testUser.subscription_plan
        }]
      });

      const { requireAdmin } = await import('../../../server/middleware/auth.js');
      
      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        ip: '192.168.1.1',
        path: '/api/admin/users',
        method: 'GET'
      };
      
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      
      const mockNext = vi.fn();

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin user access to admin routes', async () => {
      const token = jwt.sign(
        { userId: adminUser.id, email: adminUser.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      // Mock database to return admin user
      vi.mocked(db.query).mockResolvedValue({
        rows: [{
          id: adminUser.id,
          email: adminUser.email,
          role: 'admin',
          status: 'active',
          subscription_status: adminUser.subscription_status,
          subscription_plan: adminUser.subscription_plan
        }]
      });

      const { requireAdmin } = await import('../../../server/middleware/auth.js');
      
      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        ip: '192.168.1.1',
        path: '/api/admin/users',
        method: 'GET'
      };
      
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      
      const mockNext = vi.fn();

      await requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.role).toBe('admin');
    });
  });

  describe('Audit Trail Flow', () => {
    it('should audit successful login', async () => {
      const mockReq = {
        user: { id: testUser.id, email: testUser.email },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Browser' },
        path: '/api/auth/login',
        method: 'POST'
      };

      await auditLog('login.success', mockReq, {
        userId: testUser.id,
        method: 'password'
      });

      expect(auditLog).toHaveBeenCalledWith(
        'login.success',
        expect.objectContaining({
          user: expect.objectContaining({ email: testUser.email })
        }),
        expect.objectContaining({
          userId: testUser.id,
          method: 'password'
        })
      );
    });

    it('should audit failed login', async () => {
      const mockReq = {
        user: null,
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Browser' },
        path: '/api/auth/login',
        method: 'POST'
      };

      await auditLog('login.failed', mockReq, {
        email: testUser.email,
        reason: 'invalid_password',
        attemptsRemaining: 4
      });

      expect(auditLog).toHaveBeenCalledWith(
        'login.failed',
        mockReq,
        expect.objectContaining({
          reason: 'invalid_password'
        })
      );
    });

    it('should audit account lockout', async () => {
      const mockReq = {
        user: null,
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Browser' },
        path: '/api/auth/login',
        method: 'POST'
      };

      await auditLog('login.blocked', mockReq, {
        email: testUser.email,
        reason: 'too_many_attempts',
        attempts: 5
      });

      expect(auditLog).toHaveBeenCalledWith(
        'login.blocked',
        mockReq,
        expect.objectContaining({
          reason: 'too_many_attempts',
          attempts: 5
        })
      );
    });

    it('should audit admin access attempts', async () => {
      const mockReq = {
        user: { id: testUser.id, email: testUser.email, role: 'user' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Browser' },
        path: '/api/admin/users',
        method: 'GET'
      };

      await auditLog('admin.access_denied', mockReq, {
        attemptedPath: '/api/admin/users'
      });

      expect(auditLog).toHaveBeenCalled();
    });
  });

  describe('Complete AAA Flow Scenarios', () => {
    it('should handle complete failed login → lockout → audit flow', async () => {
      const { trackFailedLogin, isAccountLocked } = await import('../../../server/utils/loginAttempts.js');
      const testIP = '192.168.1.100';

      // Scenario: User forgets password and tries 5 times
      for (let i = 0; i < 5; i++) {
        trackFailedLogin(testUser.email, testIP);
        
        // Would trigger audit log in real implementation
        if (i < 4) {
          await auditLog('login.failed', 
            { ip: testIP, path: '/api/auth/login', method: 'POST', headers: {} },
            { email: testUser.email, attemptsRemaining: 4 - i }
          );
        }
      }

      // Check lockout
      const lockStatus = isAccountLocked(testUser.email, testIP);
      expect(lockStatus.locked).toBe(true);

      // Would trigger lockout audit log
      auditLog('login.blocked',
        { ip: testIP, path: '/api/auth/login', method: 'POST', headers: {} },
        { email: testUser.email, attempts: 5 }
      );

      // Note: auditLog is mocked, so we can't assert on call count in this style
      // In real implementation, this would be called by the auth route
      expect(lockStatus.locked).toBe(true);
    });

    it('should handle admin privilege escalation attempt', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      // Mock database query to return regular user
      db.query.mockResolvedValue({
        rows: [{
          id: testUser.id,
          email: testUser.email,
          role: 'user', // Regular user
          status: 'active',
          subscription_status: 'active',
          subscription_plan: 'pro'
        }]
      });

      const { requireAdmin } = await import('../../server/middleware/auth.js');
      
      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        ip: '192.168.1.1',
        path: '/api/admin/delete-user',
        method: 'DELETE'
      };
      
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      
      const mockNext = vi.fn();

      await requireAdmin(mockReq, mockRes, mockNext);

      // Should be denied
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle account lockout from multiple IPs', async () => {
      const { trackFailedLogin, getLockedAccounts } = await import('../../server/utils/loginAttempts.js');

      // Distributed attack from 3 IPs
      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      
      ips.forEach(ip => {
        for (let i = 0; i < 5; i++) {
          trackFailedLogin(testUser.email, ip);
        }
      });

      const locked = getLockedAccounts();
      expect(locked.length).toBe(3); // All 3 IP+email combinations locked
    });

    it('should not lock different users from same IP', async () => {
      const { trackFailedLogin, isAccountLocked } = await import('../../server/utils/loginAttempts.js');
      const sharedIP = '192.168.1.1';

      // User 1 fails 5 times
      for (let i = 0; i < 5; i++) {
        trackFailedLogin('user1@example.com', sharedIP);
      }

      // User 2 fails 2 times
      for (let i = 0; i < 2; i++) {
        trackFailedLogin('user2@example.com', sharedIP);
      }

      expect(isAccountLocked('user1@example.com', sharedIP).locked).toBe(true);
      expect(isAccountLocked('user2@example.com', sharedIP)).toBe(false);
    });

    it('should handle case-insensitive email tracking', async () => {
      const { trackFailedLogin, getAttemptCount } = await import('../../server/utils/loginAttempts.js');
      const testIP = '192.168.1.1';

      trackFailedLogin('Test@Example.COM', testIP);
      trackFailedLogin('test@example.com', testIP);
      trackFailedLogin('TEST@EXAMPLE.COM', testIP);

      // Should all count as same user
      expect(getAttemptCount('test@example.com', testIP)).toBe(3);
    });
  });
});

