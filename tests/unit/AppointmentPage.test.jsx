import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { ToastProvider } from '../../src/context/ToastContext';
import AppointmentPage from '../../src/pages/AppointmentPage';

// Keep the fetch pending forever so the loading state stays on screen.
vi.mock('../../src/utils/api', () => ({
  get: vi.fn(() => new Promise(() => {})),
  del: vi.fn(),
  post: vi.fn(),
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <AppointmentPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );

describe('AppointmentPage loading state', () => {
  it('shows a status region with the appointment loading message', () => {
    renderAt('/booking/appointment/ABC123');

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status.textContent).toContain('Loading appointment...');
  });
});

describe('AppointmentPage error state', () => {
  it('announces the failure as the level-1 heading when the request rejects', async () => {
    const { get } = await import('../../src/utils/api');
    get.mockRejectedValueOnce(new Error('network down'));

    renderAt('/booking/appointment/ABC123');

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Failed to load appointment details');
  });
});
