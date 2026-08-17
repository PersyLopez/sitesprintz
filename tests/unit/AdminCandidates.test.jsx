import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminCandidates from '../../src/pages/AdminCandidates';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';

vi.mock('../../src/hooks/useAuth');
vi.mock('../../src/hooks/useToast');
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));
vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('AdminCandidates', () => {
  let showError;
  let showSuccess;

  beforeEach(() => {
    showError = vi.fn();
    showSuccess = vi.fn();
    useAuth.mockReturnValue({ user: { id: 'admin1', role: 'admin' }, token: 'fake-token' });
    useToast.mockReturnValue({
      showSuccess,
      showError,
    });

    global.fetch = vi.fn((url) => {
      if (String(url).startsWith('/api/outreach/candidates')) {
        return Promise.resolve(jsonResponse({ candidates: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders finder and manual form', async () => {
    render(
      <MemoryRouter>
        <AdminCandidates />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /finder/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /someone i found/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Miami')).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByTestId('candidates-search')).toBeInTheDocument();
    expect(screen.getByTestId('candidates-manual-submit')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('name-only submit does not POST and shows an error toast', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminCandidates />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^name$/i), 'Jane Doe');
    await user.click(screen.getByTestId('candidates-manual-submit'));

    await waitFor(() => {
      expect(showError).toHaveBeenCalled();
    });
    const post = global.fetch.mock.calls.find(
      ([url, options]) => url === '/api/outreach/candidates' && options?.method === 'POST'
    );
    expect(post).toBeFalsy();
  });

  it('name+city submit POSTs /api/outreach/candidates', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminCandidates />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^name$/i), 'Jane Doe');
    await user.type(document.getElementById('manual-city'), 'Austin');
    await user.click(screen.getByTestId('candidates-manual-submit'));

    await waitFor(() => {
      const post = global.fetch.mock.calls.find(
        ([url, options]) => url === '/api/outreach/candidates' && options?.method === 'POST'
      );
      expect(post).toBeTruthy();
      expect(JSON.parse(post[1].body)).toMatchObject({ name: 'Jane Doe', city: 'Austin' });
    });
  });

  it('search button POSTs /api/outreach/search', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation((url, options) => {
      if (options?.method === 'POST' && url === '/api/outreach/search') {
        return Promise.resolve(jsonResponse({ candidates: [] }));
      }
      return Promise.resolve(jsonResponse({ candidates: [] }));
    });

    render(
      <MemoryRouter>
        <AdminCandidates />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Miami'), 'Miami');
    await user.click(screen.getByTestId('candidates-search'));

    await waitFor(() => {
      const searchCall = global.fetch.mock.calls.find(
        ([url, options]) => url === '/api/outreach/search' && options?.method === 'POST'
      );
      expect(searchCall).toBeTruthy();
      expect(JSON.parse(searchCall[1].body)).toMatchObject({ city: 'Miami' });
    });
  });

  it('shows create-prospect and claim URL after mock POST', async () => {
    const user = userEvent.setup();
    const queued = {
      id: 'cand-1',
      name: 'Riverside Cuts',
      address: '12 Main St',
      phone: '512-555-0100',
      niche: 'salon',
      score: 90,
      status: 'queued',
    };
    global.fetch.mockImplementation((url, options) => {
      if (options?.method === 'POST' && String(url).includes('/prospect')) {
        return Promise.resolve(
          jsonResponse(
            {
              siteId: 'riverside-cuts',
              subdomain: 'riverside-cuts',
              claimUrl: 'http://localhost:5173/claim/abcd',
              claimToken: 'abcd',
            },
            201
          )
        );
      }
      return Promise.resolve(jsonResponse({ candidates: [queued] }));
    });

    render(
      <MemoryRouter>
        <AdminCandidates />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('candidate-create-prospect')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('candidate-create-prospect'));

    await waitFor(() => {
      expect(screen.getByTestId('candidate-claim-url')).toHaveTextContent(
        'http://localhost:5173/claim/abcd'
      );
    });
  });
});
