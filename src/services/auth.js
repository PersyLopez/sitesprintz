// Authentication API service
import api from './api.js';

// Token refresh management
let refreshTimer = null;
let isRefreshing = false;
let refreshPromise = null;

/**
 * Schedule automatic token refresh
 */
function scheduleTokenRefresh(expiresInSeconds) {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  
  // Refresh 1 minute before expiry (14 minutes for 15-minute tokens)
  const refreshTime = Math.max(0, (expiresInSeconds - 60) * 1000);
  
  if (refreshTime > 0) {
    refreshTimer = setTimeout(async () => {
      await refreshAccessToken();
    }, refreshTime);
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing) {
    return refreshPromise;
  }
  
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      
      // Schedule next refresh (15 minutes = 900 seconds)
      scheduleTokenRefresh(900);
      
      return data.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Refresh failed, logout user
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

/**
 * Intercept fetch to auto-refresh token on 401
 */
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  let response = await originalFetch(...args);
  
  // If 401, try to refresh token and retry
  if (response.status === 401 && args[0]?.includes('/api/')) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const newAccessToken = await refreshAccessToken();
        
        // Retry original request with new token
        const newHeaders = { ...args[1]?.headers };
        newHeaders['Authorization'] = `Bearer ${newAccessToken}`;
        args[1] = { ...args[1], headers: newHeaders };
        response = await originalFetch(...args);
      } catch (error) {
        // Refresh failed, return original 401
      }
    }
  }
  
  return response;
};

export const authService = {
  // Register new user
  async register(email, password, captchaToken = null) {
    const data = await api.post('/api/auth/register', { 
      email, 
      password,
      captchaToken 
    });
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      // Schedule auto-refresh (15 minutes = 900 seconds)
      scheduleTokenRefresh(900);
    }
    return data;
  },

  // Login user
  async login(email, password) {
    const data = await api.post('/api/auth/login', { email, password });
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      // Schedule auto-refresh (15 minutes = 900 seconds)
      scheduleTokenRefresh(900);
    }
    return data;
  },

  // Refresh access token
  async refreshToken() {
    return await refreshAccessToken();
  },

  // Logout user
  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/api/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
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

