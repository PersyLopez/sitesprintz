import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClaimSite from '../../src/pages/ClaimSite';
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

const TOKEN = 'ab'.repeat(32);

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function renderClaim(initialEntry = `/claim/${TOKEN}`) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/claim/:token" element={<ClaimSite />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ClaimSite', () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    useToast.mockReturnValue({
      showSuccess: vi.fn(),
      showError: vi.fn(),
    });
    useAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: vi.fn(),
    });
    global.fetch = vi.fn(() =>
      Promise.resolve(jsonResponse({ businessName: 'Riverside Cuts', subdomain: 'riverside-cuts' }))
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: assignMock },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows register/login CTAs when logged out', async () => {
    renderClaim();

    await waitFor(() => {
      expect(screen.getByText('This site was prepared for you')).toBeInTheDocument();
    });
    expect(screen.getByTestId('claim-register')).toBeInTheDocument();
    expect(screen.getByTestId('claim-login')).toBeInTheDocument();
    expect(screen.queryByTestId('claim-accept')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-start-trial')).not.toBeInTheDocument();
  });

  it('shows start-trial UI when logged in without subscription', async () => {
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'owner@example.com', role: 'user', subscription_status: 'inactive' },
      token: 'fake-token',
      isAuthenticated: true,
      setUser: vi.fn(),
    });

    renderClaim();

    await waitFor(() => {
      expect(screen.getByTestId('claim-start-trial')).toBeInTheDocument();
    });
    expect(screen.getByTestId('claim-plan-starter')).toBeInTheDocument();
    expect(screen.getByTestId('claim-plan-growth')).toBeInTheDocument();
    expect(screen.getByText(/add a card/i)).toBeInTheDocument();
    expect(screen.getByTestId('labor-extras')).toHaveTextContent(/no setup fee/i);
    expect(screen.queryByTestId('claim-accept')).not.toBeInTheDocument();
  });

  it('shows accept button when logged in with trialing subscription', async () => {
    useAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        role: 'user',
        subscription_status: 'trialing',
      },
      token: 'fake-token',
      isAuthenticated: true,
      setUser: vi.fn(),
    });

    renderClaim();

    await waitFor(() => {
      expect(screen.getByTestId('claim-accept')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('claim-start-trial')).not.toBeInTheDocument();
  });

  it('redirects to Stripe checkout when start trial is clicked', async () => {
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'owner@example.com', role: 'user' },
      token: 'fake-token',
      isAuthenticated: true,
      setUser: vi.fn(),
    });

    global.fetch = vi.fn((url, options) => {
      if (url.includes('/trial-checkout')) {
        return Promise.resolve(jsonResponse({ url: 'https://checkout.stripe.com/session' }));
      }
      return Promise.resolve(jsonResponse({ businessName: 'Riverside Cuts', subdomain: 'riverside-cuts' }));
    });

    const user = userEvent.setup();
    renderClaim();

    await waitFor(() => {
      expect(screen.getByTestId('claim-start-trial')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('claim-start-trial'));

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.com/session');
    });
  });
});
