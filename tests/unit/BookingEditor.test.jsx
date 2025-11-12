import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingEditor from '../../src/components/setup/forms/BookingEditor';

// Mock dependencies
vi.mock('../../src/hooks/useSite', () => ({
  useSite: vi.fn(),
}));

import { useSite } from '../../src/hooks/useSite';

describe('BookingEditor Component', () => {
  let mockUpdateNestedField;

  beforeEach(() => {
    mockUpdateNestedField = vi.fn();

    useSite.mockReturnValue({
      siteData: {
        booking: {
          enabled: false,
          provider: 'calendly',
          url: '',
          style: 'inline',
        },
      },
      updateNestedField: mockUpdateNestedField,
    });
  });

  // Rendering Tests (3 tests)
  describe('Rendering', () => {
    it('should render booking editor header', () => {
      render(<BookingEditor />);

      expect(screen.getByText(/booking configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/set up online appointment booking/i)).toBeInTheDocument();
    });

    it('should render enable toggle', () => {
      render(<BookingEditor />);

      const checkbox = screen.getByRole('checkbox', { name: /enable booking widget/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('should not show config when disabled', () => {
      render(<BookingEditor />);

      expect(screen.queryByText(/booking provider/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/booking url/i)).not.toBeInTheDocument();
    });
  });

  // Enable/Disable Tests (2 tests)
  describe('Enable/Disable', () => {
    it('should enable booking', async () => {
      const user = userEvent.setup();
      render(<BookingEditor />);

      const checkbox = screen.getByRole('checkbox', { name: /enable booking widget/i });
      await user.click(checkbox);

      expect(mockUpdateNestedField).toHaveBeenCalledWith('booking.enabled', true);
    });

    it('should show config when enabled', () => {
      useSite.mockReturnValue({
        siteData: {
          booking: {
            enabled: true,
            provider: 'calendly',
            url: '',
            style: 'inline',
          },
        },
        updateNestedField: mockUpdateNestedField,
      });

      render(<BookingEditor />);

      expect(screen.getByText(/booking provider/i)).toBeInTheDocument();
      // URL input exists (find by placeholder since no accessible label)
      expect(screen.getByPlaceholderText(/calendly.com/i)).toBeInTheDocument();
      expect(screen.getByText(/display style/i)).toBeInTheDocument();
    });
  });

  // Provider Selection Tests (3 tests)
  describe('Provider Selection', () => {
    beforeEach(() => {
      useSite.mockReturnValue({
        siteData: {
          booking: {
            enabled: true,
            provider: 'calendly',
            url: '',
            style: 'inline',
          },
        },
        updateNestedField: mockUpdateNestedField,
      });
    });

    it('should display all providers', () => {
      render(<BookingEditor />);

      expect(screen.getByText('Calendly')).toBeInTheDocument();
      expect(screen.getByText('Acuity Scheduling')).toBeInTheDocument();
      expect(screen.getByText('Square Appointments')).toBeInTheDocument();
      expect(screen.getByText('Cal.com')).toBeInTheDocument();
    });

    it('should show selected provider', () => {
      render(<BookingEditor />);

      const calendlyButton = screen.getByText('Calendly').closest('button');
      expect(calendlyButton).toHaveClass('selected');
    });

    it('should select different provider', async () => {
      const user = userEvent.setup();
      render(<BookingEditor />);

      const acuityButton = screen.getByText('Acuity Scheduling').closest('button');
      await user.click(acuityButton);

      expect(mockUpdateNestedField).toHaveBeenCalledWith('booking.provider', 'acuity');
    });
  });

  // URL Input Tests (2 tests)
  describe('URL Input', () => {
    beforeEach(() => {
      useSite.mockReturnValue({
        siteData: {
          booking: {
            enabled: true,
            provider: 'calendly',
            url: '',
            style: 'inline',
          },
        },
        updateNestedField: mockUpdateNestedField,
      });
    });

    it('should render URL input', () => {
      render(<BookingEditor />);

      const input = screen.getByPlaceholderText(/calendly.com/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'url');
    });

    it('should update URL', async () => {
      const user = userEvent.setup();
      render(<BookingEditor />);

      const input = screen.getByPlaceholderText(/calendly.com/i);
      await user.type(input, 'X');

      expect(mockUpdateNestedField).toHaveBeenCalled();
      const calls = mockUpdateNestedField.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('booking.url');
    });
  });

  // Style Selection Tests (2 tests)
  describe('Display Style', () => {
    beforeEach(() => {
      useSite.mockReturnValue({
        siteData: {
          booking: {
            enabled: true,
            provider: 'calendly',
            url: '',
            style: 'inline',
          },
        },
        updateNestedField: mockUpdateNestedField,
      });
    });

    it('should show style options', () => {
      render(<BookingEditor />);

      expect(screen.getByText('Inline (Embedded)')).toBeInTheDocument();
      expect(screen.getByText('Popup (Modal)')).toBeInTheDocument();
    });

    it('should change display style', async () => {
      const user = userEvent.setup();
      render(<BookingEditor />);

      const popupRadio = screen.getByRole('radio', { name: /popup/i });
      await user.click(popupRadio);

      expect(mockUpdateNestedField).toHaveBeenCalledWith('booking.style', 'popup');
    });
  });
});

