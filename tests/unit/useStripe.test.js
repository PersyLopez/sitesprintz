import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStripe } from '../../src/hooks/useStripe';

// Mock the stripe utility
vi.mock('../../src/utils/stripe', () => ({
  initializeStripe: vi.fn()
}));

import { initializeStripe } from '../../src/utils/stripe';

describe('useStripe Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Stripe Initialization', () => {
    it('should initialize Stripe with publishable key', async () => {
      const mockStripe = { elements: vi.fn(), createPaymentMethod: vi.fn() };
      vi.mocked(initializeStripe).mockResolvedValue(mockStripe);

      const { result } = renderHook(() => useStripe('pk_test_123'));

      expect(result.current.loading).toBe(true);
      expect(result.current.stripe).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stripe).toBe(mockStripe);
      expect(result.current.error).toBeNull();
      expect(initializeStripe).toHaveBeenCalledWith('pk_test_123');
    });

    it('should not initialize without publishable key', () => {
      const { result } = renderHook(() => useStripe(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.stripe).toBeNull();
      expect(result.current.error).toBeNull();
      expect(initializeStripe).not.toHaveBeenCalled();
    });

    it('should not initialize with undefined key', () => {
      const { result } = renderHook(() => useStripe(undefined));

      expect(result.current.loading).toBe(false);
      expect(result.current.stripe).toBeNull();
      expect(initializeStripe).not.toHaveBeenCalled();
    });

    it('should not initialize with empty string key', () => {
      const { result } = renderHook(() => useStripe(''));

      expect(result.current.loading).toBe(false);
      expect(result.current.stripe).toBeNull();
      expect(initializeStripe).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should start with loading true when key provided', () => {
      vi.mocked(initializeStripe).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useStripe('pk_test_123'));

      expect(result.current.loading).toBe(true);
      expect(result.current.stripe).toBeNull();
    });

    it('should set loading false after successful initialization', async () => {
      const mockStripe = { elements: vi.fn() };
      vi.mocked(initializeStripe).mockResolvedValue(mockStripe);

      const { result } = renderHook(() => useStripe('pk_test_123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stripe).toBe(mockStripe);
    });

    it('should set loading false after error', async () => {
      vi.mocked(initializeStripe).mockRejectedValue(new Error('Failed to load Stripe'));

      const { result } = renderHook(() => useStripe('pk_test_123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load Stripe');
      expect(result.current.stripe).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization error', async () => {
      const errorMessage = 'Invalid publishable key';
      vi.mocked(initializeStripe).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useStripe('pk_invalid'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.stripe).toBeNull();
    });

    it('should clear error on successful retry', async () => {
      // First call fails
      vi.mocked(initializeStripe).mockRejectedValueOnce(new Error('Network error'));

      const { result, rerender } = renderHook(
        ({ key }) => useStripe(key),
        { initialProps: { key: 'pk_test_fail' } }
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      // Second call succeeds
      const mockStripe = { elements: vi.fn() };
      vi.mocked(initializeStripe).mockResolvedValue(mockStripe);

      rerender({ key: 'pk_test_success' });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.stripe).toBe(mockStripe);
      });
    });

    it('should handle errors without crashing', async () => {
      vi.mocked(initializeStripe).mockRejectedValue(new Error('Stripe.js failed to load'));

      const { result } = renderHook(() => useStripe('pk_test_123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash, error should be captured
      expect(result.current.error).toBeTruthy();
      expect(result.current.stripe).toBeNull();
    });
  });

  describe('Cleanup on Unmount', () => {
    it('should not update state after unmount', async () => {
      const mockStripe = { elements: vi.fn() };
      let resolveInit;
      vi.mocked(initializeStripe).mockImplementation(() => 
        new Promise(resolve => { resolveInit = resolve; })
      );

      const { result, unmount } = renderHook(() => useStripe('pk_test_123'));

      expect(result.current.loading).toBe(true);

      unmount();

      // Resolve after unmount
      resolveInit(mockStripe);

      await new Promise(resolve => setTimeout(resolve, 10));

      // State should not have updated
      expect(result.current.loading).toBe(true);
      expect(result.current.stripe).toBeNull();
    });

    it('should handle unmount during initialization', () => {
      vi.mocked(initializeStripe).mockImplementation(() => new Promise(() => {}));

      const { unmount } = renderHook(() => useStripe('pk_test_123'));

      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Key Changes', () => {
    it('should reinitialize when key changes', async () => {
      const mockStripe1 = { id: 'stripe-1' };
      const mockStripe2 = { id: 'stripe-2' };

      vi.mocked(initializeStripe)
        .mockResolvedValueOnce(mockStripe1)
        .mockResolvedValueOnce(mockStripe2);

      const { result, rerender } = renderHook(
        ({ key }) => useStripe(key),
        { initialProps: { key: 'pk_test_first' } }
      );

      await waitFor(() => {
        expect(result.current.stripe).toBe(mockStripe1);
      });

      rerender({ key: 'pk_test_second' });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.stripe).toBe(mockStripe2);
      });

      expect(initializeStripe).toHaveBeenCalledTimes(2);
    });

    it('should not reinitialize with same key', async () => {
      const mockStripe = { elements: vi.fn() };
      vi.mocked(initializeStripe).mockResolvedValue(mockStripe);

      const { result, rerender } = renderHook(
        ({ key }) => useStripe(key),
        { initialProps: { key: 'pk_test_same' } }
      );

      await waitFor(() => {
        expect(result.current.stripe).toBe(mockStripe);
      });

      rerender({ key: 'pk_test_same' });

      // Should not reinitialize
      expect(initializeStripe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Return Values', () => {
    it('should return correct structure', async () => {
      const mockStripe = { elements: vi.fn() };
      vi.mocked(initializeStripe).mockResolvedValue(mockStripe);

      const { result } = renderHook(() => useStripe('pk_test_123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('stripe');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
    });
  });
});


