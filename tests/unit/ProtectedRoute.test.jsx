import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProtectedRoute', () => {
  const mockNavigate = vi.fn();
  
  it('should show loading spinner when loading', () => {
    const authValue = {
      isAuthenticated: false,
      loading: true,
      user: null
    };

    renderWithRouter(
      <AuthContext.Provider value={authValue}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    const spinner = document.querySelector('.loading-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    const authValue = {
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' }
    };

    renderWithRouter(
      <AuthContext.Provider value={authValue}>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    const authValue = {
      isAuthenticated: false,
      loading: false,
      user: null
    };

    renderWithRouter(
      <AuthContext.Provider value={authValue}>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});

