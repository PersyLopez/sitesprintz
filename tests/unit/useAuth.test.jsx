import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';
import { AuthContext } from '../../src/context/AuthContext';

describe('useAuth Hook', () => {
  describe('Context Usage', () => {
    it('should return context value when used within AuthProvider', () => {
      const mockAuthValue = {
        user: { id: '1', email: 'test@example.com' },
        login: () => {},
        logout: () => {},
        loading: false
      };

      const wrapper = ({ children }) => (
        <AuthContext.Provider value={mockAuthValue}>
          {children}
        </AuthContext.Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toBe(mockAuthValue);
      expect(result.current.user).toEqual(mockAuthValue.user);
      expect(result.current.loading).toBe(false);
    });

    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should throw error with correct message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        renderHook(() => useAuth());
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('useAuth must be used within an AuthProvider');
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Context Values', () => {
    it('should pass through all context properties', () => {
      const mockAuthValue = {
        user: { id: '123', email: 'user@example.com', role: 'admin' },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        loading: false,
        error: null
      };

      const wrapper = ({ children }) => (
        <AuthContext.Provider value={mockAuthValue}>
          {children}
        </AuthContext.Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toEqual(mockAuthValue.user);
      expect(result.current.login).toBe(mockAuthValue.login);
      expect(result.current.logout).toBe(mockAuthValue.logout);
      expect(result.current.register).toBe(mockAuthValue.register);
      expect(result.current.loading).toBe(mockAuthValue.loading);
      expect(result.current.error).toBe(mockAuthValue.error);
    });

    it('should handle null user', () => {
      const mockAuthValue = {
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false
      };

      const wrapper = ({ children }) => (
        <AuthContext.Provider value={mockAuthValue}>
          {children}
        </AuthContext.Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
    });

    it('should handle loading state', () => {
      const mockAuthValue = {
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        loading: true
      };

      const wrapper = ({ children }) => (
        <AuthContext.Provider value={mockAuthValue}>
          {children}
        </AuthContext.Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
    });
  });
});


