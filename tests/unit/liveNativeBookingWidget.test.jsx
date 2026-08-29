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

const mockFeePolicies = {
  feesEnabled: true,
  cancellationPolicy: {
    enabled: true,
    type: 'sliding_scale',
    rules: [{ cancelWithinHours: 24, feePercentage: 100 }],
  },
  noShowPolicy: { enabled: false },
  bookingFeePolicy: { enabled: false },
};

function nextWeekdayIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let offset = 1; offset <= 14; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    if (candidate.getDay() === 0 || candidate.getDay() === 6) continue;
    return `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
  }
  throw new Error('No weekday found');
}

async function navigateToCustomerForm(user, { feesEnabled = false, feePolicies = mockFeePolicies } = {}) {
  const dateString = nextWeekdayIso();

  api.get.mockImplementation((url) => {
    if (url.includes('/fee-policies')) return Promise.resolve(feePolicies);
    if (url.includes('/services')) return Promise.resolve({ services: mockServices });
    if (url.includes('/staff')) return Promise.resolve({ staff: [] });
    if (url.includes('/availability')) {
      return Promise.resolve({
        slots: [{ start_time: `${dateString}T10:00:00`, display_time: '10:00 AM', available: true }],
      });
    }
    return Promise.resolve({ slots: [] });
  });

  renderWidget({ pageCatalogMode: false, feesEnabled });

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
    expect(screen.getByTestId('customer-form')).toBeInTheDocument();
  });
}

describe('Live BookingWidget fee notice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show fee notice when shop fees are off', async () => {
    const user = userEvent.setup();
    await navigateToCustomerForm(user, {
      feesEnabled: false,
      feePolicies: { ...mockFeePolicies, feesEnabled: false },
    });
    expect(screen.queryByTestId('booking-fee-notice')).not.toBeInTheDocument();
  });

  it('shows fee notice when shop fees and a policy are enabled', async () => {
    const user = userEvent.setup();
    await navigateToCustomerForm(user, { feesEnabled: true });
    await waitFor(() => {
      expect(screen.getByTestId('booking-fee-notice')).toBeInTheDocument();
    });
    expect(screen.getByText(/Cancel within 24 hours/i)).toBeInTheDocument();
  });

  it('does not show fee notice when shop fees on but all policies disabled', async () => {
    const user = userEvent.setup();
    await navigateToCustomerForm(user, {
      feesEnabled: true,
      feePolicies: {
        feesEnabled: true,
        cancellationPolicy: { enabled: false },
        noShowPolicy: { enabled: false },
        bookingFeePolicy: { enabled: false },
      },
    });
    await waitFor(() => {
      expect(screen.queryByTestId('booking-fee-notice')).not.toBeInTheDocument();
    });
  });
});

const payableServices = [
  {
    ...mockServices[0],
    requires_payment: true,
    payment_type: 'deposit',
    deposit_percentage: 50,
  },
];

describe('Live BookingWidget deposit checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.location;
    window.location = { href: '' };
  });

  it('shows deposit due and sends the visitor to Stripe Checkout', async () => {
    const user = userEvent.setup();
    const dateString = nextWeekdayIso();

    api.get.mockImplementation((url) => {
      if (url.includes('/fee-policies')) return Promise.resolve(mockFeePolicies);
      if (url.includes('/services')) return Promise.resolve({ services: payableServices });
      if (url.includes('/staff')) return Promise.resolve({ staff: [] });
      if (url.includes('/availability')) {
        return Promise.resolve({
          slots: [{ start_time: `${dateString}T10:00:00`, display_time: '10:00 AM', available: true }],
        });
      }
      return Promise.resolve({ slots: [] });
    });

    api.post.mockImplementation((url) => {
      if (url.includes('/appointments')) {
        return Promise.resolve({ appointment: { id: 'appt-1', confirmation_code: 'ABC123' } });
      }
      if (url.includes('/checkout/create-session')) {
        return Promise.resolve({ checkout_url: 'https://checkout.stripe.com/pay/cs_test_deposit' });
      }
      return Promise.resolve({});
    });

    renderWidget({ pageCatalogMode: false, feesEnabled: true });

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
      expect(screen.getByTestId('booking-payment-due')).toHaveTextContent(/50% deposit/i);
    });
    expect(screen.getByTestId('book-now-button')).toHaveTextContent(/Continue to payment/i);

    await user.type(screen.getByTestId('customer-name'), 'Jane Doe');
    await user.type(screen.getByTestId('customer-email'), 'jane@example.com');
    await user.click(screen.getByTestId('book-now-button'));

    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.stripe.com/pay/cs_test_deposit');
    });

    const checkoutCall = api.post.mock.calls.find(([url]) => url.includes('/checkout/create-session'));
    expect(checkoutCall).toEqual([
      '/api/booking/checkout/create-session',
      { appointment_id: 'appt-1', payment_type: 'deposit' },
    ]);
    expect(screen.queryByTestId('confirmation-page')).not.toBeInTheDocument();
  });

  it('skips Stripe on demo sites even when the service requires payment', async () => {
    const user = userEvent.setup();
    const dateString = nextWeekdayIso();

    api.get.mockImplementation((url) => {
      if (url.includes('/fee-policies')) return Promise.resolve(mockFeePolicies);
      if (url.includes('/services')) return Promise.resolve({ services: payableServices });
      if (url.includes('/staff')) return Promise.resolve({ staff: [] });
      if (url.includes('/availability')) {
        return Promise.resolve({
          slots: [{ start_time: `${dateString}T10:00:00`, display_time: '10:00 AM', available: true }],
        });
      }
      return Promise.resolve({ slots: [] });
    });

    api.post.mockResolvedValue({ appointment: { id: 'appt-demo', confirmation_code: 'DEMO1', demo: true } });

    renderWidget({ pageCatalogMode: false, demoMode: true, feesEnabled: true });

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
      expect(screen.getByTestId('customer-form')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('booking-payment-due')).not.toBeInTheDocument();

    await user.type(screen.getByTestId('customer-name'), 'Jane Doe');
    await user.type(screen.getByTestId('customer-email'), 'jane@example.com');
    await user.click(screen.getByTestId('book-now-button'));

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-page')).toBeInTheDocument();
    });
    expect(api.post.mock.calls.some(([url]) => url.includes('/checkout/create-session'))).toBe(false);
  });
});
