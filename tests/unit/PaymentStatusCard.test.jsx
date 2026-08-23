import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import PaymentStatusCard from '../../src/components/ecommerce/PaymentStatusCard';
import { renderWithAllProviders } from '../utils/testWrapper.jsx';
import { api } from '../../src/services/api';

vi.mock('../../src/services/api', async () => {
  const actual = await vi.importActual('../../src/services/api');
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn()
    }
  };
});

vi.mock('../../src/hooks/usePlan', () => ({
  usePlan: vi.fn()
}));

import { usePlan } from '../../src/hooks/usePlan';

const renderCard = () => renderWithAllProviders(<PaymentStatusCard />);

describe('PaymentStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.localStorage = {
      getItem: vi.fn((key) => (['token', 'authToken', 'accessToken'].includes(key) ? 'mock-token' : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  it('shows upgrade prompt for non-payment plans', () => {
    usePlan.mockReturnValue({ plan: 'starter', features: { payments: false } });
    renderCard();

    expect(screen.getByText(/Payments are a Growth feature/i)).toBeInTheDocument();
    expect(screen.getByTestId('payment-status-upgrade')).toBeInTheDocument();
  });

  it('shows connected status when Stripe is ready', async () => {
    usePlan.mockReturnValue({ plan: 'growth', features: { payments: true } });
    api.get.mockResolvedValue({
      accountId: 'acct_123',
      chargesEnabled: true,
      payoutsEnabled: true,
      email: 'stripe@example.com'
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByText(/Payments ready/i)).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    expect(screen.getByText(/stripe@example.com/i)).toBeInTheDocument();
  });

  it('shows a settings link when Stripe is not started', async () => {
    usePlan.mockReturnValue({ plan: 'growth', features: { payments: true } });
    api.get.mockResolvedValue({ accountId: null, chargesEnabled: false, payoutsEnabled: false });

    renderCard();

    await waitFor(() => {
      expect(screen.getByText(/Connect payments in Settings/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('payment-status-action')).toHaveAttribute('href', '/settings/payments');
    expect(screen.getByTestId('payment-status-action')).toHaveTextContent(/Open payment settings/i);
  });

  it('shows continue setup in payment settings when Stripe is incomplete', async () => {
    usePlan.mockReturnValue({ plan: 'growth', features: { payments: true } });
    api.get.mockResolvedValue({ accountId: 'acct_123', chargesEnabled: false, payoutsEnabled: true });

    renderCard();

    await waitFor(() => {
      expect(screen.getByText(/Payments incomplete/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/identity verification on Stripe/i)).toBeInTheDocument();
    expect(screen.getByText(/never paste API keys/i)).toBeInTheDocument();
    expect(screen.getByTestId('payment-status-action')).toHaveAttribute('href', '/settings/payments');
  });

  it('shows error state when status fetch fails', async () => {
    usePlan.mockReturnValue({ plan: 'growth', features: { payments: true } });
    api.get.mockRejectedValue(new Error('Network error'));

    renderCard();

    await waitFor(() => {
      expect(screen.getByText(/Payment status unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('payment-status-action')).toHaveTextContent(/Retry/i);
  });
});
