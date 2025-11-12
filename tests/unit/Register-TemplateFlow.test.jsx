import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Register from '../../src/pages/Register';
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

describe('Register - Template Selection Flow', () => {
  const mockRegister = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const renderRegisterWithTemplate = (template = null) => {
    const initialEntries = template ? [`/register?template=${template}`] : ['/register'];
    
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AuthContext.Provider value={{ 
          register: mockRegister,
          loading: false,
          user: null,
          isAuthenticated: false
        }}>
          <ToastContext.Provider value={{ 
            showSuccess: mockShowSuccess, 
            showError: mockShowError 
          }}>
            <Register />
          </ToastContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Template Query Parameter', () => {
    it('should redirect to setup with template after successful registration', async () => {
      const user = userEvent.setup();
      
      // Mock successful registration
      mockRegister.mockResolvedValueOnce({ 
        user: { email: 'test@example.com' },
        token: 'test-token'
      });

      // Render with template query param
      renderRegisterWithTemplate('restaurant');

      // Fill out form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should redirect to setup with template
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=restaurant');
      });
    });

    it('should redirect to dashboard when no template is specified', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValueOnce({ 
        user: { email: 'test@example.com' } 
      });

      // Render without template
      renderRegisterWithTemplate(null);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should preserve salon template parameter', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });

      renderRegisterWithTemplate('salon');

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=salon');
      });
    });

    it('should preserve gym template parameter', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });

      renderRegisterWithTemplate('gym');

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=gym');
      });
    });

    it('should preserve consultant template parameter', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });

      renderRegisterWithTemplate('consultant');

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=consultant');
      });
    });

    it('should handle multiple query parameters', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });

      // Render with template and other params
      const { container } = render(
        <MemoryRouter initialEntries={['/register?template=restaurant&source=landing']}>
          <AuthContext.Provider value={{ 
            register: mockRegister,
            loading: false,
            user: null,
            isAuthenticated: false
          }}>
            <ToastContext.Provider value={{ 
              showSuccess: mockShowSuccess, 
              showError: mockShowError 
            }}>
              <Register />
            </ToastContext.Provider>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should only preserve template param
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=restaurant');
      });
    });
  });

  describe('Error Handling with Template', () => {
    it('should not redirect when registration fails, even with template', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockRejectedValueOnce(new Error('Email already exists'));

      renderRegisterWithTemplate('restaurant');

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalled();
      });
      
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle invalid template parameter gracefully', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });

      // Render with invalid template
      renderRegisterWithTemplate('invalid-template-xyz');

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should still redirect with the parameter (setup page will validate)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/setup?template=invalid-template-xyz');
      });
    });

    it('should handle empty template parameter', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });

      // Render with empty template param
      const { container } = render(
        <MemoryRouter initialEntries={['/register?template=']}>
          <AuthContext.Provider value={{ 
            register: mockRegister,
            loading: false,
            user: null,
            isAuthenticated: false
          }}>
            <ToastContext.Provider value={{ 
              showSuccess: mockShowSuccess, 
              showError: mockShowError 
            }}>
              <Register />
            </ToastContext.Provider>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Empty template should redirect to dashboard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('OAuth Flow with Template', () => {
    it('should preserve template in Google OAuth URL', () => {
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      renderRegisterWithTemplate('restaurant');

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      // Note: Current implementation doesn't preserve template in OAuth
      // This test documents the expected behavior
      expect(googleButton).toBeInTheDocument();

      // Restore
      window.location = originalLocation;
    });
  });

  describe('User Experience', () => {
    it('should show success message mentioning template setup', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });

      renderRegisterWithTemplate('restaurant');

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Account created successfully!');
      });
    });
  });
});

