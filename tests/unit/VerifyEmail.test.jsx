import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmail from '../../src/pages/VerifyEmail';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastContext } from '../../src/context/ToastContext';
import React from 'react';

describe('VerifyEmail Page', () => {
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const renderVerifyEmail = (route = '/verify-email?token=valid-token-123') => {
    return render(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <ToastContext.Provider value={{ showSuccess: mockShowSuccess, showError: mockShowError }}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/verify-email" element={<VerifyEmail />} />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch so the verify effect never hits the network.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  // ============================================================
  // Page Landmark (QA AX-02)
  // ============================================================
  describe('Page Landmark', () => {
    it('should render exactly one main landmark', () => {
      renderVerifyEmail();

      const mains = screen.getAllByRole('main');
      expect(mains).toHaveLength(1);
      expect(mains[0]).toHaveClass('auth-container');
    });

    it('should render the verifying heading inside the main landmark', () => {
      renderVerifyEmail();

      const main = screen.getByRole('main');
      expect(screen.getByRole('heading', { name: /verifying your email/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /verifying your email/i }).closest('main')).toBe(main);
    });
  });
});