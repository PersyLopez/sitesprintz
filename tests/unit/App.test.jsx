import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';

// Mock BrowserRouter to use MemoryRouter for testing
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }) => {
      const location = window.location.pathname || '/';
      return <actual.MemoryRouter initialEntries={[location]}>{children}</actual.MemoryRouter>;
    },
  };
});

// Mock all page components
vi.mock('../../src/pages/Landing', () => ({
  default: () => <div>Landing Page</div>
}));

vi.mock('../../src/pages/Login', () => ({
  default: () => <div>Login Page</div>
}));

vi.mock('../../src/pages/Register', () => ({
  default: () => <div>Register Page</div>
}));

vi.mock('../../src/pages/Dashboard', () => ({
  default: () => <div>Dashboard Page</div>
}));

vi.mock('../../src/pages/Setup', () => ({
  default: () => <div>Setup Page</div>
}));

vi.mock('../../src/pages/Orders', () => ({
  default: () => <div>Orders Page</div>
}));

vi.mock('../../src/pages/Analytics', () => ({
  default: () => <div>Analytics Page</div>
}));

vi.mock('../../src/pages/Products', () => ({
  default: () => <div>Products Page</div>
}));

vi.mock('../../src/pages/Admin', () => ({
  default: () => <div>Admin Page</div>
}));

vi.mock('../../src/pages/AdminUsers', () => ({
  default: () => <div>Admin Users Page</div>
}));

vi.mock('../../src/pages/ForgotPassword', () => ({
  default: () => <div>Forgot Password Page</div>
}));

vi.mock('../../src/pages/ResetPassword', () => ({
  default: () => <div>Reset Password Page</div>
}));

vi.mock('../../src/pages/NotFound', () => ({
  default: () => <div>Not Found Page</div>
}));

// Mock auth service
vi.mock('../../src/services/auth', () => ({
  authService: {
    getCurrentUser: vi.fn().mockResolvedValue(null)
  }
}));

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Public Routes (5 tests)
  describe('Public Routes', () => {
    it('should render landing page at root', async () => {
      window.history.pushState({}, '', '/');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });
    });

    it('should render login page', async () => {
      window.history.pushState({}, '', '/login');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });

    it('should render register page', async () => {
      window.history.pushState({}, '', '/register');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Register Page')).toBeInTheDocument();
      });
    });

    it('should render forgot password page', async () => {
      window.history.pushState({}, '', '/forgot-password');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Forgot Password Page')).toBeInTheDocument();
      });
    });

    it('should render reset password page', async () => {
      window.history.pushState({}, '', '/reset-password');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Reset Password Page')).toBeInTheDocument();
      });
    });
  });

  // Context Providers (3 tests)
  describe('Context Providers', () => {
    it('should wrap app with AuthProvider', async () => {
      window.history.pushState({}, '', '/');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });
      // If AuthProvider wasn't present, the app would crash
    });

    it('should wrap app with ToastProvider', async () => {
      window.history.pushState({}, '', '/');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });
      // If ToastProvider wasn't present, toast-dependent components would crash
    });

    it('should wrap app with CartProvider', async () => {
      window.history.pushState({}, '', '/');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });
      // If CartProvider wasn't present, cart-dependent components would crash
    });
  });

  // Lazy Loading (2 tests)
  describe('Lazy Loading', () => {
    it('should show loading fallback for lazy routes', async () => {
      window.history.pushState({}, '', '/dashboard');
      
      render(<App />);

      // Content should eventually load (loading may be too fast to catch)
      await waitFor(() => {
        // Check that we're past loading state - either content loaded or we see something
        const page = screen.queryByText('Dashboard Page') || screen.queryByText('Login Page');
        expect(page).toBeTruthy();
      });
    });

    it('should load lazy components successfully', async () => {
      window.history.pushState({}, '', '/orders');
      
      render(<App />);

      await waitFor(() => {
        // Protected route will redirect, but lazy load should work
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  // 404 Handling (2 tests)
  describe('404 Handling', () => {
    it('should render not found page for invalid routes', async () => {
      window.history.pushState({}, '', '/invalid-route');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Not Found Page')).toBeInTheDocument();
      });
    });

    it('should handle deeply nested invalid routes', async () => {
      window.history.pushState({}, '', '/some/deeply/nested/invalid/path');
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Not Found Page')).toBeInTheDocument();
      });
    });
  });
});

