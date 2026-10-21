import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BillingSection } from '../../src/pages/Settings';

function mockFetch(healthBilling) {
  vi.stubGlobal('fetch', vi.fn((url) => {
    if (url === '/api/health') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ billing: { collectsPayments: healthBilling } }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  }));
}

vi.mock('../../src/components/pricing/LaborCheckoutButtons', () => ({
  default: () => null,
}));
vi.mock('../../src/components/pricing/LaborExtrasNote', () => ({
  default: () => null,
}));

function renderBilling(user = { id: 'u1' }) {
  return render(
    <MemoryRouter initialEntries={['/settings/billing']}>
      <BillingSection user={user} token="tok" />
    </MemoryRouter>
  );
}

describe('Settings BillingSection', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('hides Open Billing Portal when platform billing is not open', async () => {
    mockFetch(false);
    renderBilling();

    expect(await screen.findByTestId('billing-collection-closed')).toBeInTheDocument();
    expect(screen.queryByTestId('open-billing-portal')).not.toBeInTheDocument();
  });

  it('shows Open Billing Portal when billing collects payments', async () => {
    mockFetch(true);
    renderBilling();

    expect(await screen.findByTestId('open-billing-portal')).toBeInTheDocument();
    expect(screen.queryByTestId('billing-collection-closed')).not.toBeInTheDocument();
  });

  it('shows the tier display name for the current plan', async () => {
    mockFetch(false);
    renderBilling({ id: 'u1', subscriptionPlan: 'starter' });

    const planName = await screen.findByTestId('billing-plan-name');
    expect(planName).toHaveTextContent('Starter');
    expect(planName.closest('.info-row')).toHaveTextContent(/Plan: Starter/);
  });

  it('maps legacy plan ids onto canonical tier display names', async () => {
    mockFetch(false);
    renderBilling({ id: 'u1', plan: 'pro' });

    expect(await screen.findByTestId('billing-plan-name')).toHaveTextContent('Growth');
  });
});
