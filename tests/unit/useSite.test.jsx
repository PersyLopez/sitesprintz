import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSite } from '../../src/hooks/useSite';
import { SiteProvider } from '../../src/context/SiteContext';

describe('useSite Hook', () => {
  // Basic Usage (2 tests)
  describe('Basic Usage', () => {
    it('should provide site context', () => {
      const { result } = renderHook(() => useSite(), {
        wrapper: ({ children }) => <SiteProvider>{children}</SiteProvider>
      });

      expect(result.current).toBeDefined();
      expect(result.current.siteData).toBeDefined();
    });

    it('should throw error if used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      try {
        expect(() => {
          renderHook(() => useSite());
        }).toThrow('useSite must be used within a SiteProvider');
      } finally {
        console.error = originalError;
      }
    });
  });

  // Context Values (3 tests)
  describe('Context Values', () => {
    it('should have updateField function', () => {
      const { result } = renderHook(() => useSite(), {
        wrapper: ({ children }) => <SiteProvider>{children}</SiteProvider>
      });

      expect(typeof result.current.updateField).toBe('function');
    });

    it('should have updateNestedField function', () => {
      const { result } = renderHook(() => useSite(), {
        wrapper: ({ children }) => <SiteProvider>{children}</SiteProvider>
      });

      expect(typeof result.current.updateNestedField).toBe('function');
    });

    it('should have siteData object', () => {
      const { result } = renderHook(() => useSite(), {
        wrapper: ({ children }) => <SiteProvider>{children}</SiteProvider>
      });

      expect(typeof result.current.siteData).toBe('object');
    });
  });
});

