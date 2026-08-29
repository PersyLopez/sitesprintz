/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OAuthCallback from '../../src/pages/OAuthCallback.jsx';

const mockNavigate = vi.fn();
const mockCheckAuth = vi.fn();

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
    user: { id: '1', role: 'user' },
    loading: false,
  }),
}));

vi.mock('../../src/services/auth', () => ({
  authService: {
    getCurrentUser: vi.fn(),
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

  it('sends Growth Managed sign-in to billing', async () => {
    renderCallback('?token=abc&plan=growth_managed');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/settings/billing?plan=growth_managed',
        { replace: true },
      );
    });
  });
});
