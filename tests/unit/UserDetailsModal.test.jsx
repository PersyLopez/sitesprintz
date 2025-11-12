import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserDetailsModal from '../../src/components/admin/UserDetailsModal';
import { ToastContext } from '../../src/context/ToastContext';

describe('UserDetailsModal Component', () => {
  let mockUser;
  let mockOnClose;
  let mockOnSave;
  let mockShowSuccess;
  let mockShowError;

  const renderWithToast = (props) => {
    return render(
      <ToastContext.Provider
        value={{
          showSuccess: mockShowSuccess,
          showError: mockShowError,
        }}
      >
        <UserDetailsModal {...props} />
      </ToastContext.Provider>
    );
  };

  beforeEach(() => {
    mockUser = {
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      role: 'user',
      plan: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      sites: 2,
      totalRevenue: 0,
    };

    mockOnClose = vi.fn();
    mockOnSave = vi.fn();
    mockShowSuccess = vi.fn();
    mockShowError = vi.fn();
  });

  // Display (5 tests)
  describe('Display', () => {
    it('should render modal', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByText(/user details/i)).toBeInTheDocument();
    });

    it('should display user email', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display user name', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    it('should display user role', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByText(/user/i)).toBeInTheDocument();
    });

    it('should display user plan', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByText(/free/i)).toBeInTheDocument();
    });
  });

  // Edit Fields (4 tests)
  describe('Edit Fields', () => {
    it('should have name input field', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeInTheDocument();
    });

    it('should allow editing name', async () => {
      const user = userEvent.setup();

      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Doe');

      expect(nameInput).toHaveValue('Jane Doe');
    });

    it('should have role selector', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      const roleSelect = screen.getByLabelText(/role/i);
      expect(roleSelect).toBeInTheDocument();
    });

    it('should have plan selector', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      const planSelect = screen.getByLabelText(/plan/i);
      expect(planSelect).toBeInTheDocument();
    });
  });

  // Role Changes (3 tests)
  describe('Role Changes', () => {
    it('should change user role', async () => {
      const user = userEvent.setup();

      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      const roleSelect = screen.getByLabelText(/role/i);
      await user.selectOptions(roleSelect, 'admin');

      expect(roleSelect).toHaveValue('admin');
    });

    it('should show admin role option', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByRole('option', { name: /admin/i })).toBeInTheDocument();
    });

    it('should show user role option', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByRole('option', { name: /user/i })).toBeInTheDocument();
    });
  });

  // Actions (3 tests)
  describe('Actions', () => {
    it('should have save button', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should call onSave when save clicked', async () => {
      const user = userEvent.setup();

      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should have cancel button', () => {
      renderWithToast({ user: mockUser, onClose: mockOnClose, onSave: mockOnSave });

      expect(screen.getByRole('button', { name: /cancel|close/i })).toBeInTheDocument();
    });
  });
});

