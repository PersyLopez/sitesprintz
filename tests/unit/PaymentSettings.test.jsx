import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

function renderSettings() {
  return render(
    <MemoryRouter>
      <PaymentSettings />
    </MemoryRouter>
  );
}

describe('PaymentSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlan.mockReturnValue({ isGrowth: true });
    api.get.mockImplementation((url) => {
      if (url === '/api/connect/status') {
        return Promise.resolve({
          accountId: null,
          available: { stripe: true, square: true, paypal: true }
        });
      }
      if (url === '/api/sites') {
        return Promise.resolve({
          sites: [{ id: 'site-1', payOnSite: false }]
        });
      }
      return Promise.resolve({});
    });
  });

  it('renders payment configuration and the pay on site toggle', async () => {
    renderSettings();
    expect(screen.getByText(/payment configuration/i)).toBeInTheDocument();
    expect(await screen.findByTestId('pay-on-site-toggle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect stripe/i })).toBeInTheDocument();
  });

  it('shows Stripe, Square, and PayPal connect cards', async () => {
    renderSettings();
    expect(await screen.findByTestId('processor-stripe')).toBeInTheDocument();
    expect(screen.getByTestId('processor-square')).toBeInTheDocument();
    expect(screen.getByTestId('processor-paypal')).toBeInTheDocument();
    expect(screen.getByTestId('processor-trust-banner')).toBeInTheDocument();
    expect(screen.getAllByText(/2\.9% \+ 30¢/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/instant payouts/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.3% \+ 30¢/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.99% \+ 49¢/i)).toBeInTheDocument();
    expect(screen.getAllByText(/never paste API keys/i).length).toBeGreaterThanOrEqual(1);
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

  it('shows Use existing Stripe account next to Connect Stripe', async () => {
    renderSettings();
    expect(await screen.findByTestId('stripe-connect-button')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-existing-oauth-button')).toHaveTextContent(/use existing stripe account/i);
  });

  it('Connect Stripe still starts Account Links onboarding', async () => {
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

  it('lets the owner pick this site, future sites, or all sites', async () => {
    const user = userEvent.setup();
    renderSettings();

    expect(await screen.findByTestId('payment-apply-to')).toBeInTheDocument();
    expect(screen.getByTestId('payment-apply-site')).toBeChecked();

    await user.click(screen.getByTestId('payment-apply-future'));
    expect(screen.getByTestId('payment-apply-future')).toBeChecked();
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
