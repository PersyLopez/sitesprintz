import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../src/services/auth';
import api from '../../src/services/api';

// Mock the api module
vi.mock('../../src/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
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

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockResponse = {
        user: { id: 1, email: 'new@example.com' },
        token: 'fake-jwt-token'
      };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.register('new@example.com', 'password123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/register', {
        email: 'new@example.com',
        password: 'password123'
      });
      expect(result).toEqual(mockResponse);
      expect(localStorage.getItem('authToken')).toBe('fake-jwt-token');
    });

    it('should store token in localStorage on successful registration', async () => {
      const mockResponse = {
        user: { id: 1, email: 'new@example.com' },
        token: 'test-token-123'
      };
      api.post.mockResolvedValueOnce(mockResponse);

      await authService.register('new@example.com', 'password123');

      expect(localStorage.getItem('authToken')).toBe('test-token-123');
    });

    it('should not store token if not provided in response', async () => {
      const mockResponse = {
        user: { id: 1, email: 'new@example.com' }
        // No token
      };
      api.post.mockResolvedValueOnce(mockResponse);

      await authService.register('new@example.com', 'password123');

      expect(localStorage.getItem('authToken')).toBeNull();
    });

    it('should throw error on registration failure', async () => {
      const mockError = new Error('Email already exists');
      api.post.mockRejectedValueOnce(mockError);

      await expect(authService.register('existing@example.com', 'password123'))
        .rejects.toThrow('Email already exists');
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockResponse = {
        user: { id: 1, email: 'test@example.com' },
        token: 'login-token'
      };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result).toEqual(mockResponse);
      expect(localStorage.getItem('authToken')).toBe('login-token');
    });

    it('should store token in localStorage on successful login', async () => {
      const mockResponse = {
        user: { id: 1, email: 'test@example.com' },
        token: 'login-token-456'
      };
      api.post.mockResolvedValueOnce(mockResponse);

      await authService.login('test@example.com', 'password123');

      expect(localStorage.getItem('authToken')).toBe('login-token-456');
    });

    it('should throw error on invalid credentials', async () => {
      const mockError = new Error('Invalid credentials');
      api.post.mockRejectedValueOnce(mockError);

      await expect(authService.login('wrong@example.com', 'wrongpass'))
        .rejects.toThrow('Invalid credentials');
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout user and remove token from localStorage', async () => {
      localStorage.setItem('authToken', 'test-token');
      api.post.mockResolvedValueOnce({});

      await authService.logout();

      expect(api.post).toHaveBeenCalledWith('/api/auth/logout', {});
      expect(localStorage.getItem('authToken')).toBeNull();
    });

    it('should call API even if no token exists', async () => {
      api.post.mockResolvedValueOnce({});

      await authService.logout();

      expect(api.post).toHaveBeenCalledWith('/api/auth/logout', {});
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user data', async () => {
      const mockUser = {
        user: { id: 1, email: 'test@example.com', role: 'user' }
      };
      api.get.mockResolvedValueOnce(mockUser);

      const result = await authService.getCurrentUser();

      expect(api.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not authenticated', async () => {
      const mockError = new Error('Unauthorized');
      api.get.mockRejectedValueOnce(mockError);

      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      const mockResponse = { valid: true };
      api.get.mockResolvedValueOnce(mockResponse);

      const result = await authService.verifyToken();

      expect(api.get).toHaveBeenCalledWith('/api/auth/verify');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if token is invalid', async () => {
      const mockError = new Error('Invalid token');
      api.get.mockRejectedValueOnce(mockError);

      await expect(authService.verifyToken()).rejects.toThrow('Invalid token');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const mockResponse = { message: 'Reset email sent' };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.forgotPassword('user@example.com');

      expect(api.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'user@example.com'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid email error', async () => {
      const mockError = new Error('Invalid email address');
      api.post.mockRejectedValueOnce(mockError);

      await expect(authService.forgotPassword('invalid-email'))
        .rejects.toThrow('Invalid email address');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockResponse = { message: 'Password reset successful' };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.resetPassword('reset-token-123', 'newPassword123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'reset-token-123',
        newPassword: 'newPassword123'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle expired token error', async () => {
      const mockError = new Error('Token expired');
      api.post.mockRejectedValueOnce(mockError);

      await expect(authService.resetPassword('expired-token', 'newPassword'))
        .rejects.toThrow('Token expired');
    });
  });

  describe('changeTempPassword', () => {
    it('should change temporary password successfully', async () => {
      const mockResponse = { message: 'Password changed successfully' };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.changeTempPassword('currentPass', 'newPass123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/change-temp-password', {
        currentPassword: 'currentPass',
        newPassword: 'newPass123'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle incorrect current password error', async () => {
      const mockError = new Error('Current password is incorrect');
      api.post.mockRejectedValueOnce(mockError);

      await expect(authService.changeTempPassword('wrongPass', 'newPass'))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  describe('token management', () => {
    it('should handle multiple token updates', async () => {
      const mockResponse1 = { user: { id: 1 }, token: 'token-1' };
      const mockResponse2 = { user: { id: 1 }, token: 'token-2' };

      api.post.mockResolvedValueOnce(mockResponse1);
      await authService.login('user@example.com', 'pass1');
      expect(localStorage.getItem('authToken')).toBe('token-1');

      api.post.mockResolvedValueOnce(mockResponse2);
      await authService.login('user@example.com', 'pass2');
      expect(localStorage.getItem('authToken')).toBe('token-2');
    });

    it('should properly clean up on logout', async () => {
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('otherData', 'should-remain');
      api.post.mockResolvedValueOnce({});

      await authService.logout();

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('otherData')).toBe('should-remain');
    });
  });
});

