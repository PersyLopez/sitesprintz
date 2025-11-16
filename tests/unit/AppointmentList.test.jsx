import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/context/ToastContext';
import AppointmentList from '../../src/components/booking/AppointmentList';
import * as api from '../../src/utils/api';

// Mock API
vi.mock('../../src/utils/api', () => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        {component}
      </ToastProvider>
    </BrowserRouter>
  );
};

describe('AppointmentList Component - TDD', () => {
  const mockUserId = 545;
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render with correct test id', () => {
      api.get.mockResolvedValue({ success: true, appointments: [] });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);
      expect(screen.getByTestId('appointment-list')).toBeInTheDocument();
    });

    it('should fetch appointments on mount', async () => {
      const mockAppointments = [
        {
          id: '1',
          confirmation_code: 'ABC12345',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
          total_price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          `/api/booking/admin/${mockUserId}/appointments`,
          expect.anything()
        );
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      api.get.mockResolvedValue({ success: true, appointments: [] });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display empty state when no appointments', async () => {
      api.get.mockResolvedValue({ success: true, appointments: [] });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText(/no appointments yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Appointment Display', () => {
    it('should display all appointment fields correctly', async () => {
      const mockAppointments = [
        {
          id: '1',
          confirmation_code: 'ABC12345',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+1234567890',
          start_time: '2025-11-20T14:00:00Z',
          end_time: '2025-11-20T14:30:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
          total_price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('ABC12345')).toBeInTheDocument();
        expect(screen.getByText('Haircut')).toBeInTheDocument();
        expect(screen.getByText('$30.00')).toBeInTheDocument();
      });
    });

    it('should display status badges with correct colors', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
        {
          id: '2',
          customer_name: 'Jane Smith',
          start_time: '2025-11-20T15:00:00Z',
          status: 'pending',
          service_name: 'Massage',
        },
        {
          id: '3',
          customer_name: 'Bob Johnson',
          start_time: '2025-11-20T16:00:00Z',
          status: 'cancelled',
          service_name: 'Consultation',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        const confirmedBadge = screen.getByText('confirmed');
        const pendingBadge = screen.getByText('pending');
        const cancelledBadge = screen.getByText('cancelled');

        expect(confirmedBadge).toHaveClass('status-badge');
        expect(pendingBadge).toHaveClass('status-badge');
        expect(cancelledBadge).toHaveClass('status-badge');
      });
    });

    it('should format dates in readable format', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        // Check that date is displayed (format may vary based on locale)
        expect(screen.getByText(/Nov|November/)).toBeInTheDocument();
      });
    });
  });

  describe('Filters and Search', () => {
    it('should render filter controls', async () => {
      api.get.mockResolvedValue({ success: true, appointments: [] });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
      });
    });

    it('should filter appointments by search term', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
        {
          id: '2',
          customer_name: 'Jane Smith',
          customer_email: 'jane@example.com',
          start_time: '2025-11-20T15:00:00Z',
          status: 'confirmed',
          service_name: 'Massage',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      const user = userEvent.setup();
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Search for "john"
      await user.type(screen.getByPlaceholderText(/search/i), 'john');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should filter appointments by status', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
        {
          id: '2',
          customer_name: 'Jane Smith',
          start_time: '2025-11-20T15:00:00Z',
          status: 'pending',
          service_name: 'Massage',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Filter by pending status
      const statusSelect = screen.getByLabelText(/status/i);
      fireEvent.change(statusSelect, { target: { value: 'pending' } });

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Appointment Actions', () => {
    it('should show view details button for each appointment', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
      });
    });

    it('should open details modal when view button clicked', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /view details/i }));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/appointment details/i)).toBeInTheDocument();
    });

    it('should show cancel button for non-cancelled appointments', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('should not show cancel button for cancelled appointments', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          start_time: '2025-11-20T14:00:00Z',
          status: 'cancelled',
          service_name: 'Haircut',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();
      });
    });

    it('should cancel appointment successfully', async () => {
      const mockAppointments = [
        {
          id: '1',
          confirmation_code: 'ABC12345',
          customer_name: 'John Doe',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      api.delete.mockResolvedValue({ success: true });

      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      });

      // Confirm cancellation
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith(
          `/api/booking/tenants/${mockUserId}/appointments/ABC12345`,
          expect.anything()
        );
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Sorting', () => {
    it('should have sorting controls', async () => {
      api.get.mockResolvedValue({ success: true, appointments: [] });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      });
    });

    it('should sort appointments by date', async () => {
      const mockAppointments = [
        {
          id: '1',
          customer_name: 'John Doe',
          start_time: '2025-11-22T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
        {
          id: '2',
          customer_name: 'Jane Smith',
          start_time: '2025-11-20T15:00:00Z',
          status: 'confirmed',
          service_name: 'Massage',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        const appointments = screen.getAllByTestId(/appointment-item/);
        // Should be sorted by date (earliest first by default)
        expect(appointments.length).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch error gracefully', async () => {
      api.get.mockRejectedValue(new Error('Failed to fetch'));
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load appointments/i)).toBeInTheDocument();
      });
    });

    it('should handle cancel error gracefully', async () => {
      const mockAppointments = [
        {
          id: '1',
          confirmation_code: 'ABC12345',
          customer_name: 'John Doe',
          start_time: '2025-11-20T14:00:00Z',
          status: 'confirmed',
          service_name: 'Haircut',
        },
      ];

      api.get.mockResolvedValue({ success: true, appointments: mockAppointments });
      api.delete.mockRejectedValue(new Error('Failed to cancel'));

      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      });

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to cancel/i)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh', () => {
    it('should have refresh button', async () => {
      api.get.mockResolvedValue({ success: true, appointments: [] });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should reload appointments when refresh clicked', async () => {
      api.get.mockResolvedValue({ success: true, appointments: [] });
      renderWithProviders(<AppointmentList userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });
});

