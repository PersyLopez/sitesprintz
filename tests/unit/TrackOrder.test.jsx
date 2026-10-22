import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TrackOrder from '../../src/pages/TrackOrder';
import { ToastProvider } from '../../src/context/ToastContext';

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

function renderTrackOrder() {
  return render(
    <MemoryRouter initialEntries={['/track-order/token-abc']}>
      <ToastProvider>
        <Routes>
          <Route path="/track-order/:token" element={<TrackOrder />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('TrackOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows table skeleton while order details are loading', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    renderTrackOrder();

    expect(screen.getByText(/Loading order details/i, { selector: '.sr-only' })).toBeInTheDocument();
    expect(document.querySelector('.skeleton-loader')).toBeInTheDocument();
  });
});
