/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PaymentSuccess from '../../src/pages/PaymentSuccess';
import { AuthContext } from '../../src/context/AuthContext';

const mockCheckAuth = vi.fn();
const mockFetch = vi.fn();

function renderPaymentSuccess(sessionId = 'cs_test_123') {
  return render(
    <AuthContext.Provider
      value={{
        user: { id: '1', email: 'test@example.com' },
        token: 'test-token',
        loading: false,
        isAuthenticated: true,
        checkAuth: mockCheckAuth,
      }}
    >
      <MemoryRouter initialEntries={[`/payment-success?session_id=${sessionId}`]}>
        <Routes>
          <Route path="/payment-success" element={<PaymentSuccess />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('PaymentSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockCheckAuth.mockResolvedValue(undefined);
  });

  it('confirms checkout session and shows plan', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ plan: 'growth', status: 'active' }),
    });

    renderPaymentSuccess();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/payments/confirm-checkout-session',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ sessionId: 'cs_test_123' }),
        }),
      );
    });

    expect(await screen.findByTestId('payment-success-plan')).toHaveTextContent('Growth');
    expect(screen.getByTestId('payment-success-status')).toHaveTextContent('Active');
  });

  it('shows error when confirmation fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Checkout not complete' }),
    });

    renderPaymentSuccess();

    expect(await screen.findByTestId('payment-success-error')).toHaveTextContent('Checkout not complete');
    expect(screen.getByTestId('payment-success-retry')).toBeInTheDocument();
  });
});
