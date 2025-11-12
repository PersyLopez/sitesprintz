import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../../src/pages/Login';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastContext } from '../../src/context/ToastContext';

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login - Template Selection Flow', () => {
  const mockLogin = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLogin.mockClear();
    mockShowSuccess.mockClear();
    mockShowError.mockClear();
    
    // Mock window.location for Google OAuth tests
    delete window.location;
    window.location = { href: '' };
  });

  const renderLoginWithTemplate = (templateParam = '') => {
    const initialRoute = templateParam ? `/login?template=${templateParam}` : '/login';
    
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/login"
            element={
              <AuthContext.Provider value={{ 
                login: mockLogin,
                loading: false,
                user: null,
                isAuthenticated: false
              }}>
                <ToastContext.Provider value={{ 
                  showSuccess: mockShowSuccess, 
                  showError: mockShowError 
                }}>
                  <Login />
                </ToastContext.Provider>
              </AuthContext.Provider>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  // ============================================================
  // Template Parameter Preservation (5 tests)
  // ============================================================

  describe('Template Parameter Preservation', () => {
    it('should redirect to setup with restaurant template after login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ 
        user: { email: 'test@example.com' },
        token: 'fake-token'
      });
      
      renderLoginWithTemplate('restaurant');
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=restaurant');
      });
    });

    it('should redirect to setup with salon template after login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ 
        user: { email: 'test@example.com' },
        token: 'fake-token'
      });
      
      renderLoginWithTemplate('salon');
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=salon');
      });
    });

    it('should redirect to setup with gym template after login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ 
        user: { email: 'test@example.com' },
        token: 'fake-token'
      });
      
      renderLoginWithTemplate('gym');
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=gym');
      });
    });

    it('should redirect to dashboard when no template specified', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ 
        user: { email: 'test@example.com' },
        token: 'fake-token'
      });
      
      renderLoginWithTemplate();
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle complex template names', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ 
        user: { email: 'test@example.com' },
        token: 'fake-token'
      });
      
      renderLoginWithTemplate('auto-repair-pro');
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=auto-repair-pro');
      });
    });
  });

  // ============================================================
  // Google OAuth Template Flow (3 tests)
  // ============================================================

  describe('Google OAuth Template Flow', () => {
    it('should preserve template in Google OAuth URL', async () => {
      const user = userEvent.setup();
      renderLoginWithTemplate('restaurant');
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);
      
      expect(window.location.href).toBe('http://localhost:3000/auth/google?template=restaurant');
    });

    it('should use base Google OAuth URL without template when not specified', async () => {
      const user = userEvent.setup();
      renderLoginWithTemplate();
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);
      
      expect(window.location.href).toBe('http://localhost:3000/auth/google');
    });

    it('should handle Google OAuth with salon template', async () => {
      const user = userEvent.setup();
      renderLoginWithTemplate('salon');
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);
      
      expect(window.location.href).toBe('http://localhost:3000/auth/google?template=salon');
    });
  });

  // ============================================================
  // Error Handling with Templates (2 tests)
  // ============================================================

  describe('Error Handling with Templates', () => {
    it('should not redirect when login fails, even with template', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      
      renderLoginWithTemplate('restaurant');
      
      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Invalid credentials');
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle network errors with template parameter', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Network error'));
      
      renderLoginWithTemplate('salon');
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Network error');
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Register Link with Template (2 tests)
  // ============================================================

  describe('Register Link with Template', () => {
    it('should include template parameter in register link', () => {
      renderLoginWithTemplate('restaurant');
      
      const registerLink = screen.getByRole('link', { name: /sign up/i });
      expect(registerLink).toHaveAttribute('href', '/register?template=restaurant');
    });

    it('should have register link without template when not specified', () => {
      renderLoginWithTemplate();
      
      const registerLink = screen.getByRole('link', { name: /sign up/i });
      expect(registerLink).toHaveAttribute('href', '/register');
    });
  });
});
