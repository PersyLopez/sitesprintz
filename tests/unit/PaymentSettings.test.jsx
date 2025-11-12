import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentSettings from '../../src/components/setup/forms/PaymentSettings';

// Mock dependencies
vi.mock('../../src/hooks/useSite', () => ({
  useSite: vi.fn(),
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useSite } from '../../src/hooks/useSite';
import { useAuth } from '../../src/hooks/useAuth';

describe('PaymentSettings Component', () => {
  let mockUpdateNestedField;

  beforeEach(() => {
    mockUpdateNestedField = vi.fn();

    useSite.mockReturnValue({
      siteData: {
        payments: {
          enabled: false,
          currency: 'USD',
          tax: 0,
          shipping: {
            enabled: false,
            flatRate: 0,
          },
        },
      },
      updateNestedField: mockUpdateNestedField,
    });

    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
    });

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => 'fake-token'),
    };

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Rendering Tests (2 tests)
  describe('Rendering', () => {
    it('should render payment settings header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accountId: null }),
      });

      render(<PaymentSettings />);

      expect(screen.getByText(/payment configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/configure payment processing/i)).toBeInTheDocument();
    });

    it('should check Stripe connection on mount', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accountId: null }),
      });

      render(<PaymentSettings />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/stripe/account',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer fake-token',
            }),
          })
        );
      });
    });
  });

  // Stripe Connection Tests (3 tests)
  describe('Stripe Connection', () => {
    it('should show not connected state', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accountId: null }),
      });

      render(<PaymentSettings />);

      await waitFor(() => {
        expect(screen.getByText(/not connected/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/connect your stripe account/i)).toBeInTheDocument();
    });

    it('should show connected state', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accountId: 'acct_123456789012345678' }),
      });

      render(<PaymentSettings />);

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/your stripe account is connected/i)).toBeInTheDocument();
    });

    it('should handle connect button click', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accountId: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://stripe.com/connect' }),
        });

      delete window.location;
      window.location = { href: '' };

      const user = userEvent.setup();
      render(<PaymentSettings />);

      await waitFor(() => {
        expect(screen.getByText(/connect stripe account/i)).toBeInTheDocument();
      });

      const connectButton = screen.getByRole('button', { name: /connect stripe account/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(window.location.href).toBe('https://stripe.com/connect');
      });
    });
  });

  // Payment Configuration Tests (3 tests)
  describe('Payment Configuration', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accountId: 'acct_123' }),
      });
    });

    it('should enable payments', async () => {
      const user = userEvent.setup();
      render(<PaymentSettings />);

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /enable payments/i });
      await user.click(checkbox);

      expect(mockUpdateNestedField).toHaveBeenCalledWith('payments.enabled', true);
    });

    it('should update currency', async () => {
      useSite.mockReturnValue({
        siteData: {
          payments: {
            enabled: true,
            currency: 'USD',
            tax: 0,
            shipping: { enabled: false, flatRate: 0 },
          },
        },
        updateNestedField: mockUpdateNestedField,
      });

      const user = userEvent.setup();
      render(<PaymentSettings />);

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      const select = screen.getByDisplayValue(/USD/);
      await user.selectOptions(select, 'EUR');

      expect(mockUpdateNestedField).toHaveBeenCalledWith('payments.currency', 'EUR');
    });

    it('should update tax rate', async () => {
      useSite.mockReturnValue({
        siteData: {
          payments: {
            enabled: true,
            currency: 'USD',
            tax: 0,
            shipping: { enabled: false, flatRate: 0 },
          },
        },
        updateNestedField: mockUpdateNestedField,
      });

      const user = userEvent.setup();
      render(<PaymentSettings />);

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      const taxInput = screen.getByPlaceholderText('0.00');
      await user.type(taxInput, '8');

      expect(mockUpdateNestedField).toHaveBeenCalled();
    });
  });
});

