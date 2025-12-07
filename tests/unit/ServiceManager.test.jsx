import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/context/ToastContext';
import ServiceManager from '../../src/components/booking/ServiceManager';
import * as api from '../../src/utils/api';

// Mock API
vi.mock('../../src/utils/api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  del: vi.fn(),
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

describe('ServiceManager Component - TDD', () => {
  const mockUserId = 545;
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ success: true, services: [] });
    api.post.mockResolvedValue({ success: true });
    api.put.mockResolvedValue({ success: true });
    api.del.mockResolvedValue({ success: true });
  });

  describe('Initial Render', () => {
    it('should render with correct test id', () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);
      expect(screen.getByTestId('service-manager')).toBeInTheDocument();
    });

    it('should fetch services on mount', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          description: 'Basic haircut',
          duration_minutes: 30,
          price_cents: 3000,
          category: 'hair',
          online_booking_enabled: true,
          requires_approval: false,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/api/booking/tenants/${mockUserId}/services`);
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });
    });

    it('should display empty state when no services exist', async () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText(/no services yet/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Service List Display', () => {
    it('should display all service fields correctly', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          description: 'Professional haircut',
          duration_minutes: 30,
          price_cents: 3000,
          price_display: '$30.00',
          category: 'hair',
          online_booking_enabled: true,
          requires_approval: false,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
        expect(screen.getByText('Professional haircut')).toBeInTheDocument();
        expect(screen.getByText(/30 min/i)).toBeInTheDocument();
        expect(screen.getByText('$30.00')).toBeInTheDocument();
      });
    });

    it('should show active/inactive status badges', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Active Service',
          online_booking_enabled: true,
          duration_minutes: 30,
          price_cents: 3000,
        },
        {
          id: '2',
          name: 'Inactive Service',
          online_booking_enabled: false,
          duration_minutes: 30,
          price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        const badges = screen.getAllByTestId('service-status-badge');
        expect(badges[0]).toHaveTextContent(/active/i);
        expect(badges[1]).toHaveTextContent(/inactive/i);
      });
    });
  });

  describe('Add Service', () => {
    it('should show add service button', async () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
      });
    });

    it('should open service form modal when add button clicked', async () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        const addBtn = screen.getByRole('button', { name: /add service/i });
        fireEvent.click(addBtn);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have all required form fields in add modal', async () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add service/i }));
      });

      expect(screen.getByLabelText(/service name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it('should create service successfully', async () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      const newService = {
        id: '1',
        name: 'New Service',
        description: 'Test service',
        duration_minutes: 60,
        price_cents: 5000,
        category: 'other',
      };
      api.post.mockResolvedValue({ success: true, service: newService });

      const user = userEvent.setup();
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add service/i }));
      });

      // Fill form
      await user.type(screen.getByLabelText(/service name/i), 'New Service');
      await user.type(screen.getByLabelText(/description/i), 'Test service');
      await user.type(screen.getByLabelText(/duration/i), '60');
      await user.type(screen.getByLabelText(/price/i), '50');

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          `/api/booking/admin/${mockUserId}/services`,
          expect.objectContaining({
            name: 'New Service',
            description: 'Test service',
            duration_minutes: 60,
            price_cents: 5000,
          })
        );
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('should validate required fields', async () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add service/i }));
      });

      // Try to submit without filling fields
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/service name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Service', () => {
    it('should show edit button for each service', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          duration_minutes: 30,
          price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('should open edit modal with pre-filled data', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          description: 'Professional haircut',
          duration_minutes: 30,
          price_cents: 3000,
          category: 'hair',
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      });

      expect(screen.getByDisplayValue('Haircut')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Professional haircut')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });

    it('should update service successfully', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          duration_minutes: 30,
          price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      api.put.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      });

      // Update name
      const nameInput = screen.getByDisplayValue('Haircut');
      await user.clear(nameInput);
      await user.type(nameInput, 'Premium Haircut');

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          `/api/booking/admin/${mockUserId}/services/1`,
          expect.objectContaining({
            name: 'Premium Haircut',
          })
        );
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Service', () => {
    it('should show delete button for each service', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          duration_minutes: 30,
          price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog before deleting', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          duration_minutes: 30,
          price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it.skip('should delete service on confirmation', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          duration_minutes: 30,
          price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      api.delete.mockResolvedValue({ success: true });

      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      // Confirm deletion
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith(
          `/api/booking/admin/${mockUserId}/services/1`
        );
        expect(mockOnRefresh).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should cancel deletion when cancel clicked', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          duration_minutes: 30,
          price_cents: 3000,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      // Cancel deletion
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it.skip('should handle fetch services error', async () => {
      api.get.mockRejectedValue(new Error('Failed to fetch'));
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load services/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle create service error', async () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      api.post.mockRejectedValue(new Error('Failed to create'));

      const user = userEvent.setup();
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add service/i }));
      });

      await user.type(screen.getByLabelText(/service name/i), 'New Service');
      await user.type(screen.getByLabelText(/duration/i), '30');
      await user.type(screen.getByLabelText(/price/i), '30');

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to create service/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter', () => {
    it('should have a search input', async () => {
      api.get.mockResolvedValue({ success: true, services: [] });
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search services/i)).toBeInTheDocument();
      });
    });

    it('should filter services by search term', async () => {
      const mockServices = [
        {
          id: '1',
          name: 'Haircut',
          duration_minutes: 30,
          price_cents: 3000,
        },
        {
          id: '2',
          name: 'Massage',
          duration_minutes: 60,
          price_cents: 8000,
        },
      ];

      api.get.mockResolvedValue({ success: true, services: mockServices });
      const user = userEvent.setup();
      renderWithProviders(<ServiceManager userId={mockUserId} onRefresh={mockOnRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
        expect(screen.getByText('Massage')).toBeInTheDocument();
      });

      // Search for "hair"
      await user.type(screen.getByPlaceholderText(/search services/i), 'hair');

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
        expect(screen.queryByText('Massage')).not.toBeInTheDocument();
      });
    });
  });
});

