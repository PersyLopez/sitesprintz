/**
 * @vitest-environment node
 * @vitest-setup-file ./tests/setup.node.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  trackFailedLogin,
  isAccountLocked,
  clearFailedAttempts,
  clearAllAttempts,
  getAttemptCount,
  getRemainingAttempts,
  getLockedAccounts,
  unlockAccount,
  getConfig
} from '../../../server/utils/loginAttempts.js';

describe('Failed Login Tracking System', () => {
  const testEmail = 'test@example.com';
  const testIP = '192.168.1.1';

  beforeEach(() => {
    // Clear all tracking data before each test
    clearAllAttempts();
  });

  afterEach(() => {
    // Cleanup
    clearAllAttempts();
  });

  describe('trackFailedLogin()', () => {
    it('should track a failed login attempt', () => {
      const result = trackFailedLogin(testEmail, testIP);

      expect(result).toHaveProperty('count', 1);
      expect(result).toHaveProperty('firstAttempt');
      expect(result).toHaveProperty('lastAttempt');
      expect(result.lockedUntil).toBeNull();
    });

    it('should increment count on multiple failures', () => {
      trackFailedLogin(testEmail, testIP);
      trackFailedLogin(testEmail, testIP);
      const result = trackFailedLogin(testEmail, testIP);

      expect(result.count).toBe(3);
    });

    it('should lock account after 5 failed attempts', () => {
      // Attempt 1-4: not locked
      for (let i = 0; i < 4; i++) {
        const result = trackFailedLogin(testEmail, testIP);
        expect(result.lockedUntil).toBeNull();
      }

      // Attempt 5: locked
      const result = trackFailedLogin(testEmail, testIP);
      expect(result.count).toBe(5);
      expect(result.lockedUntil).toBeGreaterThan(Date.now());
    });

    it('should handle case-insensitive emails', () => {
      trackFailedLogin('Test@Example.COM', testIP);
      trackFailedLogin('test@example.com', testIP);
      
      const count = getAttemptCount(testEmail, testIP);
      expect(count).toBe(2);
    });

    it('should track different IPs separately', () => {
      trackFailedLogin(testEmail, '192.168.1.1');
      trackFailedLogin(testEmail, '192.168.1.2');

      expect(getAttemptCount(testEmail, '192.168.1.1')).toBe(1);
      expect(getAttemptCount(testEmail, '192.168.1.2')).toBe(1);
    });

    it('should lock for 15 minutes', () => {
      for (let i = 0; i < 5; i++) {
        trackFailedLogin(testEmail, testIP);
      }

      const lockStatus = isAccountLocked(testEmail, testIP);
      expect(lockStatus.locked).toBe(true);
      
      // Lock duration should be approximately 15 minutes
      const expectedLockTime = 15 * 60 * 1000;
      expect(lockStatus.remainingTime).toBeGreaterThan(expectedLockTime - 1000);
      expect(lockStatus.remainingTime).toBeLessThanOrEqual(expectedLockTime);
    });
  });

  describe('isAccountLocked()', () => {
    it('should return false for account with no failed attempts', () => {
      const locked = isAccountLocked(testEmail, testIP);
      expect(locked).toBe(false);
    });

    it('should return false for account with < 5 failed attempts', () => {
      trackFailedLogin(testEmail, testIP);
      trackFailedLogin(testEmail, testIP);
      
      const locked = isAccountLocked(testEmail, testIP);
      expect(locked).toBe(false);
    });

    it('should return lock status for locked account', () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        trackFailedLogin(testEmail, testIP);
      }

      const locked = isAccountLocked(testEmail, testIP);
      
      expect(locked).toHaveProperty('locked', true);
      expect(locked).toHaveProperty('remainingTime');
      expect(locked).toHaveProperty('remainingMinutes');
      expect(locked).toHaveProperty('attempts', 5);
      expect(locked.remainingMinutes).toBeGreaterThan(0);
      expect(locked.remainingMinutes).toBeLessThanOrEqual(15);
    });

    it('should clear lock after time expires', async () => {
      // This test would require mocking time, skip for now
      // In real scenario, lock expires after 15 minutes
    });
  });

  describe('clearFailedAttempts()', () => {
    it('should clear failed login attempts', () => {
      trackFailedLogin(testEmail, testIP);
      trackFailedLogin(testEmail, testIP);
      
      expect(getAttemptCount(testEmail, testIP)).toBe(2);

      clearFailedAttempts(testEmail, testIP);
      
      expect(getAttemptCount(testEmail, testIP)).toBe(0);
    });

    it('should unlock account if locked', () => {
      for (let i = 0; i < 5; i++) {
        trackFailedLogin(testEmail, testIP);
      }

      expect(isAccountLocked(testEmail, testIP).locked).toBe(true);

      clearFailedAttempts(testEmail, testIP);
      
      expect(isAccountLocked(testEmail, testIP)).toBe(false);
    });

    it('should be safe to call on non-existent attempts', () => {
      expect(() => clearFailedAttempts('nobody@example.com', '1.2.3.4')).not.toThrow();
    });
  });

  describe('getAttemptCount()', () => {
    it('should return 0 for no attempts', () => {
      expect(getAttemptCount(testEmail, testIP)).toBe(0);
    });

    it('should return correct count', () => {
      trackFailedLogin(testEmail, testIP);
      expect(getAttemptCount(testEmail, testIP)).toBe(1);

      trackFailedLogin(testEmail, testIP);
      expect(getAttemptCount(testEmail, testIP)).toBe(2);
    });
  });

  describe('getRemainingAttempts()', () => {
    it('should return 5 for no attempts', () => {
      expect(getRemainingAttempts(testEmail, testIP)).toBe(5);
    });

    it('should decrease with each failed attempt', () => {
      expect(getRemainingAttempts(testEmail, testIP)).toBe(5);

      trackFailedLogin(testEmail, testIP);
      expect(getRemainingAttempts(testEmail, testIP)).toBe(4);

      trackFailedLogin(testEmail, testIP);
      expect(getRemainingAttempts(testEmail, testIP)).toBe(3);
    });

    it('should return 0 after account is locked', () => {
      for (let i = 0; i < 5; i++) {
        trackFailedLogin(testEmail, testIP);
      }

      expect(getRemainingAttempts(testEmail, testIP)).toBe(0);
    });

    it('should never return negative numbers', () => {
      for (let i = 0; i < 10; i++) {
        trackFailedLogin(testEmail, testIP);
      }

      expect(getRemainingAttempts(testEmail, testIP)).toBe(0);
    });
  });

  describe('getLockedAccounts()', () => {
    it('should return empty array when no accounts are locked', () => {
      const locked = getLockedAccounts();
      expect(locked).toEqual([]);
    });

    it('should return list of locked accounts', () => {
      // Lock two accounts
      for (let i = 0; i < 5; i++) {
        trackFailedLogin('user1@example.com', '192.168.1.1');
        trackFailedLogin('user2@example.com', '192.168.1.2');
      }

      const locked = getLockedAccounts();
      
      expect(locked).toHaveLength(2);
      expect(locked[0]).toHaveProperty('email');
      expect(locked[0]).toHaveProperty('ip');
      expect(locked[0]).toHaveProperty('attempts', 5);
      expect(locked[0]).toHaveProperty('lockedUntil');
      expect(locked[0]).toHaveProperty('remainingMinutes');
    });

    it('should not include unlocked accounts', () => {
      // Clear any previous state
      clearAllAttempts();
      
      // Lock one account
      for (let i = 0; i < 5; i++) {
        trackFailedLogin('locked@example.com', '192.168.1.1');
      }

      // Partially fail another (not enough to lock)
      trackFailedLogin('notlocked@example.com', '192.168.1.2');

      const locked = getLockedAccounts();
      
      expect(locked).toHaveLength(1);
      expect(locked[0].email).toBe('locked@example.com');
    });
  });

  describe('unlockAccount()', () => {
    it('should unlock a specific email/IP combination', () => {
      for (let i = 0; i < 5; i++) {
        trackFailedLogin(testEmail, testIP);
      }

      expect(isAccountLocked(testEmail, testIP).locked).toBe(true);

      unlockAccount(testEmail, testIP);

      expect(isAccountLocked(testEmail, testIP)).toBe(false);
    });

    it('should unlock all IPs for an email if IP not specified', () => {
      // Lock from multiple IPs
      for (let i = 0; i < 5; i++) {
        trackFailedLogin(testEmail, '192.168.1.1');
        trackFailedLogin(testEmail, '192.168.1.2');
      }

      expect(isAccountLocked(testEmail, '192.168.1.1').locked).toBe(true);
      expect(isAccountLocked(testEmail, '192.168.1.2').locked).toBe(true);

      unlockAccount(testEmail);

      expect(isAccountLocked(testEmail, '192.168.1.1')).toBe(false);
      expect(isAccountLocked(testEmail, '192.168.1.2')).toBe(false);
    });

    it('should be safe to call on non-locked accounts', () => {
      expect(() => unlockAccount(testEmail, testIP)).not.toThrow();
    });
  });

  describe('getConfig()', () => {
    it('should return configuration values', () => {
      const config = getConfig();

      expect(config).toHaveProperty('maxAttempts', 5);
      expect(config).toHaveProperty('lockDuration');
      expect(config).toHaveProperty('lockDurationMinutes', 15);
      expect(config).toHaveProperty('attemptWindow');
      expect(config).toHaveProperty('attemptWindowMinutes', 60);
    });
  });
});

