import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BookingWidget from '../../src/components/BookingWidget';
import { LocaleProvider } from '../../src/i18n/LocaleContext.jsx';
import * as api from '../../src/utils/api';

vi.mock('../../src/utils/api', () => ({
  get: vi.fn(),
  post: vi.fn(),
}));

const mockServices = [
  {
    id: 'svc-1',
    name: 'Haircut & Style',
    duration_minutes: 45,
    price_cents: 4500,
    description: 'Cut',
  },
  {
    id: 'svc-2',
    name: 'Color Treatment',
    duration_minutes: 90,
    price_cents: 8500,
  },
];

function renderWidget(props = {}) {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <BookingWidget userId="owner-1" siteId="salon" {...props} />
      </LocaleProvider>
    </MemoryRouter>
  );
}

describe('Live BookingWidget catalog mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/services')) return Promise.resolve({ services: mockServices });
      if (url.includes('/staff')) return Promise.resolve({ staff: [] });
      return Promise.resolve({ slots: [] });
    });
  });

  it('shows services-list grid when no page catalog exists', async () => {
    renderWidget({ pageCatalogMode: false });
    await waitFor(() => {
      expect(screen.getByTestId('services-list')).toBeInTheDocument();
    });
  });

  it('hides services-list grid in catalog mode', async () => {
    renderWidget({ pageCatalogMode: true });
    await waitFor(() => {
      expect(screen.getByTestId('booking-service-select')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('services-list')).not.toBeInTheDocument();
  });

  it('selects service by name from page pick event', async () => {
    renderWidget({ pageCatalogMode: true });
    await waitFor(() => {
      expect(screen.getByTestId('booking-service-select')).toBeInTheDocument();
    });
    await act(async () => {
      window.dispatchEvent(new CustomEvent('ss-book-service-select', {
        detail: { name: 'Haircut & Style' },
      }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    });
  });

  it('matches service by normalized name from page pick', async () => {
    renderWidget({ pageCatalogMode: true });
    await waitFor(() => {
      expect(screen.getByTestId('booking-service-select')).toBeInTheDocument();
    });
    await act(async () => {
      window.dispatchEvent(new CustomEvent('ss-book-service-select', {
        detail: { name: '  haircut & style  ' },
      }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    });
  });

  it('queues a page pick until services finish loading', async () => {
    let resolveServices;
    api.get.mockImplementation((url) => {
      if (url.includes('/services')) {
        return new Promise((resolve) => {
          resolveServices = () => resolve({ services: mockServices });
        });
      }
      if (url.includes('/staff')) return Promise.resolve({ staff: [] });
      return Promise.resolve({ slots: [] });
    });

    renderWidget({ pageCatalogMode: true });
    await waitFor(() => {
      expect(typeof resolveServices).toBe('function');
    });
    await act(async () => {
      window.dispatchEvent(new CustomEvent('ss-book-service-select', {
        detail: { name: 'Haircut & Style' },
      }));
    });
    resolveServices();
    await waitFor(() => {
      expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    });
  });

  it('refetches slots and surfaces error when slot is no longer available', async () => {
    const user = userEvent.setup();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    api.get.mockImplementation((url) => {
      if (url.includes('/services')) return Promise.resolve({ services: mockServices });
      if (url.includes('/staff')) return Promise.resolve({ staff: [] });
      if (url.includes('/availability')) {
        return Promise.resolve({
          slots: [{ start_time: `${dateString}T10:00:00`, display_time: '10:00 AM', available: true }],
        });
      }
      return Promise.resolve({ slots: [] });
    });

    api.post.mockRejectedValue(new Error('Time slot no longer available'));

    renderWidget({ pageCatalogMode: false });

    await waitFor(() => {
      expect(screen.getByTestId('service-card-svc-1')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('service-card-svc-1'));
    await user.click(screen.getByTestId('next-button'));

    await waitFor(() => {
      expect(screen.getByTestId(`date-${dateString}`)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId(`date-${dateString}`));

    await waitFor(() => {
      expect(screen.getByTestId(`time-slot-${dateString}T10:00:00`)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId(`time-slot-${dateString}T10:00:00`));
    await user.click(screen.getByTestId('next-button'));

    await waitFor(() => {
      expect(screen.getByTestId('customer-name')).toBeInTheDocument();
    });

    await user.type(screen.getByTestId('customer-name'), 'Jane Doe');
    await user.type(screen.getByTestId('customer-email'), 'jane@example.com');
    await user.click(screen.getByTestId('book-now-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(/no longer available/i);
    });

    const availabilityCalls = api.get.mock.calls.filter(([url]) => url.includes('/availability'));
    expect(availabilityCalls.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });
});
