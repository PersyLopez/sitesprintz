/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OAuthCallback from '../../src/pages/OAuthCallback.jsx';

const mockNavigate = vi.fn();
const mockCheckAuth = vi.fn();
const mockGetUserSites = vi.fn();
let mockUser = { id: '1', role: 'user' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    checkAuth: mockCheckAuth,
    user: mockUser,
    loading: false,
  }),
}));

vi.mock('../../src/services/auth', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('../../src/services/sites', () => ({
  sitesService: {
    getUserSites: (...args) => mockGetUserSites(...args),
  },
}));

function renderCallback(search) {
  return render(
    <MemoryRouter initialEntries={[`/oauth/callback${search}`]}>
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OAuthCallback', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCheckAuth.mockResolvedValue(undefined);
    mockGetUserSites.mockReset();
    mockGetUserSites.mockResolvedValue({ sites: [] });
    mockUser = { id: '1', role: 'user' };
    sessionStorage.clear();
  });

  it('returns claimers to the claim link after Google sign-in', async () => {
    const claimPath = `/claim/${'ab'.repeat(32)}`;
    sessionStorage.setItem('oauthRedirect', claimPath);
    renderCallback('?token=abc');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(claimPath, { replace: true });
    });
  });

  it('sends Growth Managed sign-in to dashboard (plan selection after trial)', async () => {
    renderCallback('?token=abc&plan=growth_managed');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('opens the only owner site after Google sign-in', async () => {
    mockGetUserSites.mockResolvedValueOnce({ sites: [{ id: 'site-1' }] });
    renderCallback('?token=abc');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/sites/site-1', { replace: true });
    });
  });

  it('keeps the OAuth redirect ahead of owner site selection', async () => {
    const returnTo = `/claim/${'cd'.repeat(32)}`;
    sessionStorage.setItem('oauthRedirect', returnTo);
    renderCallback('?token=abc');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(returnTo, { replace: true });
    });
    expect(mockGetUserSites).not.toHaveBeenCalled();
  });

  it('keeps admins on the admin dashboard', async () => {
    mockUser = { id: 'admin-1', role: 'admin' };
    renderCallback('?token=abc');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('falls back to dashboard when owner sites cannot be fetched', async () => {
    mockGetUserSites.mockRejectedValueOnce(new Error('network'));
    renderCallback('?token=abc');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
