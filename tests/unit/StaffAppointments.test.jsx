import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StaffAppointments from '../../src/pages/StaffAppointments';
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

function renderStaffAppointments() {
  return render(
    <MemoryRouter initialEntries={[`/staff/appointments/${tenantId}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/staff/appointments/:tenantId" element={<StaffAppointments />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('StaffAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows table skeleton while appointments are loading', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    renderStaffAppointments();

    expect(screen.getByText(/Loading appointments/i, { selector: '.sr-only' })).toBeInTheDocument();
    expect(document.querySelector('.skeleton-loader')).toBeInTheDocument();
  });
});