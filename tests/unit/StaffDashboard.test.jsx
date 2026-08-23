import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StaffDashboard from '../../src/pages/StaffDashboard';
import { StaffContext } from '../../src/context/StaffContext';
import { ToastProvider } from '../../src/context/ToastContext';

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, email: 'gallery@sitesprintz.com' },
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

vi.mock('../../src/services/api', () => ({
  default: { get: vi.fn() },
}));

const renderWithStaff = (staffValue) =>
  render(
    <BrowserRouter>
      <ToastProvider>
        <StaffContext.Provider value={staffValue}>
          <StaffDashboard />
        </StaffContext.Provider>
      </ToastProvider>
    </BrowserRouter>
  );

describe('StaffDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty-assignments UI when context finished with zero assignments', () => {
    renderWithStaff({
      assignments: [],
      selectedTenant: null,
      setSelectedTenant: vi.fn(),
      loading: false,
    });

    expect(screen.getByRole('heading', { name: /no staff assignments/i })).toBeInTheDocument();
    expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument();
  });

  it('shows loading spinner while staff context is loading', () => {
    renderWithStaff({
      assignments: [],
      selectedTenant: null,
      setSelectedTenant: vi.fn(),
      loading: true,
    });

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /no staff assignments/i })).not.toBeInTheDocument();
  });
});
