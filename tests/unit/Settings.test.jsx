import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Settings, { BillingSection } from '../../src/pages/Settings';

const mockShowError = vi.fn();

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: mockShowError,
  }),
}));

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
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, token: 'tok' }),
}));
vi.mock('../../src/components/layout/Header', () => ({ default: () => null }));
vi.mock('../../src/components/layout/Footer', () => ({ default: () => null }));
vi.mock('../../src/components/common/HelpPanel', () => ({
  default: ({ children }) => children ?? null,
}));
vi.mock('../../src/components/common/FAQWidget', () => ({ default: () => null }));
vi.mock('../../src/components/setup/forms/PaymentSettings', () => ({ default: () => null }));
vi.mock('../../src/components/dashboard/FoundationSettings', () => ({ default: () => null }));
vi.mock('../../src/components/dashboard/CustomDomainSettings', () => ({ default: () => null }));

function renderBilling(user = { id: 'u1' }) {
  return render(
    <MemoryRouter initialEntries={['/settings/billing']}>
      <BillingSection user={user} token="tok" />
    </MemoryRouter>
  );
}

describe('Settings BillingSection', () => {
  beforeEach(() => {
    mockShowError.mockClear();
  });

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

  it('shows an error toast when the billing portal fails to open', async () => {
    mockFetch(true);
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url === '/api/health') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ billing: { collectsPayments: true } }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'No subscription' }) });
    }));
    renderBilling();

    fireEvent.click(await screen.findByTestId('open-billing-portal'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to open billing portal');
    });
  });

  it('shows the unused-slot reason when checkout returns SITE_SLOT_AVAILABLE', async () => {
    mockFetch(true);
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url === '/api/health') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ billing: { collectsPayments: true } }),
        });
      }
      if (url === '/api/payments/create-subscription-checkout') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            code: 'SITE_SLOT_AVAILABLE',
            error: 'You already have an unused site slot. Publish without paying again.',
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }));
    renderBilling({ id: 'u1' });

    fireEvent.click(await screen.findByTestId('subscribe-starter'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'You already have an unused site slot. Publish without paying again.'
      );
    });
  });
});

describe('Settings heading order (QA AX-02)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function renderSettingsPage() {
    return render(
      <MemoryRouter initialEntries={['/settings/billing']}>
        <Routes>
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('announces Billing Management as h1 and its blocks as h2 on the billing route', async () => {
    mockFetch(true);
    renderSettingsPage();

    const pageHeading = await screen.findByRole('heading', { level: 1, name: /Billing Management/ });
    expect(pageHeading).toBeInTheDocument();
    expect(pageHeading).toHaveTextContent(/^Billing Management$/);
    const portalButton = screen.getByTestId('open-billing-portal');
    expect(portalButton).toHaveTextContent(/^Open Billing Portal$/);
    expect(portalButton.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(
      screen.getByRole('heading', { level: 2, name: /Subscription & Payment Method/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Current Plan/ })).toBeInTheDocument();
  });

  it('renders the sidebar label as text, not a heading', async () => {
    mockFetch(true);
    renderSettingsPage();

    await screen.findByRole('heading', { level: 1, name: /Billing Management/ });
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument();
  });
});
