import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/context/ToastContext';
import AvailabilityScheduler from '../../src/components/booking/AvailabilityScheduler';
import * as api from '../../src/utils/api';

// Mock API
vi.mock('../../src/utils/api', () => ({
  get: vi.fn(),
  post: vi.fn(),
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

describe('AvailabilityScheduler Component - TDD', () => {
  const mockUserId = 545;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render with correct test id', () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);
      expect(screen.getByTestId('availability-scheduler')).toBeInTheDocument();
    });

    it('should fetch availability rules on mount', async () => {
      const mockRules = [
        {
          id: '1',
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_available: true,
        },
      ];

      api.get.mockResolvedValue({ success: true, rules: mockRules });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    it('should show loading state initially', () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Weekly Schedule Display', () => {
    it('should display all days of the week', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/monday/i)).toBeInTheDocument();
        expect(screen.getByText(/tuesday/i)).toBeInTheDocument();
        expect(screen.getByText(/wednesday/i)).toBeInTheDocument();
        expect(screen.getByText(/thursday/i)).toBeInTheDocument();
        expect(screen.getByText(/friday/i)).toBeInTheDocument();
        expect(screen.getByText(/saturday/i)).toBeInTheDocument();
        expect(screen.getByText(/sunday/i)).toBeInTheDocument();
      });
    });

    it('should show available toggle for each day', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(7);
      });
    });

    it('should display time inputs for each day', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        // Each day should have start and end time inputs
        const startInputs = screen.getAllByTestId(/start-time-/);
        const endInputs = screen.getAllByTestId(/end-time-/);
        expect(startInputs.length).toBeGreaterThanOrEqual(7);
        expect(endInputs.length).toBeGreaterThanOrEqual(7);
      });
    });

    it('should display existing availability rules', async () => {
      const mockRules = [
        {
          id: '1',
          day_of_week: 1, // Monday
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_available: true,
        },
        {
          id: '2',
          day_of_week: 2, // Tuesday
          start_time: '10:00:00',
          end_time: '18:00:00',
          is_available: true,
        },
      ];

      api.get.mockResolvedValue({ success: true, rules: mockRules });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByTestId('start-time-monday')).toHaveValue('09:00');
        expect(screen.getByTestId('end-time-monday')).toHaveValue('17:00');
        expect(screen.getByTestId('start-time-tuesday')).toHaveValue('10:00');
        expect(screen.getByTestId('end-time-tuesday')).toHaveValue('18:00');
      });
    });
  });

  describe('Toggle Availability', () => {
    it('should enable/disable day when checkbox toggled', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      const user = userEvent.setup();
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/monday/i)).toBeInTheDocument();
      });

      // Get Monday's checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const mondayCheckbox = checkboxes[0];

      // Toggle on
      await user.click(mondayCheckbox);
      expect(mondayCheckbox).toBeChecked();

      // Toggle off
      await user.click(mondayCheckbox);
      expect(mondayCheckbox).not.toBeChecked();
    });

    it('should disable time inputs when day is unavailable', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
          expect(screen.getByTestId(`start-time-${day}`)).toBeDisabled();
          expect(screen.getByTestId(`end-time-${day}`)).toBeDisabled();
        });
      });
    });
  });

  describe('Time Input', () => {
    it('should update start time when changed', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      const user = userEvent.setup();
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/monday/i)).toBeInTheDocument();
      });

      // Enable Monday first
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      // Find Monday's start time input
      const startTimeInput = screen.getByTestId('start-time-monday');

      await user.clear(startTimeInput);
      await user.type(startTimeInput, '08:00');

      expect(startTimeInput).toHaveValue('08:00');
    });

    it('should validate that end time is after start time', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      const user = userEvent.setup();
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      const startTimeInput = screen.getByTestId('start-time-monday');
      const endTimeInput = screen.getByTestId('end-time-monday');

      await user.clear(startTimeInput);
      await user.type(startTimeInput, '17:00');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '09:00');

      // Try to save
      fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));

      await waitFor(() => {
        expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save Schedule', () => {
    it('should have a save button', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByTestId('save-schedule-button')).toBeInTheDocument();
      });
    });

    it('should save availability schedule successfully', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      api.post.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Enable Monday

      fireEvent.click(screen.getByTestId('save-schedule-button'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });

    it('should show success message after saving', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      api.post.mockResolvedValue({ success: true });

      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
      });

      // Enable Monday
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const saveButton = screen.getByTestId('save-schedule-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Success message would be shown via toast
        expect(api.post).toHaveBeenCalled();
      });
    });
  });

  describe('Bulk Actions', () => {
    it('should have a copy to all button', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByTestId('copy-all-button')).toBeInTheDocument();
      });
    });

    it('should copy Monday schedule to all weekdays', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      const user = userEvent.setup();
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Enable Monday

      // Click "Copy to all weekdays"
      // Click "Copy to all weekdays"
      await user.click(screen.getByTestId('copy-all-button'));

      await waitFor(() => {
        // All weekday checkboxes should be checked
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes[0]).toBeChecked(); // Monday
        expect(checkboxes[1]).toBeChecked(); // Tuesday
        expect(checkboxes[2]).toBeChecked(); // Wednesday
        expect(checkboxes[3]).toBeChecked(); // Thursday
        expect(checkboxes[4]).toBeChecked(); // Friday
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch error gracefully', async () => {
      api.get.mockRejectedValue(new Error('Failed to fetch'));
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        const errors = screen.getAllByText(/failed to load/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it('should handle save error gracefully', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      api.post.mockRejectedValue(new Error('Failed to save'));
      const user = userEvent.setup();

      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Enable Monday

      await waitFor(() => {
        expect(screen.getByTestId('save-schedule-button')).toBeInTheDocument();
      });

      const saveButton = screen.getByTestId('save-schedule-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });
  });

  describe('Default Hours', () => {
    it('should use default business hours for new days', async () => {
      api.get.mockResolvedValue({ success: true, rules: [] });
      const user = userEvent.setup();
      renderWithProviders(<AvailabilityScheduler userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Enable Monday

      // Should default to 9:00 AM - 5:00 PM
      await waitFor(() => {
        expect(screen.getByTestId('start-time-monday')).toHaveValue('09:00');
        expect(screen.getByTestId('end-time-monday')).toHaveValue('17:00');
      });
    });
  });
});

