import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublishedSiteViewer from '../../src/pages/PublishedSiteViewer';
import { useAuth } from '../../src/hooks/useAuth';
import { buildLiveSiteMarkup } from '../../src/utils/publishedSiteDocument';

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
  buildLiveSiteMarkup: vi.fn(() => ({
    html: '<main><div class="ss-booking-mount" data-ss-booking-mount data-testid="live-booking-widget"></div></main>',
    css: '.ss-brand { font-family: "Fraunces", serif; }',
    tokens: { theme: {} },
  })),
  getLiveSiteThemeVars: vi.fn(() => ({})),
}));

vi.mock('../../src/utils/visitorExperience', () => ({
  siteWantsEmbeddedBooking: () => true,
  siteWantsNativeBooking: () => true,
  siteFeesEnabled: () => false,
  subdomainFromLivePath: () => 'gallery-salon',
  livePublishedPath: (subdomain) => `/view/${subdomain}`,
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
    document.getElementById('ss-live-fonts')?.remove();
    delete window.__RSL_PUBLISHED_HTML__;
    delete window.__RSL_PUBLISHED_SITE__;
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

    expect(document.title).toBe('Luxe Beauty Studio');

    const fontLink = document.getElementById('ss-live-fonts');
    expect(fontLink).toBeTruthy();
    expect(fontLink.media).toBe('print');
    expect(fontLink.href).toContain('family=Fraunces');
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
    expect(screen.getByTestId('seamless-edit-scope').textContent).toMatch(/outlined text/i);
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

  it('keeps the server paint and does not compose again when the locale matches', async () => {
    window.__RSL_PUBLISHED_SITE__ = {
      site: {
        id: 'luxe-beauty-studio',
        subdomain: 'gallery-salon',
        name: 'Luxe Beauty Studio',
        userId: 'owner-1',
        data: { settings: { allowCheckout: false }, sections: [{ type: 'booking' }] },
      },
    };
    window.__RSL_PUBLISHED_HTML__ = [
      '<style id="ss-prerender">.ss-live { --ss-bg: #111111; --ss-text: #ffffff; --ss-accent: #c2683a; }</style>',
      '<div class="ss-live"><h1>Prerendered shop</h1></div>',
    ].join('');

    renderViewer();

    expect(await screen.findByText('Prerendered shop')).toBeInTheDocument();
    expect(buildLiveSiteMarkup).not.toHaveBeenCalled();
    expect(document.getElementById('ss-live-fonts')).toBeNull();
  });
});
