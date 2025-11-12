import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderDetailsModal from '../../src/components/orders/OrderDetailsModal';

describe('OrderDetailsModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdateStatus = vi.fn();

  const mockOrder = {
    orderId: 'ORD-12345',
    createdAt: '2024-01-15T10:30:00.000Z',
    status: 'new',
    paymentId: 'PAY-67890',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      address: '123 Main St, City, State 12345',
    },
    items: [
      {
        name: 'Product 1',
        description: 'Test product 1',
        quantity: 2,
        price: 2999, // in cents
      },
      {
        name: 'Product 2',
        quantity: 1,
        price: 4999,
      },
    ],
    total: 9997, // in cents
    tax: 899,
    shipping: 599,
    notes: 'Please deliver to the back door.',
  };

  const renderModal = (order = mockOrder) => {
    return render(
      <OrderDetailsModal
        order={order}
        onClose={mockOnClose}
        onUpdateStatus={mockOnUpdateStatus}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Structure', () => {
    it('should render modal', () => {
      renderModal();

      expect(screen.getByRole('heading', { name: /order details/i })).toBeInTheDocument();
    });

    it('should have close button', () => {
      renderModal();

      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderModal();

      const overlay = container.querySelector('.modal-overlay');
      await user.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when modal content clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderModal();

      const content = container.querySelector('.modal-content');
      await user.click(content);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Order Information', () => {
    it('should display order ID', () => {
      renderModal();

      expect(screen.getByText(/#ORD-12345/)).toBeInTheDocument();
    });

    it('should format and display date', () => {
      renderModal();

      // Check for formatted date with day of week
      expect(screen.getByText(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i)).toBeInTheDocument();
      expect(screen.getByText(/january|15|2024/i)).toBeInTheDocument();
    });

    it('should display status badge', () => {
      renderModal();

      const statusElements = screen.getAllByText('new');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('should display payment ID', () => {
      renderModal();

      expect(screen.getByText('PAY-67890')).toBeInTheDocument();
    });
  });

  describe('Customer Information', () => {
    it('should display customer name', () => {
      renderModal();

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display customer email as link', () => {
      renderModal();

      const emailLinks = screen.getAllByRole('link', { name: /john@example.com/i });
      expect(emailLinks.length).toBeGreaterThan(0);
      expect(emailLinks[0]).toHaveAttribute('href', 'mailto:john@example.com');
    });

    it('should display customer phone', () => {
      renderModal();

      const phoneLink = screen.getByRole('link', { name: /555-1234/i });
      expect(phoneLink).toBeInTheDocument();
      expect(phoneLink).toHaveAttribute('href', 'tel:555-1234');
    });

    it('should display customer address', () => {
      renderModal();

      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    });

    it('should handle missing phone gracefully', () => {
      const orderWithoutPhone = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          phone: null,
        },
      };
      renderModal(orderWithoutPhone);

      expect(screen.queryByRole('link', { name: /call customer/i })).not.toBeInTheDocument();
    });
  });

  describe('Order Items', () => {
    it('should display all items', () => {
      renderModal();

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });

    it('should show item descriptions', () => {
      renderModal();

      expect(screen.getByText('Test product 1')).toBeInTheDocument();
    });

    it('should show item quantities', () => {
      renderModal();

      expect(screen.getByText('×2')).toBeInTheDocument();
      expect(screen.getByText('×1')).toBeInTheDocument();
    });

    it('should format item prices', () => {
      const { container } = renderModal();

      // Check for individual item prices using class selector
      const itemPrices = container.querySelectorAll('.item-price');
      expect(itemPrices.length).toBe(2);
      expect(itemPrices[0]).toHaveTextContent('$29.99');
      expect(itemPrices[1]).toHaveTextContent('$49.99');
    });

    it('should calculate and show item totals', () => {
      renderModal();

      // Product 1: 2 × $29.99 = $59.98
      expect(screen.getByText('$59.98')).toBeInTheDocument();
    });
  });

  describe('Order Summary', () => {
    it('should show subtotal', () => {
      renderModal();

      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(screen.getAllByText('$99.97').length).toBeGreaterThan(0);
    });

    it('should show tax when present', () => {
      renderModal();

      expect(screen.getByText(/tax/i)).toBeInTheDocument();
      expect(screen.getByText('$8.99')).toBeInTheDocument();
    });

    it('should show shipping when present', () => {
      renderModal();

      expect(screen.getByText(/shipping/i)).toBeInTheDocument();
      expect(screen.getByText('$5.99')).toBeInTheDocument();
    });

    it('should show total', () => {
      renderModal();

      const totals = screen.getAllByText(/total/i);
      expect(totals.length).toBeGreaterThan(0);
    });
  });

  describe('Order Notes', () => {
    it('should display notes when present', () => {
      renderModal();

      expect(screen.getByText(/please deliver to the back door/i)).toBeInTheDocument();
    });

    it('should hide notes section when not present', () => {
      const orderWithoutNotes = { ...mockOrder, notes: null };
      renderModal(orderWithoutNotes);

      expect(screen.queryByText(/order notes/i)).not.toBeInTheDocument();
    });
  });

  describe('Status Actions', () => {
    it('should show action buttons for new orders', () => {
      renderModal();

      expect(screen.getByRole('button', { name: /mark as completed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument();
    });

    it('should hide action buttons for completed orders', () => {
      const completedOrder = { ...mockOrder, status: 'completed' };
      renderModal(completedOrder);

      expect(screen.queryByRole('button', { name: /mark as completed/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
    });

    it('should call onUpdateStatus with completed', async () => {
      const user = userEvent.setup();
      renderModal();

      const completeButton = screen.getByRole('button', { name: /mark as completed/i });
      await user.click(completeButton);

      expect(mockOnUpdateStatus).toHaveBeenCalledWith('ORD-12345', 'completed');
    });

    it('should call onUpdateStatus with cancelled', async () => {
      const user = userEvent.setup();
      renderModal();

      const cancelButton = screen.getByRole('button', { name: /cancel order/i });
      await user.click(cancelButton);

      expect(mockOnUpdateStatus).toHaveBeenCalledWith('ORD-12345', 'cancelled');
    });

    it('should close modal after status update', async () => {
      const user = userEvent.setup();
      renderModal();

      const completeButton = screen.getByRole('button', { name: /mark as completed/i });
      await user.click(completeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Contact Actions', () => {
    it('should have email customer button', () => {
      renderModal();

      const emailButton = screen.getByRole('link', { name: /email customer/i });
      expect(emailButton).toBeInTheDocument();
      expect(emailButton).toHaveAttribute('href', 'mailto:john@example.com');
    });

    it('should have call customer button', () => {
      renderModal();

      const callButton = screen.getByRole('link', { name: /call customer/i });
      expect(callButton).toBeInTheDocument();
      expect(callButton).toHaveAttribute('href', 'tel:555-1234');
    });

    it('should hide call button when no phone', () => {
      const orderWithoutPhone = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          phone: null,
        },
      };
      renderModal(orderWithoutPhone);

      expect(screen.queryByRole('link', { name: /call customer/i })).not.toBeInTheDocument();
    });
  });
});
