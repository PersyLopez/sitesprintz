import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TrackAppointment from '../../src/pages/TrackAppointment';
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

function renderTrackAppointment() {
  return render(
    <MemoryRouter initialEntries={['/track-appointment/code-abc']}>
      <ToastProvider>
        <Routes>
          <Route path="/track-appointment/:code" element={<TrackAppointment />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('TrackAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows table skeleton while appointment details are loading', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    renderTrackAppointment();

    expect(screen.getByText(/Loading appointment details/i, { selector: '.sr-only' })).toBeInTheDocument();
    expect(document.querySelector('.skeleton-loader')).toBeInTheDocument();
  });
});
