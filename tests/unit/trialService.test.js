/**
 * 🧪 PHASE 3 TDD: Trial Expiration Service - Unit Tests
 * 
 * Test-Driven Development Approach:
 * 1. Write these tests FIRST (currently failing) ❌
 * 2. Implement TrialService to make them pass ✅
 * 3. Refactor while keeping tests green ♻️
 * 
 * Critical Scenarios Tested:
 * - Date/time calculations (timezone-safe)
 * - Edge cases (midnight, DST, invalid dates)
 * - Concurrent operations (race conditions)
 * - Email scheduling (idempotency)
 * - Database atomicity (transactions)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrialService } from '../../server/services/trialService.js';

describe('TrialService - Date Calculations', () => {
  let service;

  beforeEach(() => {
    service = new TrialService();
  });

  describe('calculateDaysRemaining', () => {
    it('should calculate days remaining correctly', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      const expiresAt = new Date('2025-01-20T12:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBe(5);
    });

    it('should handle midnight boundary correctly', () => {
      // Edge case: Expires at midnight
      const now = new Date('2025-01-15T23:59:59Z');
      const expiresAt = new Date('2025-01-16T00:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      // Should round up to 1 day (< 24 hours but tomorrow)
      expect(days).toBe(1);
    });

    it('should handle time within same day correctly', () => {
      const now = new Date('2025-01-15T10:00:00Z');
      const expiresAt = new Date('2025-01-15T23:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      // Same day = 1 day remaining (rounds up)
      expect(days).toBe(1);
    });

    it('should return 0 for expired trials', () => {
      const now = new Date('2025-01-20T12:00:00Z');
      const expiresAt = new Date('2025-01-15T12:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBe(0);
    });

    it('should handle null expiresAt', () => {
      const now = new Date();
      
      const days = service.calculateDaysRemaining(null, now);
      
      expect(days).toBe(0);
    });

    it('should handle undefined expiresAt', () => {
      const now = new Date();
      
      const days = service.calculateDaysRemaining(undefined, now);
      
      expect(days).toBe(0);
    });

    it('should handle invalid date strings', () => {
      const now = new Date();
      
      const days = service.calculateDaysRemaining('invalid-date', now);
      
      expect(days).toBe(0);
    });

    it('should handle timezone differences correctly', () => {
      // Expires at 11PM EST = 4AM UTC next day
      const now = new Date('2025-01-15T00:00:00Z');
      const expiresAt = new Date('2025-01-16T04:00:00Z'); // 11PM EST
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      // Should be 1 day (crosses midnight UTC)
      expect(days).toBe(1);
    });

    it('should handle DST transition dates', () => {
      // DST transition: March 10, 2024 (spring forward)
      const now = new Date('2024-03-09T12:00:00Z');
      const expiresAt = new Date('2024-03-12T12:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBe(3);
    });

    it('should use UTC to avoid timezone issues', () => {
      // Test that internal calculation uses UTC
      const now = new Date('2025-01-15T00:00:00-05:00'); // EST
      const expiresAt = new Date('2025-01-16T00:00:00-05:00');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBe(1);
    });
  });

  describe('isTrialExpired', () => {
    it('should return true for expired trial', () => {
      const expiresAt = new Date('2025-01-01T00:00:00Z');
      const now = new Date('2025-01-15T12:00:00Z');
      
      const expired = service.isTrialExpired(expiresAt, now);
      
      expect(expired).toBe(true);
    });

    it('should return false for active trial', () => {
      const expiresAt = new Date('2025-01-20T00:00:00Z');
      const now = new Date('2025-01-15T12:00:00Z');
      
      const expired = service.isTrialExpired(expiresAt, now);
      
      expect(expired).toBe(false);
    });

    it('should return false for trial expiring today', () => {
      const expiresAt = new Date('2025-01-15T23:59:59Z');
      const now = new Date('2025-01-15T12:00:00Z');
      
      const expired = service.isTrialExpired(expiresAt, now);
      
      expect(expired).toBe(false);
    });
  });

  describe('getTrialStatus', () => {
    it('should return comprehensive trial status', () => {
      const expiresAt = new Date('2025-01-20T00:00:00Z');
      const now = new Date('2025-01-15T12:00:00Z');
      
      const status = service.getTrialStatus(expiresAt, now);
      
      expect(status).toMatchObject({
        isExpired: false,
        daysRemaining: 5,
        expiresAt: expiresAt,
        status: 'active'
      });
    });

    it('should mark trial as expiring soon (<=3 days)', () => {
      const expiresAt = new Date('2025-01-17T00:00:00Z');
      const now = new Date('2025-01-15T12:00:00Z');
      
      const status = service.getTrialStatus(expiresAt, now);
      
      expect(status.status).toBe('expiring_soon');
      expect(status.daysRemaining).toBe(2);
    });

    it('should mark trial as expired', () => {
      const expiresAt = new Date('2025-01-10T00:00:00Z');
      const now = new Date('2025-01-15T12:00:00Z');
      
      const status = service.getTrialStatus(expiresAt, now);
      
      expect(status.isExpired).toBe(true);
      expect(status.status).toBe('expired');
    });
  });
});

describe('TrialService - Site Access Checks', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };
    service = new TrialService(mockDb);
  });

  describe('checkSiteTrialStatus', () => {
    it('should allow access for active trial site', async () => {
      const siteId = 'site-123';
      mockDb.query.mockResolvedValue({
        rows: [{
          id: siteId,
          expires_at: new Date('2025-12-31T00:00:00Z'),
          plan: 'trial',
          status: 'published'
        }]
      });

      const result = await service.checkSiteTrialStatus(siteId);

      expect(result.canAccess).toBe(true);
      expect(result.isExpired).toBe(false);
    });

    it('should deny access for expired trial site', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          expires_at: new Date('2020-01-01T00:00:00Z'),
          plan: 'trial',
          status: 'published'
        }]
      });

      const result = await service.checkSiteTrialStatus('site-123');

      expect(result.canAccess).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.reason).toBe('TRIAL_EXPIRED');
    });

    it('should allow access for paid plan regardless of expires_at', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          expires_at: new Date('2020-01-01T00:00:00Z'), // Expired date
          plan: 'pro',
          status: 'published'
        }]
      });

      const result = await service.checkSiteTrialStatus('site-123');

      expect(result.canAccess).toBe(true);
      expect(result.hasPaidPlan).toBe(true);
    });

    it('should throw error for non-existent site', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(
        service.checkSiteTrialStatus('non-existent')
      ).rejects.toThrow('Site not found');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.checkSiteTrialStatus('site-123')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('shouldSendWarning', () => {
    it('should return true for 3 days remaining', () => {
      const daysRemaining = 3;
      
      const result = service.shouldSendWarning(daysRemaining);
      
      expect(result).toBe(true);
    });

    it('should return true for 1 day remaining', () => {
      const daysRemaining = 1;
      
      const result = service.shouldSendWarning(daysRemaining);
      
      expect(result).toBe(true);
    });

    it('should return false for 2 days remaining', () => {
      const daysRemaining = 2;
      
      const result = service.shouldSendWarning(daysRemaining);
      
      expect(result).toBe(false);
    });

    it('should return false for 0 days (expired)', () => {
      const daysRemaining = 0;
      
      const result = service.shouldSendWarning(daysRemaining);
      
      expect(result).toBe(false);
    });

    it('should return false for 5+ days remaining', () => {
      const daysRemaining = 5;
      
      const result = service.shouldSendWarning(daysRemaining);
      
      expect(result).toBe(false);
    });
  });
});

describe('TrialService - Email Warnings', () => {
  let service;
  let mockDb;
  let mockEmail;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };
    mockEmail = {
      sendTrialEmail: vi.fn().mockResolvedValue({ success: true })
    };
    service = new TrialService(mockDb, mockEmail);
  });

  describe('sendTrialWarnings', () => {
    it('should send warnings to sites expiring in 3 days', async () => {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      mockDb.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test',
          expires_at: threeDaysFromNow,
          site_data: { brand: { name: 'Test Business' } },
          owner_email: 'owner@test.com',
          warning_sent_at: null
        }]
      });

      const result = await service.sendTrialWarnings();

      expect(mockEmail.sendTrialEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner@test.com',
          type: 'expiring',
          trialData: expect.objectContaining({
            daysRemaining: 3
          })
        })
      );
      expect(result.sent).toBe(1);
    });

    it('should not send duplicate warnings', async () => {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      mockDb.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test',
          expires_at: new Date(),
          site_data: {},
          owner_email: 'owner@test.com',
          warning_sent_at: oneDayAgo // Already sent
        }]
      });

      const result = await service.sendTrialWarnings();

      expect(mockEmail.sendTrialEmail).not.toHaveBeenCalled();
      expect(result.skipped).toBe(1);
    });

    it('should handle email service failures gracefully', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 'site-123',
          subdomain: 'test',
          expires_at: new Date(),
          site_data: {},
          owner_email: 'owner@test.com',
          warning_sent_at: null
        }]
      });

      mockEmail.sendTrialEmail.mockRejectedValue(new Error('Email service down'));

      const result = await service.sendTrialWarnings();

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should mark email as sent after successful send', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'test',
          expires_at: new Date(),
          site_data: {},
          owner_email: 'owner@test.com',
          warning_sent_at: null
        }]
      }).mockResolvedValueOnce({ rowCount: 1 }); // UPDATE

      await service.sendTrialWarnings();

      // Check that UPDATE was called
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sites'),
        expect.arrayContaining(['site-123'])
      );
    });
  });
});

describe('TrialService - Deactivation', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn((callback) => {
        const txClient = {
          query: vi.fn()
        };
        return callback(txClient);
      })
    };
    service = new TrialService(mockDb);
  });

  describe('deactivateExpiredTrials', () => {
    it('should deactivate expired trial sites', async () => {
      const mockTx = {
        query: vi.fn()
          .mockResolvedValueOnce({ // SELECT with FOR UPDATE
            rows: [{
              id: 'site-123',
              subdomain: 'test',
              plan: 'trial',
              user_id: 'user-123'
            }]
          })
          .mockResolvedValueOnce({ // Payment check - no subscription
            rows: [{ has_subscription: false }]
          })
          .mockResolvedValueOnce({ // UPDATE status
            rowCount: 1
          })
          .mockResolvedValueOnce({ // INSERT audit log
            rowCount: 1
          })
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const result = await service.deactivateExpiredTrials();

      expect(result.deactivated).toBe(1);
      expect(mockTx.query).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE') // Locking query
      );
    });

    it('should not deactivate paid sites even if expires_at passed', async () => {
      const mockTx = {
        query: vi.fn().mockResolvedValue({
          rows: [{
            id: 'site-123',
            subdomain: 'test',
            plan: 'pro' // Paid plan
          }]
        })
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const result = await service.deactivateExpiredTrials();

      // Should not update site with paid plan
      expect(result.skipped).toBe(1);
      expect(result.deactivated).toBe(0);
    });

    it('should handle concurrent upgrades (race condition)', async () => {
      const mockTx = {
        query: vi.fn()
          .mockResolvedValueOnce({ // SELECT with FOR UPDATE
            rows: [{
              id: 'site-123',
              subdomain: 'test',
              plan: 'trial'
            }]
          })
          .mockResolvedValueOnce({ // Check for payment
            rows: [{ has_subscription: true }]
          })
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const result = await service.deactivateExpiredTrials();

      // Should not deactivate if payment found
      expect(result.deactivated).toBe(0);
      expect(result.skippedDueToPayment).toBe(1);
    });

    it('should use atomic transaction to prevent race conditions', async () => {
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = { query: vi.fn().mockResolvedValue({ rows: [] }) };
        return await callback(mockTx);
      });

      await service.deactivateExpiredTrials();

      // Verify transaction was used
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should create audit log entries for deactivated sites', async () => {
      const mockTx = {
        query: vi.fn()
          .mockResolvedValueOnce({ // SELECT
            rows: [{ id: 'site-123', subdomain: 'test', plan: 'trial', user_id: 'user-123' }]
          })
          .mockResolvedValueOnce({ // Payment check
            rows: [{ has_subscription: false }]
          })
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE status
          .mockResolvedValueOnce({ rowCount: 1 }) // INSERT audit log
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      await service.deactivateExpiredTrials();

      // Check audit log was created
      expect(mockTx.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        expect.any(Array)
      );
    });

    it('should rollback transaction on error', async () => {
      mockDb.transaction.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deactivateExpiredTrials()
      ).rejects.toThrow('Database error');
    });
  });
});

describe('TrialService - Edge Cases', () => {
  let service;

  beforeEach(() => {
    service = new TrialService();
  });

  describe('leap year handling', () => {
    it('should handle Feb 29 on leap year', () => {
      const now = new Date('2024-02-28T12:00:00Z');
      const expiresAt = new Date('2024-03-01T12:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBe(2); // Feb 29 exists in 2024
    });

    it('should handle Feb 28 on non-leap year', () => {
      const now = new Date('2025-02-28T12:00:00Z');
      const expiresAt = new Date('2025-03-01T12:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBe(1); // No Feb 29 in 2025
    });
  });

  describe('year boundary', () => {
    it('should handle New Year transition', () => {
      const now = new Date('2024-12-31T12:00:00Z');
      const expiresAt = new Date('2025-01-02T12:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBe(2);
    });
  });

  describe('extreme dates', () => {
    it('should handle very far future dates', () => {
      const now = new Date('2025-01-01T00:00:00Z');
      const expiresAt = new Date('2030-01-01T00:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBeGreaterThan(1800); // ~5 years
    });

    it('should handle very old dates', () => {
      const now = new Date('2025-01-01T00:00:00Z');
      const expiresAt = new Date('2020-01-01T00:00:00Z');
      
      const days = service.calculateDaysRemaining(expiresAt, now);
      
      expect(days).toBe(0);
    });
  });
});

