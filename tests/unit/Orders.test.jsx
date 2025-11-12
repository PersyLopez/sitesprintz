import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Orders from '../../src/pages/Orders';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastContext } from '../../src/context/ToastContext';

// Mock components
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>
}));

vi.mock('../../src/components/orders/OrderCard', () => ({
  default: ({ order, selected, onToggleSelect, onUpdateStatus, onViewDetails }) => (
    <div data-testid={`order-card-${order.orderId}`} className={selected ? 'selected' : ''}>
      <div>Order: {order.orderId}</div>
      <div>Customer: {order.customer?.name}</div>
      <div>Total: ${(order.total / 100).toFixed(2)}</div>
      <div>Status: {order.status}</div>
      <button onClick={onToggleSelect}>Select</button>
      <button onClick={() => onUpdateStatus(order.orderId, 'completed')}>Complete</button>
      <button onClick={onViewDetails}>View Details</button>
    </div>
  )
}));

vi.mock('../../src/components/orders/OrderDetailsModal', () => ({
  default: ({ order, onClose, onUpdateStatus }) => (
    <div data-testid="order-details-modal">
      <div>Details for: {order.orderId}</div>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onUpdateStatus(order.orderId, 'cancelled')}>Cancel Order</button>
    </div>
  )
}));

describe('Orders Page', () => {
  let mockAuthContext;
  let mockToastContext;
  let mockOrders;
  let fetchSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock orders data
    mockOrders = [
      {
        orderId: 'ORD-001',
        customer: { name: 'John Doe', email: 'john@example.com' },
        total: 5000, // $50.00
        status: 'new',
        createdAt: '2024-01-15T10:00:00Z',
        items: []
      },
      {
        orderId: 'ORD-002',
        customer: { name: 'Jane Smith', email: 'jane@example.com' },
        total: 7500, // $75.00
        status: 'completed',
        createdAt: '2024-01-14T09:00:00Z',
        items: []
      },
      {
        orderId: 'ORD-003',
        customer: { name: 'Bob Johnson', email: 'bob@example.com' },
        total: 3000, // $30.00
        status: 'cancelled',
        createdAt: '2024-01-13T08:00:00Z',
        items: []
      }
    ];

    // Mock auth context
    mockAuthContext = {
      user: { id: 1, email: 'test@example.com', role: 'user' },
      loading: false
    };

    // Mock toast context
    mockToastContext = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showInfo: vi.fn()
    };

    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => 'fake-token');

    // Mock fetch
    fetchSpy = vi.spyOn(global, 'fetch');
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: mockOrders })
    });

    // Mock window methods
    window.confirm = vi.fn(() => true);
    window.URL.createObjectURL = vi.fn(() => 'blob:url');
    window.URL.revokeObjectURL = vi.fn();
  });

  const renderOrders = (initialRoute = '/orders?siteId=123') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route 
            path="/orders" 
            element={
              <AuthContext.Provider value={mockAuthContext}>
                <ToastContext.Provider value={mockToastContext}>
                  <Orders />
                </ToastContext.Provider>
              </AuthContext.Provider>
            } 
          />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  // ============================================================
  // Page Display (5 tests)
  // ============================================================

  describe('Page Display', () => {
    it('should render orders page with header', async () => {
      renderOrders();
      
      expect(screen.getByTestId('header')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('📦 Orders')).toBeInTheDocument();
      });
    });

    it('should show order count', async () => {
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByText(/3 total orders/i)).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      renderOrders();
      
      expect(screen.getByText(/Loading orders/i)).toBeInTheDocument();
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('should show empty state when no site selected', async () => {
      renderOrders('/orders'); // No siteId
      
      await waitFor(() => {
        expect(screen.getByText('No Site Selected')).toBeInTheDocument();
        expect(screen.getByText(/Please select a site/i)).toBeInTheDocument();
      });
    });

    it('should have link to dashboard when no site', async () => {
      renderOrders('/orders');
      
      await waitFor(() => {
        const dashboardLink = screen.getByRole('link', { name: /Go to Dashboard/i });
        expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      });
    });
  });

  // ============================================================
  // Orders Display (6 tests)
  // ============================================================

  describe('Orders Display', () => {
    it('should display all orders', async () => {
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
        expect(screen.getByTestId('order-card-ORD-002')).toBeInTheDocument();
        expect(screen.getByTestId('order-card-ORD-003')).toBeInTheDocument();
      });
    });

    it('should show order cards with details', async () => {
      renderOrders();
      
      await waitFor(() => {
        const orderCard = screen.getByTestId('order-card-ORD-001');
        expect(within(orderCard).getByText('Order: ORD-001')).toBeInTheDocument();
        expect(within(orderCard).getByText('Customer: John Doe')).toBeInTheDocument();
      });
    });

    it('should format prices as currency', async () => {
      renderOrders();
      
      await waitFor(() => {
        const orderCard = screen.getByTestId('order-card-ORD-001');
        expect(within(orderCard).getByText('Total: $50.00')).toBeInTheDocument();
      });
    });

    it('should show customer information', async () => {
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByText('Customer: John Doe')).toBeInTheDocument();
        expect(screen.getByText('Customer: Jane Smith')).toBeInTheDocument();
      });
    });

    it('should handle empty orders list', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [] })
      });
      
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByText('No Orders Found')).toBeInTheDocument();
        expect(screen.getByText(/You haven't received any orders yet/i)).toBeInTheDocument();
      });
    });

    it('should show status for each order', async () => {
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByText('Status: new')).toBeInTheDocument();
        expect(screen.getByText('Status: completed')).toBeInTheDocument();
        expect(screen.getByText('Status: cancelled')).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Order Filtering (8 tests)
  // ============================================================

  describe('Order Filtering', () => {
    it('should filter by "all" status', async () => {
      renderOrders();
      
      const allButton = await screen.findByRole('button', { name: /All Orders/i });
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
        expect(screen.getByTestId('order-card-ORD-002')).toBeInTheDocument();
        expect(screen.getByTestId('order-card-ORD-003')).toBeInTheDocument();
      });
    });

    it('should filter by "new" status', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      const newButton = screen.getByRole('button', { name: /New Orders/i });
      await user.click(newButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
        expect(screen.queryByTestId('order-card-ORD-002')).not.toBeInTheDocument();
        expect(screen.queryByTestId('order-card-ORD-003')).not.toBeInTheDocument();
      });
    });

    it('should filter by "completed" status', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-002')).toBeInTheDocument();
      });
      
      const completedButton = screen.getByRole('button', { name: /^Completed/i });
      await user.click(completedButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('order-card-ORD-001')).not.toBeInTheDocument();
        expect(screen.getByTestId('order-card-ORD-002')).toBeInTheDocument();
        expect(screen.queryByTestId('order-card-ORD-003')).not.toBeInTheDocument();
      });
    });

    it('should filter by "cancelled" status', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-003')).toBeInTheDocument();
      });
      
      const cancelledButton = screen.getByRole('button', { name: /Cancelled/i });
      await user.click(cancelledButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('order-card-ORD-001')).not.toBeInTheDocument();
        expect(screen.queryByTestId('order-card-ORD-002')).not.toBeInTheDocument();
        expect(screen.getByTestId('order-card-ORD-003')).toBeInTheDocument();
      });
    });

    it('should show correct counts in filter badges', async () => {
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // All orders
      });
    });

    it('should update list when filter changes', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getAllByText(/Status:/i)).toHaveLength(3);
      });
      
      const newButton = screen.getByRole('button', { name: /New Orders/i });
      await user.click(newButton);
      
      await waitFor(() => {
        expect(screen.getAllByText(/Status:/i)).toHaveLength(1);
      });
    });

    it('should search by order ID', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/Search by order ID/i);
      await user.type(searchInput, 'ORD-001');
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
        expect(screen.queryByTestId('order-card-ORD-002')).not.toBeInTheDocument();
        expect(screen.queryByTestId('order-card-ORD-003')).not.toBeInTheDocument();
      });
    });

    it('should search by customer name/email', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-002')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/Search by order ID/i);
      await user.type(searchInput, 'Jane');
      
      await waitFor(() => {
        expect(screen.queryByTestId('order-card-ORD-001')).not.toBeInTheDocument();
        expect(screen.getByTestId('order-card-ORD-002')).toBeInTheDocument();
        expect(screen.queryByTestId('order-card-ORD-003')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Order Management (6 tests)
  // ============================================================

  describe('Order Management', () => {
    it('should update order status', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: { ...mockOrders[0], status: 'completed' } })
      });
      
      const orderCard = screen.getByTestId('order-card-ORD-001');
      const completeButton = within(orderCard).getByRole('button', { name: /Complete/i });
      await user.click(completeButton);
      
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/sites/123/orders/ORD-001',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed' })
          })
        );
      });
    });

    it('should show success message after update', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: { ...mockOrders[0], status: 'completed' } })
      });
      
      const orderCard = screen.getByTestId('order-card-ORD-001');
      const completeButton = within(orderCard).getByRole('button', { name: /Complete/i });
      await user.click(completeButton);
      
      await waitFor(() => {
        expect(mockToastContext.showSuccess).toHaveBeenCalledWith(
          expect.stringContaining('ORD-001')
        );
      });
    });

    it('should handle update errors', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' })
      });
      
      const orderCard = screen.getByTestId('order-card-ORD-001');
      const completeButton = within(orderCard).getByRole('button', { name: /Complete/i });
      await user.click(completeButton);
      
      await waitFor(() => {
        expect(mockToastContext.showError).toHaveBeenCalledWith('Failed to update order');
      });
    });

    it('should open order details modal', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      const orderCard = screen.getByTestId('order-card-ORD-001');
      const detailsButton = within(orderCard).getByRole('button', { name: /View Details/i });
      await user.click(detailsButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('order-details-modal')).toBeInTheDocument();
        expect(screen.getByText('Details for: ORD-001')).toBeInTheDocument();
      });
    });

    it('should select/deselect orders', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      const orderCard = screen.getByTestId('order-card-ORD-001');
      const selectButton = within(orderCard).getByRole('button', { name: /Select/i });
      await user.click(selectButton);
      
      await waitFor(() => {
        expect(orderCard).toHaveClass('selected');
      });
      
      await user.click(selectButton);
      
      await waitFor(() => {
        expect(orderCard).not.toHaveClass('selected');
      });
    });

    it('should clear selection', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      // Select an order
      const orderCard = screen.getByTestId('order-card-ORD-001');
      const selectButton = within(orderCard).getByRole('button', { name: /Select/i });
      await user.click(selectButton);
      
      await waitFor(() => {
        expect(screen.getByText(/orders selected/i)).toBeInTheDocument();
      });
      
      // Clear selection
      const clearButton = screen.getByRole('button', { name: /Clear Selection/i });
      await user.click(clearButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/orders selected/i)).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Bulk Operations (3 tests)
  // ============================================================

  describe('Bulk Operations', () => {
    it('should show bulk actions bar when orders selected', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      const orderCard = screen.getByTestId('order-card-ORD-001');
      const selectButton = within(orderCard).getByRole('button', { name: /Select/i });
      await user.click(selectButton);
      
      await waitFor(() => {
        expect(screen.getByText(/orders selected/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Mark Completed/i })).toBeInTheDocument();
      });
    });

    it('should mark multiple orders as completed', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      // Select two orders
      const order1 = screen.getByTestId('order-card-ORD-001');
      const order2 = screen.getByTestId('order-card-ORD-003');
      await user.click(within(order1).getByRole('button', { name: /Select/i }));
      await user.click(within(order2).getByRole('button', { name: /Select/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/orders selected/i)).toBeInTheDocument();
      });
      
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ order: { ...mockOrders[0], status: 'completed' } })
      });
      
      const completeButton = screen.getByRole('button', { name: /Mark Completed/i });
      await user.click(completeButton);
      
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/orders/ORD-001'),
          expect.objectContaining({ method: 'PATCH' })
        );
      });
    });

    it('should cancel multiple orders', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      // Select an order
      const order1 = screen.getByTestId('order-card-ORD-001');
      await user.click(within(order1).getByRole('button', { name: /Select/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/orders selected/i)).toBeInTheDocument();
      });
      
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: { ...mockOrders[0], status: 'cancelled' } })
      });
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Orders/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/orders/ORD-001'),
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled' })
          })
        );
      });
    });
  });

  // ============================================================
  // Export Functionality (2 tests)
  // ============================================================

  describe('Export Functionality', () => {
    it('should export orders to CSV', async () => {
      const user = userEvent.setup();
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /Export CSV/i });
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockToastContext.showSuccess).toHaveBeenCalledWith('Orders exported successfully');
      });
    });

    it('should include all order data in export', async () => {
      const user = userEvent.setup();
      const createElementSpy = vi.spyOn(document, 'createElement');
      renderOrders();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /Export CSV/i });
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
      });
      
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
