import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token and verify it
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('accessToken') || localStorage.getItem('authToken'); // Support both formats
    if (storedToken) {
      setToken(storedToken);
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData.user || userData);
        // Schedule token refresh if we have a refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // Schedule refresh (15 minutes = 900 seconds)
          setTimeout(() => {
            authService.refreshToken().catch(() => {
              // Refresh failed, will be handled by fetch interceptor
            });
          }, 14 * 60 * 1000); // 14 minutes
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('authToken'); // Clean up old format
        setToken(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      setToken(data.accessToken || data.token); // Support both formats
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password, captchaToken = null) => {
    try {
      const data = await authService.register(email, password, captchaToken);
      setToken(data.accessToken || data.token); // Support both formats
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authToken'); // Clean up old format
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    setUser,
    setToken,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

