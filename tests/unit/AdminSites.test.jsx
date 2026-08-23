import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSites from '../../src/pages/AdminSites';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';

vi.mock('../../src/hooks/useAuth');
vi.mock('../../src/hooks/useToast');
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

describe('AdminSites Page', () => {
  const mockShowError = vi.fn();
  const mockSites = [
    {
      id: 'site-1',
      subdomain: 'bloom-petals',
      status: 'published',
      plan: 'growth',
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'site-2',
      subdomain: 'draft-shop',
      status: 'draft',
      plan: 'starter',
      createdAt: '2025-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    useAuth.mockReturnValue({ token: 'fake-token' });
    useToast.mockReturnValue({ showError: mockShowError });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sites: mockSites }),
    });
    global.localStorage = {
      getItem: vi.fn(() => 'fake-token'),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads sites from /api/admin/sites', async () => {
    render(
      <MemoryRouter>
        <AdminSites />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/sites',
        expect.objectContaining({
          headers: { Authorization: 'Bearer fake-token' },
        })
      );
    });

    expect(screen.getByTestId('sites-table')).toBeInTheDocument();
    expect(screen.getByText('bloom-petals')).toBeInTheDocument();
    expect(screen.getByText('draft-shop')).toBeInTheDocument();
  });

  it('shows an error when the sites request fails', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    render(
      <MemoryRouter>
        <AdminSites />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to load sites');
    });
  });
});
