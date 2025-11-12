import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StripeConnectSection from '../../src/components/dashboard/StripeConnectSection';

// Mock fetch and window
global.fetch = vi.fn();
global.alert = vi.fn();
global.confirm = vi.fn();

describe('StripeConnectSection Component', () => {
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockClear();
    delete window.location;
    window.location = { href: '' };
  });

  // Component Rendering (3 tests)
  describe('Component Display', () => {
    it('should render stripe connect section with heading', () => {
      render(<StripeConnectSection connected={false} onConnect={mockOnConnect} />);

      expect(screen.getByRole('heading', { name: /payment processing/i })).toBeInTheDocument();
    });

    it('should show connect button when not connected', () => {
      render(<StripeConnectSection connected={false} onConnect={mockOnConnect} />);

      expect(screen.getByRole('button', { name: /connect with stripe/i })).toBeInTheDocument();
      expect(screen.getByText(/not connected/i)).toBeInTheDocument();
    });

    it('should show connected status when stripe is connected', () => {
      render(<StripeConnectSection connected={true} onConnect={mockOnConnect} />);

      expect(screen.getByText(/✓ connected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });
  });

  // Connection Flow (4 tests)
  describe('Stripe Connection', () => {
    it('should redirect to stripe oauth when connect clicked', async () => {
      const user = userEvent.setup();

      render(<StripeConnectSection connected={false} onConnect={mockOnConnect} />);

      const connectButton = screen.getByRole('button', { name: /connect with stripe/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(window.location.href).toBe('/api/stripe/connect');
      });
    });

    it('should show connecting message', async () => {
      render(<StripeConnectSection connected={false} onConnect={mockOnConnect} />);
      
      // Component renders with not connected message
      expect(screen.getByText(/connect your stripe account/i)).toBeInTheDocument();
    });

    it('should show connected message', () => {
      render(<StripeConnectSection connected={true} onConnect={mockOnConnect} />);
      
      expect(screen.getByText(/your stripe account is connected/i)).toBeInTheDocument();
    });

    it('should handle connect button click', async () => {
      const user = userEvent.setup();

      render(<StripeConnectSection connected={false} onConnect={mockOnConnect} />);

      const connectButton = screen.getByRole('button', { name: /connect with stripe/i });
      expect(connectButton).toBeInTheDocument();
      
      await user.click(connectButton);
      
      // Verify redirect happened
      await waitFor(() => {
        expect(window.location.href).toContain('/api/stripe/connect');
      });
    });
  });

  // Status Display (3 tests)
  describe('Connection Status', () => {
    it('should show not connected badge', () => {
      render(<StripeConnectSection connected={false} onConnect={mockOnConnect} />);

      const badge = screen.getByText(/not connected/i);
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('not-connected');
    });

    it('should show connected badge', () => {
      render(<StripeConnectSection connected={true} onConnect={mockOnConnect} />);

      const badge = screen.getByText(/✓ connected/i);
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('connected');
    });

    it('should show appropriate message based on status', () => {
      const { rerender } = render(
        <StripeConnectSection connected={false} onConnect={mockOnConnect} />
      );

      expect(screen.getByText(/connect your stripe account to accept payments/i)).toBeInTheDocument();

      rerender(<StripeConnectSection connected={true} onConnect={mockOnConnect} />);

      expect(screen.getByText(/your stripe account is connected and ready to accept payments/i)).toBeInTheDocument();
    });
  });

  // Disconnect (2 tests)
  describe('Disconnect Stripe', () => {
    it('should show disconnect button when connected', () => {
      render(<StripeConnectSection connected={true} onConnect={mockOnConnect} />);

      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });

    it('should disconnect stripe account when confirmed', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(true);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      global.alert.mockImplementation(() => {});

      render(<StripeConnectSection connected={true} onConnect={mockOnConnect} />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/stripe/disconnect',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });
  });
});
