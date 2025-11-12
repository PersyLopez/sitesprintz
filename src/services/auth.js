// Authentication API service
import api from './api.js';

export const authService = {
  // Register new user
  async register(email, password) {
    const data = await api.post('/api/auth/register', { email, password });
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    return data;
  },

  // Login user
  async login(email, password) {
    const data = await api.post('/api/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    return data;
  },

  // Logout user
  logout() {
    localStorage.removeItem('authToken');
    return api.post('/api/auth/logout', {});
  },

  // Get current user
  async getCurrentUser() {
    return api.get('/api/auth/me');
  },

  // Verify token
  async verifyToken() {
    return api.get('/api/auth/verify');
  },

  // Forgot password
  async forgotPassword(email) {
    return api.post('/api/auth/forgot-password', { email });
  },

  // Reset password
  async resetPassword(token, newPassword) {
    return api.post('/api/auth/reset-password', { token, newPassword });
  },

  // Change temporary password
  async changeTempPassword(currentPassword, newPassword) {
    return api.post('/api/auth/change-temp-password', { 
      currentPassword, 
      newPassword 
    });
  },
};

export default authService;

