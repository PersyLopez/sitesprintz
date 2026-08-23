import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublishedSiteViewer from '../../src/pages/PublishedSiteViewer';
import { useAuth } from '../../src/hooks/useAuth';

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false, loading: false })),
}));

vi.mock('../../src/components/BookingWidget', () => ({
  default: () => <div data-testid="booking-widget">Book</div>,
}));

vi.mock('../../src/components/BookingWidget', () => ({
  default: () => <div data-testid="booking-widget">Book</div>,
}));

vi.mock('../../src/components/ecommerce/ShoppingCart', () => ({
  default: () => null,
}));

vi.mock('../../src/hooks/useCart', () => ({
  useCart: () => ({ clearCart: vi.fn(), addToCart: vi.fn() }),
}));

vi.mock('../../src/context/CartContext', () => ({
  CartProvider: ({ children }) => children,
}));

vi.mock('../../src/utils/publishedSiteDocument', () => ({
  buildLiveSiteMarkup: () => ({
    html: '<main><div class="ss-booking-mount" data-ss-booking-mount data-testid="live-booking-widget"></div></main>',
    css: '',
    tokens: { theme: {} },
  }),
  getLiveSiteThemeVars: () => ({}),
}));

vi.mock('../../src/utils/visitorExperience', () => ({
  siteWantsEmbeddedBooking: () => true,
  siteWantsNativeBooking: () => true,
  subdomainFromLivePath: () => 'gallery-salon',
}));

function renderViewer(entry = '/view/gallery-salon') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/view/:subdomain" element={<PublishedSiteViewer />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PublishedSiteViewer booking portal', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        site: {
          id: 'luxe-beauty-studio',
          subdomain: 'gallery-salon',
          name: 'Luxe Beauty Studio',
          userId: 'owner-1',
          data: {
            settings: { allowCheckout: false },
            sections: [{ type: 'booking' }],
          },
        },
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the booking widget inside the live mount after re-render', async () => {
    renderViewer();

    await waitFor(() => {
      const mount = document.querySelector('[data-ss-booking-mount]');
      expect(mount).toBeTruthy();
      expect(mount.querySelector('[data-testid="booking-widget"]')).toBeTruthy();
    });

    expect(screen.getByTestId('booking-widget')).toBeInTheDocument();
    expect(screen.getByTestId('live-booking-widget').textContent).toContain('Book');
  });

  it('shows the edit toolbar for the owner in edit mode', async () => {
    useAuth.mockReturnValue({
      user: { id: 'owner-1', email: 'growth@example.com' },
      isAuthenticated: true,
      loading: false,
    });
    renderViewer('/view/gallery-salon?edit=true');

    await waitFor(() => {
      expect(screen.getByTestId('seamless-edit-toolbar')).toBeInTheDocument();
    });
    expect(screen.getByTestId('seamless-edit-save-state').textContent).toMatch(/saved/i);
  });

  it('shows the edit toolbar for admin who is not the owner', async () => {
    useAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'admin', email: 'admin@example.com' },
      isAuthenticated: true,
      loading: false,
    });
    renderViewer('/view/gallery-salon?edit=true');

    await waitFor(() => {
      expect(screen.getByTestId('seamless-edit-toolbar')).toBeInTheDocument();
    });
  });
});
