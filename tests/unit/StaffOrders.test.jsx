import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StaffOrders from '../../src/pages/StaffOrders';
import { StaffContext } from '../../src/context/StaffContext';
import { ToastProvider } from '../../src/context/ToastContext';

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'staff-user-1' },
    isAuthenticated: true,
  })),
}));

vi.mock('../../src/components/layout/Header', () => ({
  default: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <footer data-testid="mock-footer">Footer</footer>,
}));

vi.mock('../../src/hooks/usePolling', () => ({
  usePolling: vi.fn(() => ({ data: null, lastUpdated: null })),
}));

const mockGet = vi.fn();
vi.mock('../../src/services/api', () => ({
  default: { get: (...args) => mockGet(...args) },
}));

const tenantId = 'tenant-abc';

function renderStaffOrders(staffValue, orders = []) {
  mockGet.mockResolvedValue({ orders });

  return render(
    <MemoryRouter initialEntries={[`/staff/orders/${tenantId}`]}>
      <ToastProvider>
        <StaffContext.Provider value={staffValue}>
          <Routes>
            <Route path="/staff/orders/:tenantId" element={<StaffOrders />} />
          </Routes>
        </StaffContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const assignedStaff = {
  assignments: [{
    tenantId,
    role: 'staff',
    permissions: { canViewOrders: true },
  }],
  loading: false,
};

describe('StaffOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows not-assigned message when tenant is not in assignments', () => {
    renderStaffOrders({
      assignments: [{ tenantId: 'other-tenant', permissions: { canViewOrders: true } }],
      loading: false,
    });

    expect(screen.getByRole('heading', { name: /not assigned to this business/i })).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('shows only today orders for assigned tenant', async () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    renderStaffOrders(assignedStaff, [
      { id: '1', status: 'new', total: 10, created_at: today, customer_name: 'Today Customer' },
      { id: '2', status: 'new', total: 20, created_at: yesterday, customer_name: 'Yesterday Customer' },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Today Customer')).toBeInTheDocument();
    });

    expect(screen.queryByText('Yesterday Customer')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /today's orders/i })).toBeInTheDocument();
  });

  it('shows today empty state when no orders match', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    renderStaffOrders(assignedStaff, [
      { id: '2', status: 'new', total: 20, created_at: yesterday, customer_name: 'Yesterday Customer' },
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('staff-orders-empty')).toBeInTheDocument();
    });
  });
});
