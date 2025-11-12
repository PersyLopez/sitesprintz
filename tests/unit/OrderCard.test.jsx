import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderCard from '../../src/components/orders/OrderCard';

describe('OrderCard Component', () => {
  const mockOnToggleSelect = vi.fn();
  const mockOnUpdateStatus = vi.fn();
  const mockOnViewDetails = vi.fn();

  const mockOrder = {
    orderId: 'ORD-12345',
    createdAt: '2024-01-15T10:30:00.000Z',
    status: 'new',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
    },
    items: [
      {
        name: 'Product 1',
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
  };

  const renderOrderCard = (order = mockOrder, selected = false) => {
    return render(
      <OrderCard
        order={order}
        selected={selected}
        onToggleSelect={mockOnToggleSelect}
        onUpdateStatus={mockOnUpdateStatus}
        onViewDetails={mockOnViewDetails}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display', () => {
    it('should render order card', () => {
      renderOrderCard();

      expect(screen.getByText(/#ORD-12345/)).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display order ID', () => {
      renderOrderCard();

      expect(screen.getByText(/#ORD-12345/)).toBeInTheDocument();
    });

    it('should format and display date', () => {
      renderOrderCard();

      const dateElement = screen.getByText(/Jan 15, 2024/);
      expect(dateElement).toBeInTheDocument();
    });

    it('should format total as currency', () => {
      renderOrderCard();

      const totalElement = screen.getByText('$99.97');
      expect(totalElement).toBeInTheDocument();
    });
  });

  describe('Customer Information', () => {
    it('should display customer name', () => {
      renderOrderCard();

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display customer email as link', () => {
      renderOrderCard();

      const emailLinks = screen.getAllByRole('link', { name: /john@example.com/i });
      expect(emailLinks.length).toBeGreaterThan(0);
      expect(emailLinks[0]).toHaveAttribute('href', 'mailto:john@example.com');
    });

    it('should display customer phone', () => {
      renderOrderCard();

      const phoneLink = screen.getByRole('link', { name: /555-1234/i });
      expect(phoneLink).toBeInTheDocument();
      expect(phoneLink).toHaveAttribute('href', 'tel:555-1234');
    });

    it('should handle missing phone gracefully', () => {
      const orderWithoutPhone = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          phone: null,
        },
      };

      renderOrderCard(orderWithoutPhone);

      expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument();
    });

    it('should show Guest when no customer name', () => {
      const guestOrder = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          name: null,
        },
      };

      renderOrderCard(guestOrder);

      expect(screen.getByText('Guest')).toBeInTheDocument();
    });
  });

  describe('Order Items', () => {
    it('should display all items', () => {
      renderOrderCard();

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });

    it('should show item quantities', () => {
      renderOrderCard();

      expect(screen.getByText('×2')).toBeInTheDocument();
      expect(screen.getByText('×1')).toBeInTheDocument();
    });

    it('should format item prices', () => {
      renderOrderCard();

      expect(screen.getByText('$59.98')).toBeInTheDocument(); // Product 1: 2 × $29.99
      expect(screen.getByText('$49.99')).toBeInTheDocument(); // Product 2: 1 × $49.99
    });
  });

  describe('Status Display', () => {
    it('should show new status with icon', () => {
      renderOrderCard();

      expect(screen.getByText('🔔')).toBeInTheDocument();
      expect(screen.getByText('new')).toBeInTheDocument();
    });

    it('should show completed status with icon', () => {
      const completedOrder = { ...mockOrder, status: 'completed' };
      renderOrderCard(completedOrder);

      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should show cancelled status with icon', () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' };
      renderOrderCard(cancelledOrder);

      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText('cancelled')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should render checkbox', () => {
      renderOrderCard();

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should show selected state', () => {
      renderOrderCard(mockOrder, true);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should call onToggleSelect when checkbox clicked', async () => {
      const user = userEvent.setup();
      renderOrderCard();

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockOnToggleSelect).toHaveBeenCalledTimes(1);
    });

    it('should apply selected class when selected', () => {
      const { container } = renderOrderCard(mockOrder, true);

      const orderCard = container.querySelector('.order-card');
      expect(orderCard).toHaveClass('selected');
    });
  });

  describe('Actions', () => {
    it('should have view details button', () => {
      renderOrderCard();

      const viewButton = screen.getByRole('button', { name: /view details/i });
      expect(viewButton).toBeInTheDocument();
    });

    it('should call onViewDetails when clicked', async () => {
      const user = userEvent.setup();
      renderOrderCard();

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewButton);

      expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
    });

    it('should show status action buttons for new orders', () => {
      renderOrderCard();

      expect(screen.getByRole('button', { name: /mark completed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should hide status buttons for completed orders', () => {
      const completedOrder = { ...mockOrder, status: 'completed' };
      renderOrderCard(completedOrder);

      expect(screen.queryByRole('button', { name: /mark completed/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should call onUpdateStatus with completed', async () => {
      const user = userEvent.setup();
      renderOrderCard();

      const completeButton = screen.getByRole('button', { name: /mark completed/i });
      await user.click(completeButton);

      expect(mockOnUpdateStatus).toHaveBeenCalledWith('ORD-12345', 'completed');
    });

    it('should call onUpdateStatus with cancelled', async () => {
      const user = userEvent.setup();
      renderOrderCard();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnUpdateStatus).toHaveBeenCalledWith('ORD-12345', 'cancelled');
    });

    it('should have email button', () => {
      renderOrderCard();

      const emailLink = screen.getByRole('link', { name: /email/i });
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute('href', 'mailto:john@example.com');
    });

    it('should have call button when phone provided', () => {
      renderOrderCard();

      const callLink = screen.getByRole('link', { name: /call/i });
      expect(callLink).toBeInTheDocument();
      expect(callLink).toHaveAttribute('href', 'tel:555-1234');
    });
  });
});
