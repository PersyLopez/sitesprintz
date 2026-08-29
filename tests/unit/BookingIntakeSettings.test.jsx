import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../../src/context/ToastContext';
import BookingIntakeSettings from '../../src/components/booking/BookingIntakeSettings';
import * as api from '../../src/utils/api';

vi.mock('../../src/utils/api', () => ({
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock('../../src/components/booking/FeeConfiguration', () => ({
  default: () => <div data-testid="fee-configuration-mock">Fee config</div>,
}));

const mockUserId = 545;

const baseApiSettings = {
  enabled: true,
  hoursBefore: 24,
  scheduling_enabled: true,
  urgent_enabled: false,
  fees_enabled: false,
  payment_enabled: false,
  default_payment_type: 'none',
  default_deposit_percentage: 50,
};

function mockLoad(services = [{ id: 9, name: 'Haircut', buffer_minutes_after: 15 }]) {
  api.get.mockImplementation((url) => {
    if (url.includes('reminder-settings')) {
      return Promise.resolve(baseApiSettings);
    }
    if (url.includes('services')) {
      return Promise.resolve({ services });
    }
    return Promise.resolve({});
  });
}

const renderSettings = (props = {}) => render(
  <ToastProvider>
    <BookingIntakeSettings userId={mockUserId} {...props} />
  </ToastProvider>
);

describe('BookingIntakeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.put.mockResolvedValue({ success: true });
    mockLoad();
  });

  it('renders four master switches', async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByTestId('scheduling-enabled-switch')).toBeInTheDocument();
      expect(screen.getByTestId('urgent-enabled-switch')).toBeInTheDocument();
      expect(screen.getByTestId('fees-enabled-switch')).toBeInTheDocument();
      expect(screen.getByTestId('payment-enabled-switch')).toBeInTheDocument();
    });
  });

  it('hides nested scheduling fields when scheduling is off', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('scheduling-enabled-switch')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('scheduling-enabled-switch'));

    expect(screen.queryByTestId('reminder-hours-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('buffer-minutes-input')).not.toBeInTheDocument();
    expect(screen.getByText(/will not see time slots/i)).toBeInTheDocument();
  });

  it('shows fee placeholder when fees on but no services', async () => {
    mockLoad([]);
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('fees-enabled-switch')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('fees-enabled-switch'));

    expect(screen.getByText(/add a service first/i)).toBeInTheDocument();
    expect(screen.queryByTestId('fee-configuration-mock')).not.toBeInTheDocument();
  });

  it('mounts FeeConfiguration when fees on and a service exists', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('fees-enabled-switch')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('fees-enabled-switch'));

    expect(screen.getByTestId('fee-configuration-mock')).toBeInTheDocument();
  });

  it('saves intake flags via reminder-settings endpoint', async () => {
    renderSettings({ siteId: 'site-1' });
    await waitFor(() => expect(screen.getByTestId('save-booking-settings-btn')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('urgent-enabled-switch'));
    fireEvent.click(screen.getByTestId('save-booking-settings-btn'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        `/api/booking/tenants/${mockUserId}/reminder-settings`,
        expect.objectContaining({
          enabled: true,
          hoursBefore: 24,
          scheduling_enabled: true,
          urgent_enabled: true,
          fees_enabled: false,
          payment_enabled: false,
          default_payment_type: 'none',
          default_deposit_percentage: 50,
        }),
        { params: { siteId: 'site-1' } }
      );
    });
  });
});
