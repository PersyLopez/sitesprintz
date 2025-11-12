import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
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

describe('Register Component', () => {
  const mockRegister = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const renderRegister = () => {
    return render(
      <BrowserRouter>
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
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockRegister.mockClear();
    mockShowSuccess.mockClear();
    mockShowError.mockClear();
  });

  it('should render registration form with all fields', () => {
    renderRegister();
    
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should show password strength hint', () => {
    renderRegister();
    
    expect(screen.getByText('At least 6 characters')).toBeInTheDocument();
  });

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different123');
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Passwords do not match');
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should show error when password is too short', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), '12345');
    await user.type(screen.getByLabelText(/confirm password/i), '12345');
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Password must be at least 6 characters long');
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should successfully register with valid credentials', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });
    renderRegister();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockShowSuccess).toHaveBeenCalledWith('Account created successfully!');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show error message when registration fails', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(new Error('Email already exists'));
    renderRegister();
    
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Email already exists');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    mockRegister.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderRegister();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check that button text changes and inputs are disabled
    expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
    expect(screen.getByLabelText(/confirm password/i)).toBeDisabled();
  });

  it('should have Google signup button', () => {
    renderRegister();
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    expect(googleButton).toBeInTheDocument();
  });

  it('should redirect to Google OAuth when clicking Google signup', async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };
    
    renderRegister();
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    await user.click(googleButton);
    
    expect(window.location.href).toBe('http://localhost:3000/auth/google');
    
    // Restore original location
    window.location = originalLocation;
  });

  it('should have link to login page', () => {
    renderRegister();
    
    const loginLink = screen.getByRole('link', { name: /sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should show terms and conditions text', () => {
    renderRegister();
    
    expect(screen.getByText(/by creating an account/i)).toBeInTheDocument();
    expect(screen.getByText(/terms of service and privacy policy/i)).toBeInTheDocument();
  });

  it('should update form fields on input change', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    
    await user.type(emailInput, 'user@test.com');
    await user.type(passwordInput, 'testpass');
    
    expect(emailInput).toHaveValue('user@test.com');
    expect(passwordInput).toHaveValue('testpass');
  });

  it('should require all fields to be filled', () => {
    renderRegister();
    
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/^password$/i)).toBeRequired();
    expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
  });

  it('should enforce minimum password length in HTML', () => {
    renderRegister();
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    expect(passwordInput).toHaveAttribute('minLength', '6');
    expect(confirmPasswordInput).toHaveAttribute('minLength', '6');
  });
});

