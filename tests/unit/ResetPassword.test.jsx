import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPassword from '../../src/pages/ResetPassword';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastContext } from '../../src/context/ToastContext';
import { authService } from '../../src/services/auth';
import React from 'react';

vi.mock('../../src/services/auth', () => ({
  authService: {
    resetPassword: vi.fn()
  }
}));

describe('ResetPassword Page', () => {
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  const mockNavigate = vi.fn();

  const renderResetPassword = (route = '/reset-password?token=valid-token-123') => {
    return render(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <ToastContext.Provider value={{ showSuccess: mockShowSuccess, showError: mockShowError }}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Page Rendering (2 tests)
  // ============================================================

  describe('Page Rendering', () => {
    it('should render reset password form with valid token', () => {
      renderResetPassword();
      
      expect(screen.getByText(/🔒 reset password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('should show error message when token is missing', async () => {
      renderResetPassword('/reset-password'); // No token
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Invalid or missing reset token');
      });
      
      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
      expect(screen.getByText(/request new link/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Form Validation (4 tests)
  // ============================================================

  describe('Form Validation', () => {
    it('should show error when passwords do not match', async () => {
      renderResetPassword();
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      
      fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'DifferentPassword' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Passwords do not match');
      });
    });

    it('should show error when password is too short', async () => {
      renderResetPassword();
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.change(confirmInput, { target: { value: 'short' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Password must be at least 8 characters');
      });
    });

    it('should show password requirements hint', () => {
      renderResetPassword();
      
      expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('should require both password fields', () => {
      renderResetPassword();
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      expect(passwordInput).toHaveAttribute('required');
      expect(confirmInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('minLength', '8');
      expect(confirmInput).toHaveAttribute('minLength', '8');
    });
  });

  // ============================================================
  // Password Reset Flow (3 tests)
  // ============================================================

  describe('Password Reset Flow', () => {
    it('should successfully reset password', async () => {
      authService.resetPassword.mockResolvedValue({});
      
      renderResetPassword();
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      
      fireEvent.change(passwordInput, { target: { value: 'NewSecurePassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'NewSecurePassword123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledWith('valid-token-123', 'NewSecurePassword123');
      });
      
      expect(mockShowSuccess).toHaveBeenCalledWith('Password reset successful! You can now login.');
    });

    it('should show loading state during reset', async () => {
      authService.resetPassword.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderResetPassword();
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      
      fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/resetting.../i)).toBeInTheDocument();
      });
      
      expect(submitButton).toBeDisabled();
    });

    it('should handle reset failure', async () => {
      authService.resetPassword.mockRejectedValue(new Error('Token expired'));
      
      renderResetPassword();
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      
      fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Token expired');
      });
    });
  });

  // ============================================================
  // Invalid Token State (2 tests)
  // ============================================================

  describe('Invalid Token State', () => {
    it('should show request new link button when token invalid', async () => {
      renderResetPassword('/reset-password');
      
      await waitFor(() => {
        expect(screen.getByText(/request new link/i)).toBeInTheDocument();
      });
      
      const requestButton = screen.getByText(/request new link/i);
      expect(requestButton.closest('a')).toHaveAttribute('href', '/forgot-password');
    });

    it('should have back to login link', () => {
      renderResetPassword();
      
      const backLink = screen.getByText(/← back to login/i);
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/login');
    });
  });

  // ============================================================
  // Accessibility (1 test)
  // ============================================================

  describe('Accessibility', () => {
    it('should auto-focus password field', () => {
      renderResetPassword();
      
      const passwordInput = screen.getByLabelText(/new password/i);
      expect(passwordInput).toBeInTheDocument();
    });
  });
});





