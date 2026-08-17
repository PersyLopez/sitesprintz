import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

function renderClaim() {
  return render(
    <MemoryRouter initialEntries={[`/claim/${TOKEN}`]}>
      <Routes>
        <Route path="/claim/:token" element={<ClaimSite />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ClaimSite', () => {
  beforeEach(() => {
    useToast.mockReturnValue({
      showSuccess: vi.fn(),
      showError: vi.fn(),
    });
    global.fetch = vi.fn(() =>
      Promise.resolve(jsonResponse({ businessName: 'Riverside Cuts', subdomain: 'riverside-cuts' }))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows register/login CTAs when logged out', async () => {
    useAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
    });

    renderClaim();

    await waitFor(() => {
      expect(screen.getByText('This site was prepared for you')).toBeInTheDocument();
    });
    expect(screen.getByTestId('claim-register')).toBeInTheDocument();
    expect(screen.getByTestId('claim-login')).toBeInTheDocument();
    expect(screen.queryByTestId('claim-accept')).not.toBeInTheDocument();
  });

  it('shows the accept button when logged in', async () => {
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'owner@example.com', role: 'user' },
      token: 'fake-token',
      isAuthenticated: true,
    });

    renderClaim();

    await waitFor(() => {
      expect(screen.getByTestId('claim-accept')).toBeInTheDocument();
    });
    expect(screen.getByText('This site was prepared for you')).toBeInTheDocument();
    expect(screen.getByText(/add a card/i)).toBeInTheDocument();
  });
});
