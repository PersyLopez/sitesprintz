import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToast } from '../../src/hooks/useToast';
import { ToastProvider } from '../../src/context/ToastContext';

describe('useToast Hook', () => {
  // Basic Usage (2 tests)
  describe('Basic Usage', () => {
    it('should provide toast context', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>
      });

      expect(result.current).toBeDefined();
    });

    it('should throw error if used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      try {
        expect(() => {
          renderHook(() => useToast());
        }).toThrow('useToast must be used within a ToastProvider');
      } finally {
        console.error = originalError;
      }
    });
  });

  // Toast Functions (3 tests)
  describe('Toast Functions', () => {
    it('should have showSuccess function', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>
      });

      expect(typeof result.current.showSuccess).toBe('function');
    });

    it('should have showError function', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>
      });

      expect(typeof result.current.showError).toBe('function');
    });

    it('should have showInfo function', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children}) => <ToastProvider>{children}</ToastProvider>
      });

      expect(typeof result.current.showInfo).toBe('function');
    });
  });
});

