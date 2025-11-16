import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { ToastProvider } from '../../src/context/ToastContext';
import BookingDashboard from '../../src/pages/BookingDashboard';
import * as api from '../../src/utils/api';

// Mock API
vi.mock('../../src/utils/api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

// Mock user data
const mockUser = {
  id: 545,
  name: 'Test User',
  email: 'test@example.com',
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
};

// Test wrapper with all providers
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={mockAuthContext}>
        <ToastProvider>
          {component}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('BookingDashboard Component - TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the dashboard page title', () => {
      renderWithProviders(<BookingDashboard />);
      expect(screen.getByText(/booking dashboard/i)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      renderWithProviders(<BookingDashboard />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render navigation tabs', () => {
      renderWithProviders(<BookingDashboard />);
      expect(screen.getByText(/appointments/i)).toBeInTheDocument();
      expect(screen.getByText(/services/i)).toBeInTheDocument();
      expect(screen.getByText(/schedule/i)).toBeInTheDocument();
    });
  });

  describe('Stats/Analytics Display', () => {
    it('should fetch and display basic stats on mount', async () => {
      const mockStats = {
        total_appointments: 42,
        pending_appointments: 5,
        confirmed_appointments: 37,
        total_revenue: 125000, // cents
        active_services: 4,
      };

      api.get.mockResolvedValueOnce({ success: true, stats: mockStats });

      renderWithProviders(<BookingDashboard />);

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument(); // total appointments
        expect(screen.getByText('5')).toBeInTheDocument(); // pending
        expect(screen.getByText('$1,250.00')).toBeInTheDocument(); // revenue
      });
    });

    it('should handle stats fetch error gracefully', async () => {
      api.get.mockRejectedValueOnce(new Error('Failed to fetch stats'));

      renderWithProviders(<BookingDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load stats/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Tabs', () => {
    it('should default to appointments tab', () => {
      renderWithProviders(<BookingDashboard />);
      const appointmentsTab = screen.getByRole('tab', { name: /appointments/i });
      expect(appointmentsTab).toHaveClass('active');
    });

    it('should switch to services tab when clicked', async () => {
      renderWithProviders(<BookingDashboard />);
      
      const servicesTab = screen.getByRole('tab', { name: /services/i });
      servicesTab.click();

      await waitFor(() => {
        expect(servicesTab).toHaveClass('active');
      });
    });

    it('should switch to schedule tab when clicked', async () => {
      renderWithProviders(<BookingDashboard />);
      
      const scheduleTab = screen.getByRole('tab', { name: /schedule/i });
      scheduleTab.click();

      await waitFor(() => {
        expect(scheduleTab).toHaveClass('active');
      });
    });
  });

  describe('Tab Content', () => {
    it('should render AppointmentList component in appointments tab', async () => {
      renderWithProviders(<BookingDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-list')).toBeInTheDocument();
      });
    });

    it('should render ServiceManager component in services tab', async () => {
      renderWithProviders(<BookingDashboard />);
      
      const servicesTab = screen.getByRole('tab', { name: /services/i });
      servicesTab.click();

      await waitFor(() => {
        expect(screen.getByTestId('service-manager')).toBeInTheDocument();
      });
    });

    it('should render AvailabilityScheduler component in schedule tab', async () => {
      renderWithProviders(<BookingDashboard />);
      
      const scheduleTab = screen.getByRole('tab', { name: /schedule/i });
      scheduleTab.click();

      await waitFor(() => {
        expect(screen.getByTestId('availability-scheduler')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    it('should render quick action buttons', () => {
      renderWithProviders(<BookingDashboard />);
      
      expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view calendar/i })).toBeInTheDocument();
    });

    it('should open service manager when "Add Service" is clicked', async () => {
      renderWithProviders(<BookingDashboard />);
      
      const addServiceBtn = screen.getByRole('button', { name: /add service/i });
      addServiceBtn.click();

      await waitFor(() => {
        expect(screen.getByTestId('service-manager')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu toggle on small screens', () => {
      // Mock window size
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<BookingDashboard />);
      
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });
  });

  describe('Data Refresh', () => {
    it('should have a refresh button', () => {
      renderWithProviders(<BookingDashboard />);
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should reload stats when refresh button is clicked', async () => {
      const mockStats = {
        total_appointments: 42,
        pending_appointments: 5,
        confirmed_appointments: 37,
        total_revenue: 125000,
        active_services: 4,
      };

      api.get.mockResolvedValue({ success: true, stats: mockStats });

      renderWithProviders(<BookingDashboard />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      refreshBtn.click();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });
});

