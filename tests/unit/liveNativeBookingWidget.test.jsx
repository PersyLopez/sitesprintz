import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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
});
