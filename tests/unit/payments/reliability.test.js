/**
 * Reliability Patterns Tests
 * 
 * Tests for retry logic and circuit breaker patterns.
 * Following TDD: Tests written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { withRetry, CircuitBreaker } from '../../../server/services/payments/reliability.js';

describe('Payment Reliability Patterns', () => {
  describe('withRetry()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on transient failures', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue({ success: true });

      const promise = withRetry(operation, { maxRetries: 3 });
      
      // Fast forward through retries
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await promise;
      
      expect(operation).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should NOT retry on non-transient errors', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Invalid API key'));

      const promise = withRetry(operation, { maxRetries: 3 });
      
      await expect(promise).rejects.toThrow('Invalid API key');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const timestamps = [];
      const operation = vi.fn().mockImplementation(() => {
        timestamps.push(Date.now());
        throw new Error('ECONNRESET');
      });

      const promise = withRetry(operation, { 
        maxRetries: 3, 
        baseDelay: 100 
      });

      // Advance time for first retry (100ms)
      await vi.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Advance time for second retry (200ms)
      await vi.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);

      // Should fail after max retries
      await expect(promise).rejects.toThrow();

      // Verify exponential delays
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        expect(delay1).toBeGreaterThanOrEqual(90);
        expect(delay2).toBeGreaterThanOrEqual(180);
      }
    });

    it('should retry on rate limit errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce({ code: 'rate_limit', message: 'Too many requests' })
        .mockResolvedValue({ success: true });

      const promise = withRetry(operation, { maxRetries: 3 });
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      expect(operation).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should retry on 503 Service Unavailable', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce({ code: '503', message: 'Service unavailable' })
        .mockResolvedValue({ success: true });

      const promise = withRetry(operation, { maxRetries: 3 });
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      expect(operation).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should fail after max retries', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('ECONNRESET'));

      const promise = withRetry(operation, { maxRetries: 2 });
      
      await vi.advanceTimersByTimeAsync(300);
      
      await expect(promise).rejects.toThrow('ECONNRESET');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should open circuit after threshold failures', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const operation = vi.fn().mockRejectedValue(new Error('fail'));

      // 3 failures
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow('fail');
      }

      // 4th call should fail immediately (circuit open)
      await expect(breaker.execute(operation))
        .rejects.toThrow('Circuit breaker is open');
      expect(operation).toHaveBeenCalledTimes(3); // Not called 4th time
    });

    it('should close circuit after recovery period', async () => {
      const breaker = new CircuitBreaker({ 
        failureThreshold: 1,
        recoveryTimeout: 5000
      });

      // Trigger open
      await expect(breaker.execute(() => Promise.reject(new Error('fail'))))
        .rejects.toThrow();

      // Fast forward past recovery
      vi.advanceTimersByTime(5001);

      // Should try again (half-open state)
      const successOp = vi.fn().mockResolvedValue('ok');
      const result = await breaker.execute(successOp);
      
      expect(successOp).toHaveBeenCalled();
      expect(result).toBe('ok');
    });

    it('should reset failure count on successful call', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      
      // One failure
      await expect(breaker.execute(() => Promise.reject(new Error('fail'))))
        .rejects.toThrow();
      
      // One success - should reset counter
      await breaker.execute(() => Promise.resolve('ok'));
      
      // Another failure - should not open circuit yet
      await expect(breaker.execute(() => Promise.reject(new Error('fail'))))
        .rejects.toThrow();
      
      // Circuit should still be closed (only 1 failure after reset)
      const successOp = vi.fn().mockResolvedValue('ok');
      await breaker.execute(successOp);
      expect(successOp).toHaveBeenCalled();
    });

    it('should track failures globally (not per operation)', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      
      const op1 = vi.fn().mockRejectedValue(new Error('fail1'));
      const op2 = vi.fn().mockRejectedValue(new Error('fail2'));
      
      // Fail op1 twice - opens circuit globally
      await expect(breaker.execute(op1)).rejects.toThrow();
      await expect(breaker.execute(op1)).rejects.toThrow();
      
      // Circuit is now open - all operations should fail
      await expect(breaker.execute(op1))
        .rejects.toThrow('Circuit breaker is open');
      
      // op2 should also fail (circuit is open globally)
      await expect(breaker.execute(op2))
        .rejects.toThrow('Circuit breaker is open');
    });

    it('should allow successful calls when circuit is half-open', async () => {
      const breaker = new CircuitBreaker({ 
        failureThreshold: 1,
        recoveryTimeout: 1000
      });

      // Open circuit
      await expect(breaker.execute(() => Promise.reject(new Error('fail'))))
        .rejects.toThrow();

      // Fast forward to recovery
      vi.advanceTimersByTime(1001);

      // Should allow one call (half-open state)
      const successOp = vi.fn().mockResolvedValue('ok');
      const result = await breaker.execute(successOp);
      
      expect(result).toBe('ok');
      expect(successOp).toHaveBeenCalledTimes(1);
    });

    it('should re-open circuit if half-open call fails', async () => {
      const breaker = new CircuitBreaker({ 
        failureThreshold: 1,
        recoveryTimeout: 1000
      });

      // Open circuit
      await expect(breaker.execute(() => Promise.reject(new Error('fail'))))
        .rejects.toThrow();

      // Fast forward to recovery
      vi.advanceTimersByTime(1001);

      // Half-open call fails
      await expect(breaker.execute(() => Promise.reject(new Error('fail'))))
        .rejects.toThrow();

      // Circuit should be open again
      await expect(breaker.execute(() => Promise.resolve('ok')))
        .rejects.toThrow('Circuit breaker is open');
    });
  });
});

