import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastProvider } from '../../src/context/ToastContext';
import { SiteWorkspaceProvider } from '../../src/context/SiteWorkspaceContext';
import BookingDashboard from '../../src/pages/BookingDashboard';
import * as api from '../../src/utils/api';

// Mock API
vi.mock('../../src/utils/api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

// Mock usePlan
vi.mock('../../src/hooks/usePlan', () => ({
  usePlan: vi.fn(() => ({
    isPro: true,
    isPremium: false,
    plan: 'pro',
  })),
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
  loading: false,
};

// Test wrapper with all providers
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <ToastProvider>
          {component}
        </ToastProvider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('BookingDashboard Component - TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ success: true, appointments: [], services: [] });
  });

  describe('Initial Render', () => {
    it('should render the dashboard page title', async () => {
      renderWithProviders(<BookingDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/booking dashboard/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      renderWithProviders(<BookingDashboard />);
      expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);
    });

    it('should render navigation tabs', async () => {
      renderWithProviders(<BookingDashboard />);
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /appointments/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /services/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /schedule/i })).toBeInTheDocument();
      });
    });
  });

  describe('Stats/Analytics Display', () => {
    it('should fetch and display basic stats on mount', async () => {
      const mockAppointments = Array(42).fill({ status: 'confirmed', total_price_cents: 3000 }); // 42 confirmed
      // Add 5 pending
      for (let i = 0; i < 5; i++) mockAppointments.push({ status: 'pending', total_price_cents: 0 });

      const mockServices = [
        { id: 1, online_booking_enabled: true },
        { id: 2, online_booking_enabled: true },
        { id: 3, online_booking_enabled: true },
        { id: 4, online_booking_enabled: true },
      ];

      api.get.mockImplementation((url) => {
        if (url.includes('appointments')) {
          return Promise.resolve({ success: true, appointments: mockAppointments });
        }
        if (url.includes('services')) {
          return Promise.resolve({ success: true, services: mockServices });
        }
        return Promise.resolve({});
      });

      renderWithProviders(<BookingDashboard />);

      await waitFor(() => {
        expect(screen.getByText('47')).toBeInTheDocument(); // 42 + 5 total
        expect(screen.getByText('5')).toBeInTheDocument(); // pending
        expect(screen.getByText('$1,260.00')).toBeInTheDocument(); // 42 * 3000 = 126000 cents = $1260
      });
    });

    it('should handle stats fetch error gracefully', async () => {
      api.get.mockRejectedValue(new Error('Failed to fetch stats'));

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

    it('does not show team calendar tab on owner dashboard', async () => {
      renderWithProviders(<BookingDashboard />);

      await waitFor(() => {
        expect(screen.queryByTestId('calendar-board-tab')).not.toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    it('should render quick action buttons', () => {
      renderWithProviders(<BookingDashboard />);

      expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /view calendar/i })).not.toBeInTheDocument();
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

      expect(screen.getAllByTestId('mobile-menu-toggle').length).toBeGreaterThan(0);
    });
  });

  describe('Data Refresh', () => {
    it('should have a refresh button', () => {
      renderWithProviders(<BookingDashboard />);
      expect(screen.getByTestId('dashboard-refresh-btn')).toBeInTheDocument();
    });

    it('should reload stats when refresh button is clicked', async () => {
      const mockAppointments = [{ status: 'confirmed', total_price_cents: 1000 }];
      const mockServices = [{ id: 1, online_booking_enabled: true }];

      api.get.mockImplementation((url) => {
        if (url.includes('appointments')) {
          return Promise.resolve({ success: true, appointments: mockAppointments });
        }
        if (url.includes('services')) {
          return Promise.resolve({ success: true, services: mockServices });
        }
        return Promise.resolve({});
      });

      renderWithProviders(<BookingDashboard />);

      await waitFor(() => {
        expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(3);
      });

      const refreshBtn = screen.getByTestId('dashboard-refresh-btn');
      refreshBtn.click();

      await waitFor(() => {
        expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('Phase 2 settings', () => {
    it('includes siteId when saving reminder and buffer settings', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('reminder-settings')) {
          return Promise.resolve({ enabled: true, hoursBefore: 24 });
        }
        if (url.includes('services')) {
          return Promise.resolve({ services: [{ id: 9, buffer_minutes_after: 15 }] });
        }
        if (url.includes('appointments')) {
          return Promise.resolve({ appointments: [] });
        }
        return Promise.resolve({});
      });
      api.put.mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContext}>
            <ToastProvider>
              <SiteWorkspaceProvider site={{ id: 'site-1' }} siteId="site-1">
                <BookingDashboard />
              </SiteWorkspaceProvider>
            </ToastProvider>
          </AuthContext.Provider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('phase2-tab')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('phase2-tab'));
      fireEvent.click(screen.getByTestId('save-phase2-settings-btn'));

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          `/api/booking/tenants/${mockUser.id}/reminder-settings`,
          { enabled: true, hoursBefore: 24 },
          { params: { siteId: 'site-1' } }
        );
        expect(api.put).toHaveBeenCalledWith(
          '/api/booking/services/9/buffer-settings',
          { before: 15, after: 15 },
          { params: { siteId: 'site-1' } }
        );
      });
    });
  });

  describe('Embedded workspace', () => {
    it('uses pane subnav without team calendar when embedded', async () => {
      render(
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContext}>
            <ToastProvider>
              <SiteWorkspaceProvider site={{ id: 'site-1' }} siteId="site-1">
                <BookingDashboard />
              </SiteWorkspaceProvider>
            </ToastProvider>
          </AuthContext.Provider>
        </BrowserRouter>
      );

      await waitFor(() => {
        const page = screen.getByTestId('booking-dashboard-page');
        expect(screen.getByTestId('appointments-tab')).toBeVisible();
        expect(screen.getByTestId('services-tab')).toBeVisible();
        expect(screen.getByTestId('phase2-tab')).toBeVisible();
        expect(screen.queryByTestId('calendar-board-tab')).not.toBeInTheDocument();
        expect(page.querySelector('.dashboard-tabs')).not.toBeInTheDocument();
        expect(page.querySelector('.pane-subnav')).toBeInTheDocument();
        expect(screen.getByTestId('appointments-tab')).toHaveAccessibleName(/^Appointments$/);
        expect(screen.getByTestId('dashboard-refresh-btn')).toBeInTheDocument();
      });
    });

    it('uses pane semantics when embedded', async () => {
      render(
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContext}>
            <ToastProvider>
              <SiteWorkspaceProvider site={{ id: 'site-1' }} siteId="site-1">
                <BookingDashboard />
              </SiteWorkspaceProvider>
            </ToastProvider>
          </AuthContext.Provider>
        </BrowserRouter>
      );

      await waitFor(() => {
        const page = screen.getByTestId('booking-dashboard-page');
        expect(within(page).queryByRole('main')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 1, name: /booking dashboard/i })).not.toBeInTheDocument();
        const dashboardHeader = page.querySelector('.dashboard-header');
        expect(within(dashboardHeader).getByRole('heading', { level: 2, name: 'Appointments' })).toBeInTheDocument();
      });
    });
  });
});

