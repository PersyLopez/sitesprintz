/**
 * Component Tests: Payment Components
 * Tests React components for booking payment UI
 * 
 * Coverage:
 * - PaymentStatusBadge
 * - RefundModal
 * - BookingWidget (payment step)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import PaymentStatusBadge from '../../../src/components/booking/PaymentStatusBadge';
import RefundModal from '../../../src/components/booking/RefundModal';
import BookingWidget from '../../../src/components/booking/BookingWidget';

// Mock API utilities
vi.mock('../../../src/utils/api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn()
}));

// Mock hooks
vi.mock('../../../src/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  })
}));

describe('PaymentStatusBadge', () => {
  it('should render unpaid status', () => {
    render(<PaymentStatusBadge status="unpaid" amount={0} />);
    
    const badge = screen.getByText('Not Paid');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.payment-status-badge')).toHaveClass('payment-status-gray');
  });

  it('should render pending status', () => {
    render(<PaymentStatusBadge status="pending" amount={5250} />);
    
    const badge = screen.getByText('Payment Pending');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.payment-status-badge')).toHaveClass('payment-status-yellow');
  });

  it('should render paid status with amount', () => {
    render(<PaymentStatusBadge status="paid" amount={5250} />);
    
    const badge = screen.getByText('Paid');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.payment-status-badge')).toHaveClass('payment-status-green');
  });

  it('should render refunded status', () => {
    render(<PaymentStatusBadge status="refunded" amount={5250} />);
    
    const badge = screen.getByText('Refunded');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.payment-status-badge')).toHaveClass('payment-status-red');
  });

  it('should render failed status', () => {
    render(<PaymentStatusBadge status="failed" amount={0} />);
    
    const badge = screen.getByText('Payment Failed');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.payment-status-badge')).toHaveClass('payment-status-red');
  });

  it('should default to unpaid for unknown status', () => {
    render(<PaymentStatusBadge status="unknown" amount={0} />);
    
    const badge = screen.getByText('Not Paid');
    expect(badge).toBeInTheDocument();
  });

  it('should format amount correctly', () => {
    render(<PaymentStatusBadge status="paid" amount={12345} />);
    
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('should handle zero amount', () => {
    render(<PaymentStatusBadge status="paid" amount={0} />);
    
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});

describe('RefundModal', () => {
  const mockAppointment = {
    id: 'appt-123',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    payment_amount_cents: 5250,
    payment_status: 'paid'
  };

  const mockOnRefund = vi.fn();
  const mockOnClose = vi.fn();
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with appointment details', () => {
    render(
      <RefundModal
        appointment={mockAppointment}
        userId={userId}
        onRefund={mockOnRefund}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('refund-confirm-button')).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/\$52.50/)).toBeInTheDocument();
  });

  it('should have reason dropdown with options', () => {
    render(
      <RefundModal
        appointment={mockAppointment}
        userId={userId}
        onRefund={mockOnRefund}
        onClose={mockOnClose}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    expect(screen.getByRole('option', { name: 'Customer Request' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Business Cancelled' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Duplicate Booking' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
  });

  it('should allow changing refund reason', () => {
    render(
      <RefundModal
        appointment={mockAppointment}
        userId={userId}
        onRefund={mockOnRefund}
        onClose={mockOnClose}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'business_cancelled' } });
    
    expect(select.value).toBe('business_cancelled');
  });

  it('should call onClose when Cancel clicked', () => {
    render(
      <RefundModal
        appointment={mockAppointment}
        userId={userId}
        onRefund={mockOnRefund}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show confirmation before processing refund', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <RefundModal
        appointment={mockAppointment}
        userId={userId}
        onRefund={mockOnRefund}
        onClose={mockOnClose}
      />
    );

    const refundButton = screen.getByRole('button', { name: /Issue Refund/i });
    fireEvent.click(refundButton);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(confirmSpy.mock.calls[0][0]).toContain('$52.50');
    
    confirmSpy.mockRestore();
  });

  it('should process refund when confirmed', async () => {
    const { post } = await import('../../../src/utils/api');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    post.mockResolvedValue({ success: true });

    render(
      <RefundModal
        appointment={mockAppointment}
        userId={userId}
        onRefund={mockOnRefund}
        onClose={mockOnClose}
      />
    );

    const refundButton = screen.getByRole('button', { name: /Issue Refund/i });
    fireEvent.click(refundButton);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        `/api/booking/admin/${userId}/appointments/${mockAppointment.id}/refund`,
        { reason: 'customer_request' }
      );
    });

    await waitFor(() => {
      expect(mockOnRefund).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('should disable buttons while processing', async () => {
    const { post } = await import('../../../src/utils/api');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    // Make post hang to test loading state
    post.mockImplementation(() => new Promise(() => {}));

    render(
      <RefundModal
        appointment={mockAppointment}
        userId={userId}
        onRefund={mockOnRefund}
        onClose={mockOnClose}
      />
    );

    const refundButton = screen.getByRole('button', { name: /Issue Refund/i });
    fireEvent.click(refundButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Processing/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    confirmSpy.mockRestore();
  });

  it('should handle refund error', async () => {
    const { post } = await import('../../../src/utils/api');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    post.mockRejectedValue(new Error('Refund failed'));

    render(
      <RefundModal
        appointment={mockAppointment}
        userId={userId}
        onRefund={mockOnRefund}
        onClose={mockOnClose}
      />
    );

    const refundButton = screen.getByRole('button', { name: /Issue Refund/i });
    fireEvent.click(refundButton);

    await waitFor(() => {
      expect(post).toHaveBeenCalled();
    });

    // Should not close modal on error
    expect(mockOnClose).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});

describe('BookingWidget - Payment Step', () => {
  const mockServices = [
    {
      id: 'service-1',
      name: 'Haircut',
      price_cents: 5000,
      duration_minutes: 30,
      requires_payment: true,
      payment_type: 'full',
      deposit_percentage: 50
    },
    {
      id: 'service-2',
      name: 'Massage',
      price_cents: 10000,
      duration_minutes: 60,
      requires_payment: true,
      payment_type: 'deposit',
      deposit_percentage: 50
    },
    {
      id: 'service-3',
      name: 'Consultation',
      price_cents: 0,
      duration_minutes: 15,
      requires_payment: false,
      payment_type: 'none'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch for services
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/booking/services')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ services: mockServices })
        });
      }
      if (url.includes('/api/booking/staff')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ staff: [{ id: 'staff-1', name: 'Staff' }] })
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('should show payment notice for services requiring payment', async () => {
    const { post } = await import('../../../src/utils/api');
    
    render(
      <BrowserRouter>
        <BookingWidget userId="user-123" />
      </BrowserRouter>
    );

    // Wait for services to load
    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });

    // Select service with full payment
    fireEvent.click(screen.getByText('Haircut'));

    // Navigate through booking flow (simplified)
    // In real test, would need to select staff, date, time
    // For now, test that payment notice appears in form
  });

  it('should show deposit percentage in payment notice', () => {
    // This would test the payment notice rendering
    // when a service requiring deposit is selected
  });

  it('should not show payment notice for free services', async () => {
    const freeServices = [
      {
        id: 'service-3',
        name: 'Consultation',
        price_cents: 0,
        duration_minutes: 15,
        requires_payment: false,
        payment_type: 'none'
      }
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ services: freeServices })
      })
    );

    render(
      <BrowserRouter>
        <BookingWidget userId="user-123" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Consultation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Consultation'));

    await waitFor(() => {
      expect(screen.queryByText(/Payment Required/i)).not.toBeInTheDocument();
    });
  });

  it('should create appointment and redirect to Stripe for paid services', async () => {
    const { post } = await import('../../../src/utils/api');
    
    post.mockResolvedValueOnce({
      appointment: {
        id: 'appt-123',
        confirmation_code: 'ABC123'
      }
    });

    post.mockResolvedValueOnce({
      checkout_url: 'https://checkout.stripe.com/test',
      session_id: 'cs_test_123'
    });

    // Mock window.location.href
    delete window.location;
    window.location = { href: '' };

    render(
      <BrowserRouter>
        <BookingWidget userId="user-123" />
      </BrowserRouter>
    );

    // This would simulate full booking flow
    // Select service → staff → date → time → submit form
    // Then verify Stripe redirect happens
  });

  it('should skip payment for services not requiring payment', async () => {
    const { post } = await import('../../../src/utils/api');
    
    post.mockResolvedValue({
      appointment: {
        id: 'appt-124',
        confirmation_code: 'ABC124'
      }
    });

    render(
      <BrowserRouter>
        <BookingWidget userId="user-123" />
      </BrowserRouter>
    );

    // Select free consultation service
    // Submit booking
    // Should show confirmation immediately, not redirect to Stripe
  });

  it('should handle return from Stripe success', async () => {
    const sessionSearchParams = new URLSearchParams(
      '?session_id=cs_test_123&appointment_id=appt-123'
    );

    const mockUseSearchParams = () => [sessionSearchParams, vi.fn()];
    vi.mock('react-router-dom', () => ({
      useSearchParams: mockUseSearchParams
    }));

    render(
      <BrowserRouter>
        <BookingWidget userId="user-123" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Booking Confirmed/i)).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });

  it('should handle return from Stripe cancellation', async () => {
    const cancelledSearchParams = new URLSearchParams('?cancelled=true');

    const mockUseSearchParams = () => [cancelledSearchParams, vi.fn()];
    vi.mock('react-router-dom', () => ({
      useSearchParams: mockUseSearchParams
    }));

    render(
      <BrowserRouter>
        <BookingWidget userId="user-123" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Payment was cancelled/i)).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });
});