import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../../src/context/AuthContext';
import { authService } from '../../src/services/auth';

// Mock auth service
vi.mock('../../src/services/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('AuthContext', () => {
  let contextValue;

  const TestComponent = () => {
    contextValue = React.useContext(AuthContext);
    return null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    contextValue = null;
  });

  it('should initialize with null user and no token', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(contextValue.user).toBeNull();
    expect(contextValue.token).toBeNull();
    expect(contextValue.isAuthenticated).toBe(false);
  });

  it('should set loading to false after initialization', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });
  });

  it('should restore user from localStorage token', async () => {
    const mockUser = { id: 1, email: 'test@example.com', role: 'user' };
    localStorage.setItem('authToken', 'test-token');
    authService.getCurrentUser.mockResolvedValueOnce({ user: mockUser });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(contextValue.user).toEqual(mockUser);
      expect(contextValue.token).toBe('test-token');
      expect(contextValue.isAuthenticated).toBe(true);
    });
  });

  it('should clear token if getCurrentUser fails', async () => {
    localStorage.setItem('authToken', 'invalid-token');
    authService.getCurrentUser.mockRejectedValueOnce(new Error('Invalid token'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(contextValue.token).toBeNull();
      expect(contextValue.user).toBeNull();
    });
  });

  it('should handle login successfully', async () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    const mockData = { user: mockUser, token: 'new-token' };
    authService.login.mockResolvedValueOnce(mockData);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    await contextValue.login('test@example.com', 'password123');

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(contextValue.user).toEqual(mockUser);
      expect(contextValue.token).toBe('new-token');
      expect(contextValue.isAuthenticated).toBe(true);
    });
  });

  it('should throw error on login failure', async () => {
    authService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    await expect(contextValue.login('wrong@example.com', 'wrongpass')).rejects.toThrow('Invalid credentials');
  });

  it('should handle register successfully', async () => {
    const mockUser = { id: 1, email: 'new@example.com' };
    const mockData = { user: mockUser, token: 'new-token' };
    authService.register.mockResolvedValueOnce(mockData);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    await contextValue.register('new@example.com', 'password123');

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith('new@example.com', 'password123');
      expect(contextValue.user).toEqual(mockUser);
      expect(contextValue.token).toBe('new-token');
      expect(contextValue.isAuthenticated).toBe(true);
    });
  });

  it('should throw error on register failure', async () => {
    authService.register.mockRejectedValueOnce(new Error('Email already exists'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    await expect(contextValue.register('existing@example.com', 'password123')).rejects.toThrow('Email already exists');
  });

  it('should handle logout successfully', async () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    localStorage.setItem('authToken', 'test-token');
    authService.getCurrentUser.mockResolvedValueOnce({ user: mockUser });
    authService.logout.mockResolvedValueOnce({});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.user).toEqual(mockUser);
    });

    await contextValue.logout();

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
      expect(contextValue.user).toBeNull();
      expect(contextValue.token).toBeNull();
      expect(contextValue.isAuthenticated).toBe(false);
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  it('should clear state even if logout API call fails', async () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    localStorage.setItem('authToken', 'test-token');
    authService.getCurrentUser.mockResolvedValueOnce({ user: mockUser });
    authService.logout.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.user).toEqual(mockUser);
    });

    await contextValue.logout();

    await waitFor(() => {
      expect(contextValue.user).toBeNull();
      expect(contextValue.token).toBeNull();
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  it('should allow manual user update via setUser', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    const newUser = { id: 2, email: 'manual@example.com' };
    contextValue.setUser(newUser);

    await waitFor(() => {
      expect(contextValue.user).toEqual(newUser);
      expect(contextValue.isAuthenticated).toBe(true);
    });
  });

  it('should allow manual token update via setToken', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    contextValue.setToken('manual-token');

    await waitFor(() => {
      expect(contextValue.token).toBe('manual-token');
    });
  });

  it('should provide checkAuth function', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    expect(contextValue.checkAuth).toBeDefined();
    expect(typeof contextValue.checkAuth).toBe('function');
  });

  it('should handle getCurrentUser returning user directly (not wrapped)', async () => {
    const mockUser = { id: 1, email: 'test@example.com', role: 'user' };
    localStorage.setItem('authToken', 'test-token');
    authService.getCurrentUser.mockResolvedValueOnce(mockUser); // Not wrapped in {user: ...}

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.user).toEqual(mockUser);
      expect(contextValue.isAuthenticated).toBe(true);
    });
  });
});

