import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
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

describe('Login Component', () => {
  const mockLogin = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const renderLogin = () => {
    return render(
      <BrowserRouter>
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
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLogin.mockClear();
    mockShowSuccess.mockClear();
    mockShowError.mockClear();
  });

  it('should render login form with all fields', () => {
    renderLogin();
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should successfully login with valid credentials', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ 
      user: { email: 'test@example.com' },
      token: 'fake-jwt-token'
    });
    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockShowSuccess).toHaveBeenCalledWith('Login successful!');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show error message when login fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Invalid credentials');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show default error message when no error message provided', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error());
    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Login failed. Please check your credentials.');
    });
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check that button text changes and inputs are disabled
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
  });

  it('should have forgot password link', () => {
    renderLogin();
    
    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('should have Google login button', () => {
    renderLogin();
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    expect(googleButton).toBeInTheDocument();
  });

  it('should redirect to Google OAuth when clicking Google login', async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };
    
    renderLogin();
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    await user.click(googleButton);
    
    expect(window.location.href).toBe('http://localhost:3000/auth/google');
    
    // Restore original location
    window.location = originalLocation;
  });

  it('should have link to register page', () => {
    renderLogin();
    
    const registerLink = screen.getByRole('link', { name: /sign up/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('should update form fields on input change', async () => {
    const user = userEvent.setup();
    renderLogin();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'user@test.com');
    await user.type(passwordInput, 'testpass');
    
    expect(emailInput).toHaveValue('user@test.com');
    expect(passwordInput).toHaveValue('testpass');
  });

  it('should require all fields to be filled', () => {
    renderLogin();
    
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
  });

  it('should have email type input for email field', () => {
    renderLogin();
    
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should have password type input for password field', () => {
    renderLogin();
    
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Network error'));
    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Network error');
    });
  });

  it('should show divider between form and OAuth', () => {
    renderLogin();
    
    const divider = screen.getByText('or');
    expect(divider).toBeInTheDocument();
  });
});

