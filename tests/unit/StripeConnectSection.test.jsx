import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import StripeConnectSection from '../../src/components/dashboard/StripeConnectSection';
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

describe('StripeConnectSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlan.mockReturnValue({ plan: 'growth', features: { payments: true } });
    api.get.mockResolvedValue({ accountId: null, chargesEnabled: false, payoutsEnabled: false });
  });

  it('sends owners to account payment settings instead of connecting inline', async () => {
    renderWithAllProviders(<StripeConnectSection />);

    await waitFor(() => {
      expect(screen.getByTestId('payment-status-action')).toHaveAttribute('href', '/settings/payments');
    });

    expect(screen.queryByRole('button', { name: /connect stripe/i })).not.toBeInTheDocument();
  });
});
