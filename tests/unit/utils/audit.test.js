/**
 * @vitest-environment node
 * @vitest-setup-file ./tests/setup.node.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditLog, getUserAuditLogs, getSecurityEvents, AUDIT_ACTIONS } from '../../../server/utils/audit.js';
import logger from '../../../server/utils/logger.js';
import * as db from '../../../database/db.js';

// Mock dependencies
vi.mock('../../../server/utils/logger.js');
vi.mock('../../../database/db.js');

describe('Audit Trail System', () => {
  let mockReq;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mock request object
    mockReq = {
      user: {
        id: 1,
        email: 'test@example.com',
        role: 'user'
      },
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
        'x-forwarded-for': null
      },
      path: '/api/auth/login',
      method: 'POST'
    };

    // Mock database query to succeed by default
    vi.mocked(db.query).mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('auditLog()', () => {
    it('should log audit event to Winston logger', async () => {
      await auditLog(AUDIT_ACTIONS.LOGIN_SUCCESS, mockReq, { method: 'password' });

      expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
        action: 'login.success',
        userId: 1,
        email: 'test@example.com',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        path: '/api/auth/login',
        method: 'POST'
      }));
    });

    it('should store audit event in database', async () => {
      await auditLog(AUDIT_ACTIONS.LOGIN_SUCCESS, mockReq, { method: 'password' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          'login.success',
          1,
          '192.168.1.1',
          'Mozilla/5.0 Test Browser',
          '/api/auth/login',
          'POST',
          expect.any(String) // JSON stringified details
        ])
      );
    });

    it('should handle requests from anonymous users', async () => {
      const anonReq = {
        ...mockReq,
        user: null
      };

      await auditLog(AUDIT_ACTIONS.LOGIN_FAILED, anonReq, { reason: 'invalid_credentials' });

      expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
        userId: null,
        email: 'anonymous'
      }));
    });

    it('should use x-forwarded-for header if present', async () => {
      mockReq.headers['x-forwarded-for'] = '10.0.0.1';

      await auditLog(AUDIT_ACTIONS.LOGIN_SUCCESS, mockReq);

      expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
        ip: '10.0.0.1'
      }));
    });

    it('should include custom details in audit log', async () => {
      const details = {
        siteId: 123,
        domain: 'example.com',
        action: 'published'
      };

      await auditLog(AUDIT_ACTIONS.SITE_PUBLISHED, mockReq, details);

      expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining(details));
    });

    it('should not fail request if database insert fails', async () => {
      vi.mocked(db.query).mockRejectedValue(new Error('Database connection failed'));

      // Should not throw
      await expect(auditLog(AUDIT_ACTIONS.LOGIN_SUCCESS, mockReq)).resolves.not.toThrow();

      // Should log the error
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to write audit log to database:',
        expect.objectContaining({
          error: 'Database connection failed'
        })
      );
    });

    it('should handle missing user-agent gracefully', async () => {
      mockReq.headers['user-agent'] = undefined;

      await auditLog(AUDIT_ACTIONS.LOGIN_SUCCESS, mockReq);

      expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
        userAgent: 'unknown'
      }));
    });
  });

  describe('getUserAuditLogs()', () => {
    it('should retrieve audit logs for a specific user', async () => {
      const mockLogs = [
        { action: 'login.success', ip_address: '192.168.1.1', created_at: new Date() },
        { action: 'site.published', ip_address: '192.168.1.1', created_at: new Date() }
      ];

      vi.mocked(db.query).mockResolvedValue({ rows: mockLogs });

      const logs = await getUserAuditLogs(1, 50);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [1, 50]
      );
      expect(logs).toEqual(mockLogs);
    });

    it('should limit results to specified number', async () => {
      vi.mocked(db.query).mockResolvedValue({ rows: [] });

      await getUserAuditLogs(1, 25);

      expect(db.query).toHaveBeenCalledWith(
        expect.anything(),
        [1, 25]
      );
    });

    it('should use default limit of 100 if not specified', async () => {
      vi.mocked(db.query).mockResolvedValue({ rows: [] });

      await getUserAuditLogs(1);

      expect(db.query).toHaveBeenCalledWith(
        expect.anything(),
        [1, 100]
      );
    });

    it('should return empty array on database error', async () => {
      vi.mocked(db.query).mockRejectedValue(new Error('Query failed'));

      const logs = await getUserAuditLogs(1);

      expect(logs).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getSecurityEvents()', () => {
    it('should retrieve security-related events', async () => {
      const mockEvents = [
        { action: 'login.failed', user_id: 1, ip_address: '192.168.1.1' },
        { action: 'login.blocked', user_id: 1, ip_address: '192.168.1.1' }
      ];

      vi.mocked(db.query).mockResolvedValue({ rows: mockEvents });

      const events = await getSecurityEvents(50);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE action IN"),
        [50]
      );
      expect(events).toEqual(mockEvents);
    });

    it('should filter for security-critical actions only', async () => {
      vi.mocked(db.query).mockResolvedValue({ rows: [] });

      await getSecurityEvents();

      const query = vi.mocked(db.query).mock.calls[0][0];
      expect(query).toContain('login.failed');
      expect(query).toContain('login.blocked');
      expect(query).toContain('admin.access_denied');
      expect(query).toContain('access.denied');
    });

    it('should return empty array on database error', async () => {
      vi.mocked(db.query).mockRejectedValue(new Error('Query failed'));

      const events = await getSecurityEvents();

      expect(events).toEqual([]);
    });
  });

  describe('AUDIT_ACTIONS constants', () => {
    it('should have all expected action types', () => {
      expect(AUDIT_ACTIONS.LOGIN_SUCCESS).toBe('login.success');
      expect(AUDIT_ACTIONS.LOGIN_FAILED).toBe('login.failed');
      expect(AUDIT_ACTIONS.LOGIN_BLOCKED).toBe('login.blocked');
      expect(AUDIT_ACTIONS.SITE_PUBLISHED).toBe('site.published');
      expect(AUDIT_ACTIONS.PAYMENT_SUCCESS).toBe('payment.success');
      expect(AUDIT_ACTIONS.ADMIN_ACCESS_DENIED).toBe('admin.access_denied');
    });
  });
});

