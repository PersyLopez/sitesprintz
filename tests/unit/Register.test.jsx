import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

const VALID_PASSWORD = 'StrongPass123!';

describe('Register Component', () => {
  const mockRegister = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const renderRegister = (initialEntry = '/register') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
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

  const acceptTerms = async (user) => {
    await user.click(screen.getByTestId('register-accept-terms'));
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

  it('should show password requirements', () => {
    renderRegister();

    expect(screen.getByText('At least 12 characters')).toBeInTheDocument();
  });

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.type(screen.getByLabelText(/confirm password/i), 'Different123!');
    await acceptTerms(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Passwords do not match');
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should disable submit until the agreements are accepted', () => {
    renderRegister();

    expect(screen.getByTestId('register-submit')).toBeDisabled();
  });

  it('should disable Google signup until the agreements are accepted', async () => {
    const user = userEvent.setup();
    renderRegister();

    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    expect(googleButton).toBeDisabled();

    await acceptTerms(user);
    expect(googleButton).toBeEnabled();
  });

  it('should enable submit once the agreements are accepted', async () => {
    const user = userEvent.setup();
    renderRegister();

    await acceptTerms(user);
    expect(screen.getByTestId('register-submit')).toBeEnabled();
  });

  it('should successfully register when terms are accepted', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });
    renderRegister();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD);
    await acceptTerms(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', VALID_PASSWORD, null, true);
      expect(mockShowSuccess).toHaveBeenCalledWith('Account created successfully!');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('sends Growth Managed signups to billing with that plan', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ user: { email: 'test@example.com' } });
    renderRegister('/register?plan=growth_managed');

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD);
    await acceptTerms(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/billing?plan=growth_managed');
    });
  });

  it('should show error message when registration fails', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(new Error('Email already exists'));
    renderRegister();

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD);
    await acceptTerms(user);

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
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD);
    await acceptTerms(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
    expect(screen.getByLabelText(/confirm password/i)).toBeDisabled();
  });

  it('does not require a CAPTCHA token when Turnstile is not configured', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({});
    renderRegister();

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD);
    await acceptTerms(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
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

    await acceptTerms(user);
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

  it('should present the legal agreements as a clickwrap consent', () => {
    renderRegister();

    expect(screen.getByTestId('register-accept-terms')).toBeInTheDocument();
    expect(screen.getByTestId('register-accept-terms')).not.toBeChecked();

    const consent = document.querySelector('.form-consent');
    expect(consent).toBeTruthy();
    const disclosureLink = within(consent).getByRole('link', { name: /third-party services/i });
    expect(disclosureLink).toHaveAttribute('href', '/legal/third-party-services');

    expect(within(consent).getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/legal/terms');
    expect(within(consent).getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/legal/privacy');
  });

  it('should block submission and warn when terms are not accepted', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD);

    // Submit button is disabled, so the form cannot be submitted without consent
    expect(screen.getByTestId('register-submit')).toBeDisabled();
    expect(mockRegister).not.toHaveBeenCalled();
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

    expect(passwordInput).toHaveAttribute('minLength', '12');
    expect(confirmPasswordInput).toHaveAttribute('minLength', '12');
  });

  it('does not pass a null container to Turnstile', () => {
    const renderSpy = vi.fn((container) => {
      if (!(container instanceof HTMLElement)) {
        throw new Error('[Cloudflare Turnstile] Invalid type for parameter "container"');
      }
      return 'widget-1';
    });
    window.turnstile = { render: renderSpy, remove: vi.fn() };

    expect(() => renderRegister()).not.toThrow();
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    renderSpy.mock.calls.forEach(([container]) => {
      expect(container).toBeInstanceOf(HTMLElement);
    });

    delete window.turnstile;
  });
});
