import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PaymentSettings from '../../src/components/setup/forms/PaymentSettings';
import { api } from '../../src/services/api';
import { usePlan } from '../../src/hooks/usePlan';

vi.mock('../../src/hooks/usePlan', () => ({
  usePlan: vi.fn()
}));

vi.mock('../../src/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

function renderSettings(initialEntry = '/settings/payments') {
  window.history.pushState({}, '', initialEntry);
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PaymentSettings />
    </MemoryRouter>
  );
}

function mockSitesAndStatus(sites, status = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/api/connect/status') {
      return Promise.resolve({
        accountId: null,
        available: { stripe: true, square: true, paypal: true },
        visitorCheckout: { stripe: true, square: false, paypal: false },
        ...status
      });
    }
    if (url === '/api/sites') {
      return Promise.resolve({ sites });
    }
    return Promise.resolve({});
  });
}

describe('PaymentSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlan.mockReturnValue({ isGrowth: true });
    mockSitesAndStatus([{ id: 'site-1', payOnSite: false }]);
  });

  it('renders payment configuration and the pay on site toggle', async () => {
    renderSettings();
    expect(screen.getByText(/payment configuration/i)).toBeInTheDocument();
    expect(await screen.findByTestId('pay-on-site-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-connect-button')).toBeInTheDocument();
  });

  it('shows Stripe, Square, and PayPal connect cards', async () => {
    renderSettings();
    expect(await screen.findByTestId('processor-stripe')).toBeInTheDocument();
    expect(screen.getByTestId('processor-square')).toBeInTheDocument();
    expect(screen.getByTestId('processor-paypal')).toBeInTheDocument();
    expect(screen.getByTestId('processor-trust-banner')).toBeInTheDocument();
    expect(screen.getByTestId('processor-recommended-pill')).toHaveTextContent(/recommended/i);
    expect(screen.getAllByText(/2\.9% \+ 30¢/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/cards on your site/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/3\.3% \+ 30¢/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.99% \+ 49¢/i)).toBeInTheDocument();
    expect(screen.getAllByText(/never paste API keys/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('square-visitor-checkout-pending')).toBeInTheDocument();
    expect(screen.getByTestId('paypal-visitor-checkout-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('stripe-visitor-checkout-pending')).not.toBeInTheDocument();
    expect(screen.queryByText(/STRIPE_SECRET_KEY/)).not.toBeInTheDocument();
  });

  it('saves pay on site for the owner sites', async () => {
    const user = userEvent.setup();
    api.put.mockResolvedValue({ payOnSite: true, updatedCount: 1 });
    renderSettings();

    const toggle = await screen.findByTestId('pay-on-site-toggle');
    await user.click(toggle);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/sites/site-1/payment-options', { payOnSite: true });
    });
  });

  it('disables the toggle on Starter plans', async () => {
    usePlan.mockReturnValue({ isGrowth: false });
    renderSettings();

    expect(await screen.findByTestId('pay-on-site-upgrade')).toBeInTheDocument();
    expect(screen.getByTestId('pay-on-site-toggle')).toBeDisabled();
  });

  it('asks the owner to publish a site first', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/api/connect/status') {
        return Promise.resolve({ accountId: null });
      }
      return Promise.resolve({ sites: [] });
    });

    renderSettings();
    expect(await screen.findByTestId('pay-on-site-no-site')).toBeInTheDocument();
    expect(screen.getByTestId('pay-on-site-toggle')).toBeDisabled();
  });

  it('sets Square as the default processor when it is connected', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/api/connect/status') {
        return Promise.resolve({
          accountId: null,
          defaultProcessor: 'stripe',
          square: { connected: true, accountId: 'sq_123' },
          paypal: { connected: false }
        });
      }
      if (url === '/api/sites') {
        return Promise.resolve({
          sites: [{ id: 'site-1', payOnSite: false }]
        });
      }
      return Promise.resolve({});
    });
    api.put.mockResolvedValue({ provider: 'square' });

    renderSettings();
    const setDefault = await screen.findByTestId('square-set-default-button');
    await user.click(setDefault);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/connect/default', {
        provider: 'square',
        applyTo: 'site',
        siteId: 'site-1'
      });
    });
    expect(await screen.findByTestId('processor-connect-success')).toHaveTextContent(/square set as default/i);
  });

  it('shows Stripe new vs existing choice without posting onboard until new is picked', async () => {
    renderSettings();
    expect(await screen.findByTestId('stripe-connect-choice')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-connect-button')).toHaveTextContent(/new to stripe/i);
    expect(screen.getByTestId('stripe-existing-oauth-button')).toHaveTextContent(/already have stripe/i);
    expect(api.post).not.toHaveBeenCalledWith('/api/connect/onboard', expect.anything());
  });

  it('new Stripe choice starts Account Links onboarding', async () => {
    const user = userEvent.setup();
    const hrefSetter = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' }
    });
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      set: hrefSetter,
      get: () => ''
    });
    api.post.mockResolvedValue({ url: 'https://connect.stripe.com/setup/s/test' });

    renderSettings();
    await user.click(await screen.findByTestId('stripe-connect-button'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/connect/onboard', {
        siteId: 'site-1',
        applyTo: 'site'
      });
    });
    expect(api.get).not.toHaveBeenCalledWith('/api/connect/stripe/oauth', expect.anything());

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    });
  });

  it('existing Stripe choice uses OAuth without onboarding', async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' }
    });
    api.get.mockImplementation((url, opts) => {
      if (url === '/api/connect/stripe/oauth') {
        return Promise.resolve({ url: 'https://connect.stripe.com/oauth/authorize' });
      }
      if (url === '/api/connect/status') {
        return Promise.resolve({
          accountId: null,
          available: { stripe: true, square: true, paypal: true }
        });
      }
      if (url === '/api/sites') {
        return Promise.resolve({ sites: [{ id: 'site-1', payOnSite: false }] });
      }
      return Promise.resolve({});
    });

    renderSettings();
    await user.click(await screen.findByTestId('stripe-existing-oauth-button'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/connect/stripe/oauth', {
        params: { siteId: 'site-1', applyTo: 'site' }
      });
    });
    expect(api.post).not.toHaveBeenCalledWith('/api/connect/onboard', expect.anything());

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    });
  });

  it('hides apply-to radios with one site and shows them with two', async () => {
    renderSettings();
    await screen.findByTestId('pay-on-site-toggle');
    expect(screen.queryByTestId('payment-apply-to')).not.toBeInTheDocument();

    mockSitesAndStatus([
      { id: 'site-1', businessName: 'Cafe', payOnSite: false },
      { id: 'site-2', businessName: 'Bakery', payOnSite: false }
    ]);
    renderSettings();
    expect(await screen.findByTestId('payment-apply-to')).toBeInTheDocument();
  });

  it('lets the owner pick this site, future sites, or all sites when they have multiple sites', async () => {
    const user = userEvent.setup();
    mockSitesAndStatus([
      { id: 'site-1', businessName: 'Cafe', payOnSite: false },
      { id: 'site-2', businessName: 'Bakery', payOnSite: false }
    ]);
    renderSettings();

    expect(await screen.findByTestId('payment-apply-to')).toBeInTheDocument();
    expect(screen.getByTestId('payment-apply-site')).toBeChecked();

    await user.click(screen.getByTestId('payment-apply-future'));
    expect(screen.getByTestId('payment-apply-future')).toBeChecked();
  });

  it('shows refresh banner when Account Link expired', async () => {
    renderSettings('/settings/payments?connect=refresh&processor=stripe');
    expect(await screen.findByTestId('processor-connect-error')).toHaveTextContent(/setup link expired/i);
    expect(api.post).not.toHaveBeenCalledWith('/api/connect/refresh', expect.anything());
  });

  it('shows OAuth success on the connect list and clears query params', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    renderSettings('/settings/payments?connect=success&processor=square&site=site-1');
    expect(await screen.findByTestId('processor-connect-success')).toHaveTextContent(/Square connected successfully/i);
    expect(replaceState).toHaveBeenCalled();
    const clearedUrl = replaceState.mock.calls.at(-1)?.[2] || '';
    expect(String(clearedUrl)).not.toMatch(/connect=/);
    expect(String(clearedUrl)).toMatch(/site=site-1/);
  });

  it('maps OAuth error codes on the connect list', async () => {
    renderSettings('/settings/payments?connect=error&processor=paypal&message=paypal_not_business');
    expect(await screen.findByTestId('processor-connect-error')).toHaveTextContent(/Business account/i);
  });

  it('does not claim fully connected on success while Stripe is incomplete', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/api/connect/status') {
        return Promise.resolve({
          accountId: 'acct_test',
          chargesEnabled: false,
          payoutsEnabled: false,
          stripe: { connected: true },
          available: { stripe: true, square: true, paypal: true }
        });
      }
      if (url === '/api/sites') {
        return Promise.resolve({ sites: [{ id: 'site-1', payOnSite: false }] });
      }
      return Promise.resolve({});
    });

    renderSettings('/settings/payments?connect=success&processor=stripe');
    expect(await screen.findByTestId('processor-connect-success')).toHaveTextContent(/Stripe connected successfully/i);
    const stripeCard = await screen.findByTestId('processor-stripe');
    await waitFor(() => {
      expect(within(stripeCard).getByTestId('connection-status')).toHaveTextContent(/incomplete/i);
    });
    expect(within(stripeCard).getByTestId('stripe-connect-button')).toHaveTextContent(/continue setup/i);
    expect(screen.queryByTestId('stripe-account-id')).not.toBeInTheDocument();
  });

  it('copies this site payment setup to every existing site', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/api/connect/status') {
        return Promise.resolve({ accountId: null, futureDefaults: { enabled: false } });
      }
      if (url === '/api/sites') {
        return Promise.resolve({
          sites: [
            { id: 'site-1', businessName: 'Cafe', payOnSite: false },
            { id: 'site-2', businessName: 'Bakery', payOnSite: false }
          ]
        });
      }
      return Promise.resolve({});
    });
    api.post.mockResolvedValue({ copied: 1 });

    renderSettings();
    const copy = await screen.findByTestId('payment-copy-all');
    await user.click(copy);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/connect/apply-setup', {
        siteId: 'site-1',
        applyToAll: true,
        applyToFuture: false
      });
    });
  });
});
