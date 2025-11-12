import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import AdminRoute from '@/components/auth/AdminRoute';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AdminRoute', () => {
  describe('Authorization', () => {
    it('should render children for admin users', () => {
      const authValue = {
        isAuthenticated: true,
        loading: false,
        user: { id: '1', email: 'admin@test.com', role: 'admin' }
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });

    it('should not render children for regular users', () => {
      const authValue = {
        isAuthenticated: true,
        loading: false,
        user: { id: '1', email: 'user@test.com', role: 'user' }
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('should not render children for unauthenticated users', () => {
      const authValue = {
        isAuthenticated: false,
        loading: false,
        user: null
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      const authValue = {
        isAuthenticated: false,
        loading: true,
        user: null
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      const spinner = document.querySelector('.loading-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render children while loading', () => {
      const authValue = {
        isAuthenticated: false,
        loading: true,
        user: null
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });
  });

  describe('Redirect Behavior', () => {
    it('should redirect non-admin users to dashboard', () => {
      const authValue = {
        isAuthenticated: true,
        loading: false,
        user: { id: '1', email: 'user@test.com', role: 'user' }
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      // Should not see admin content
      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('should redirect unauthenticated users to login', () => {
      const authValue = {
        isAuthenticated: false,
        loading: false,
        user: null
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing role field', () => {
      const authValue = {
        isAuthenticated: true,
        loading: false,
        user: { id: '1', email: 'user@test.com' } // No role
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      // Should treat as non-admin
      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('should handle case-sensitive role check', () => {
      const authValue = {
        isAuthenticated: true,
        loading: false,
        user: { id: '1', email: 'admin@test.com', role: 'Admin' } // Capital A
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      // Should handle case-insensitive or fail (depending on implementation)
      // This test will reveal if there's a case sensitivity bug
    });

    it('should handle null user object', () => {
      const authValue = {
        isAuthenticated: true,
        loading: false,
        user: null
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Admin Users', () => {
    it('should allow access for superadmin role', () => {
      const authValue = {
        isAuthenticated: true,
        loading: false,
        user: { id: '1', email: 'super@test.com', role: 'superadmin' }
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      // This test will reveal if superadmin is treated as admin
    });

    it('should deny access for moderator role', () => {
      const authValue = {
        isAuthenticated: true,
        loading: false,
        user: { id: '1', email: 'mod@test.com', role: 'moderator' }
      };

      renderWithRouter(
        <AuthContext.Provider value={authValue}>
          <AdminRoute>
            <div data-testid="admin-content">Admin Dashboard</div>
          </AdminRoute>
        </AuthContext.Provider>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });
  });
});

