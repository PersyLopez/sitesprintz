import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminPlanFeatures from '../../src/pages/AdminPlanFeatures';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';
import { FEATURES } from '../../src/utils/planFeatures';

vi.mock('../../src/hooks/useAuth');
vi.mock('../../src/hooks/useToast');
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));
vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

const apiPlanFeatures = {
  trial: [FEATURES.CONTACT_FORMS],
  starter: [FEATURES.CONTACT_FORMS, FEATURES.STAFF_PROFILES],
  growth: [FEATURES.CONTACT_FORMS, FEATURES.STAFF_PROFILES, FEATURES.STRIPE_CHECKOUT],
};

describe('AdminPlanFeatures Page', () => {
  let mockShowSuccess;
  let mockShowError;

  beforeEach(() => {
    mockShowSuccess = vi.fn();
    mockShowError = vi.fn();

    useAuth.mockReturnValue({ token: 'admin-token' });
    useToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });

    global.fetch = vi.fn();
    global.localStorage = {
      getItem: vi.fn(() => 'admin-token'),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads plan features from GET and enables save', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, planFeatures: apiPlanFeatures }),
    });

    render(
      <MemoryRouter>
        <AdminPlanFeatures />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/plan-features',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
        }),
      })
    );

    expect(screen.getByText('1 features')).toBeInTheDocument();
    expect(screen.getByText('2 features')).toBeInTheDocument();
    expect(screen.getByText('3 features')).toBeInTheDocument();
    expect(screen.getByText(/Growth Managed uses the same software features as Growth/i)).toBeInTheDocument();
    expect(screen.queryByText(/Growth_managed/i)).not.toBeInTheDocument();
  });

  it('saves with PUT then reloads via GET without throwing', async () => {
    const user = userEvent.setup();

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, planFeatures: apiPlanFeatures }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Plan features updated successfully',
          planFeatures: apiPlanFeatures,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, planFeatures: apiPlanFeatures }),
      });

    render(
      <MemoryRouter>
        <AdminPlanFeatures />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('Plan features updated successfully');
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/admin/plan-features',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ planFeatures: apiPlanFeatures }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/admin/plan-features',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
        }),
      })
    );
  });

  it('handles GET 500 with defaults and no spinner hang', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch plan features' }),
    });

    render(
      <MemoryRouter>
        <AdminPlanFeatures />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading plan features/i)).not.toBeInTheDocument();
    });

    expect(mockShowError).toHaveBeenCalledWith('Failed to load plan features');
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
    expect(screen.getByRole('heading', { name: /plan features configuration/i })).toBeInTheDocument();
  });
});
