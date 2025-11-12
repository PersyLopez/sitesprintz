import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../../src/services/auth';
import api from '../../src/services/api';

// Mock the API client
vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Register (3 tests)
  describe('register', () => {
    it('should register user and store token', async () => {
      api.post.mockResolvedValueOnce({
        token: 'new-token-123',
        user: { id: 1, email: 'test@example.com' }
      });

      const result = await authService.register('test@example.com', 'password123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/register', {
        email: 'test@example.com',
        password: 'password123'
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'new-token-123');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle registration errors', async () => {
      api.post.mockRejectedValueOnce(new Error('Email already exists'));

      await expect(authService.register('test@example.com', 'pass')).rejects.toThrow();
    });

    it('should not store token if not provided', async () => {
      api.post.mockResolvedValueOnce({
        user: { id: 1, email: 'test@example.com' }
      });

      await authService.register('test@example.com', 'password');

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  // Login (3 tests)
  describe('login', () => {
    it('should login user and store token', async () => {
      api.post.mockResolvedValueOnce({
        token: 'login-token-456',
        user: { id: 1, email: 'user@example.com' }
      });

      const result = await authService.login('user@example.com', 'password123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'user@example.com',
        password: 'password123'
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'login-token-456');
      expect(result.user.email).toBe('user@example.com');
    });

    it('should handle invalid credentials', async () => {
      api.post.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(authService.login('wrong@example.com', 'wrong')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.login('user@example.com', 'pass')).rejects.toThrow('Network error');
    });
  });

  // Logout (2 tests)
  describe('logout', () => {
    it('should logout user and remove token', async () => {
      api.post.mockResolvedValueOnce({ success: true });

      await authService.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
      expect(api.post).toHaveBeenCalledWith('/api/auth/logout', {});
    });

    it('should remove token even if API call fails', async () => {
      api.post.mockRejectedValueOnce(new Error('API error'));

      try {
        await authService.logout();
      } catch (e) {
        // Expected to fail
      }

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  // Get Current User (2 tests)
  describe('getCurrentUser', () => {
    it('should fetch current user', async () => {
      api.get.mockResolvedValueOnce({
        user: { id: 1, email: 'current@example.com' }
      });

      const result = await authService.getCurrentUser();

      expect(api.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result.user.email).toBe('current@example.com');
    });

    it('should handle unauthorized', async () => {
      api.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(authService.getCurrentUser()).rejects.toThrow();
    });
  });

  // Verify Token (2 tests)
  describe('verifyToken', () => {
    it('should verify token', async () => {
      api.get.mockResolvedValueOnce({ valid: true });

      const result = await authService.verifyToken();

      expect(api.get).toHaveBeenCalledWith('/api/auth/verify');
      expect(result.valid).toBe(true);
    });

    it('should handle invalid token', async () => {
      api.get.mockResolvedValueOnce({ valid: false });

      const result = await authService.verifyToken();

      expect(result.valid).toBe(false);
    });
  });

  // Forgot Password (2 tests)
  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      api.post.mockResolvedValueOnce({ success: true, message: 'Email sent' });

      const result = await authService.forgotPassword('forgot@example.com');

      expect(api.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'forgot@example.com'
      });
      expect(result.success).toBe(true);
    });

    it('should handle unknown email', async () => {
      api.post.mockRejectedValueOnce(new Error('Email not found'));

      await expect(authService.forgotPassword('unknown@example.com')).rejects.toThrow();
    });
  });

  // Reset Password (2 tests)
  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      api.post.mockResolvedValueOnce({ success: true });

      const result = await authService.resetPassword('reset-token-123', 'newPassword123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'reset-token-123',
        newPassword: 'newPassword123'
      });
      expect(result.success).toBe(true);
    });

    it('should handle invalid or expired token', async () => {
      api.post.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(authService.resetPassword('bad-token', 'pass')).rejects.toThrow();
    });
  });

  // Change Temp Password (2 tests)
  describe('changeTempPassword', () => {
    it('should change temporary password', async () => {
      api.post.mockResolvedValueOnce({ success: true });

      const result = await authService.changeTempPassword('temp123', 'newPass456');

      expect(api.post).toHaveBeenCalledWith('/api/auth/change-temp-password', {
        currentPassword: 'temp123',
        newPassword: 'newPass456'
      });
      expect(result.success).toBe(true);
    });

    it('should handle incorrect current password', async () => {
      api.post.mockRejectedValueOnce(new Error('Current password incorrect'));

      await expect(authService.changeTempPassword('wrong', 'new')).rejects.toThrow();
    });
  });
});

