import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminCoupons from '../../src/pages/AdminCoupons';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';

vi.mock('../../src/hooks/useAuth');
vi.mock('../../src/hooks/useToast');
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));
vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));
vi.mock('../../src/components/admin/AdminSubnav', () => ({
  default: () => <nav data-testid="admin-subnav">AdminSubnav</nav>,
}));

describe('AdminCoupons Page', () => {
  let mockShowSuccess;
  let mockShowError;
  let mockCoupons;

  beforeEach(() => {
    mockShowSuccess = vi.fn();
    mockShowError = vi.fn();
    mockCoupons = [
      {
        id: 'c1',
        code: 'SAVE20',
        percentOff: 20,
        amountOffCents: null,
        duration: 'once',
        durationInMonths: null,
        maxRedemptions: null,
        expiresAt: null,
        firstTimeOnly: false,
        appliesToPlans: [],
        active: true,
        timesRedeemed: 3,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ];

    useAuth.mockReturnValue({ token: 'fake-token' });
    useToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });

    global.fetch = vi.fn();
    global.localStorage = {
      getItem: vi.fn(() => 'fake-token'),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockListFetch = () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ coupons: mockCoupons }),
    });
  };

  it('renders admin coupons page with header and form', async () => {
    mockListFetch();
    render(
      <MemoryRouter>
        <AdminCoupons />
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-coupons-page')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('coupon-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('coupon-create-submit')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('coupon-list')).toBeInTheDocument();
    });
  });

  it('shows page title and coupon list', async () => {
    mockListFetch();
    render(
      <MemoryRouter>
        <AdminCoupons />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Coupon Codes/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('SAVE20')).toBeInTheDocument();
      expect(screen.getByText('20% off')).toBeInTheDocument();
    });
  });

  it('shows empty state when no coupons', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ coupons: [] }),
    });

    render(
      <MemoryRouter>
        <AdminCoupons />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No coupons yet/i)).toBeInTheDocument();
    });
  });

  it('renders form fields for discount and duration', async () => {
    mockListFetch();
    render(
      <MemoryRouter>
        <AdminCoupons />
      </MemoryRouter>
    );

    expect(screen.getByTestId('coupon-discount-type')).toBeInTheDocument();
    expect(screen.getByTestId('coupon-discount-value')).toBeInTheDocument();
    expect(screen.getByTestId('coupon-usage-limit')).toBeInTheDocument();
    expect(screen.getByTestId('coupon-duration')).toBeInTheDocument();
    expect(screen.getByTestId('coupon-first-time-only')).toBeInTheDocument();
  });

  it('validates empty code before submit', async () => {
    mockListFetch();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminCoupons />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('coupon-list')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('coupon-create-submit'));

    expect(mockShowError).toHaveBeenCalledWith('Please enter a coupon code');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('validates invalid code before submit', async () => {
    mockListFetch();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminCoupons />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('coupon-list')).toBeInTheDocument();
    });

    await user.type(screen.getByTestId('coupon-code-input'), 'ab');
    await user.click(screen.getByTestId('coupon-create-submit'));

    expect(mockShowError).toHaveBeenCalledWith(
      'Code must be 3–32 characters: letters, numbers, underscore, or hyphen'
    );
  });

  it('shows API error from toast on failed create', async () => {
    mockListFetch();
    const user = userEvent.setup();

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ coupons: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' }),
      });

    render(
      <MemoryRouter>
        <AdminCoupons />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No coupons yet/i)).toBeInTheDocument();
    });

    await user.type(screen.getByTestId('coupon-code-input'), 'TESTCODE');
    await user.type(screen.getByTestId('coupon-discount-value'), '10');
    await user.click(screen.getByTestId('coupon-create-submit'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Stripe is not configured on this server');
    });
  });
});
