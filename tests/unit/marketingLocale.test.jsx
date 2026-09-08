import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../../src/pages/Landing';
import { AuthContext } from '../../src/context/AuthContext';
import { LocaleProvider } from '../../src/i18n/LocaleContext.jsx';
import LanguageSwitcher from '../../src/components/i18n/LanguageSwitcher.jsx';
import en from '../../src/i18n/marketing/en.js';
import es from '../../src/i18n/marketing/es.js';

vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock('../../src/components/landing/HeroStoryVideo', () => ({
  default: () => <div data-testid="hero-story-video">Hero video</div>,
}));

vi.mock('../../src/components/landing/LandingGallery', () => ({
  default: () => <section id="templates" data-testid="landing-gallery">Gallery</section>,
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <AuthContext.Provider
          value={{
            user: null,
            loading: false,
            isAuthenticated: false,
            logout: vi.fn(),
          }}
        >
          <LanguageSwitcher />
          <Landing />
        </AuthContext.Provider>
      </LocaleProvider>
    </MemoryRouter>
  );
}

describe('marketing language switcher', () => {
  it('keeps guest CTA labels aligned across marketing surfaces', () => {
    expect(en['nav.getStarted']).toBe('Get Your Page Free');
    expect(en['landing.cta.guest']).toBe(en['nav.getStarted']);
    expect(en['showcase.cta.guest']).toBe(en['nav.getStarted']);
    expect(es['nav.getStarted']).toBe('Obtén tu página gratis');
    expect(es['landing.cta.guest']).toBe(es['nav.getStarted']);
    expect(es['showcase.cta.guest']).toBe(es['nav.getStarted']);
  });

  it('keeps authenticated showcase CTA aligned with landing', () => {
    expect(en['showcase.cta.auth']).toBe(en['landing.cta.auth']);
    expect(es['showcase.cta.auth']).toBe(es['landing.cta.auth']);
  });

  it('keeps Landing copy in English by default', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: /They love what you make/i })).toBeInTheDocument();
    expect(screen.getByTestId('language-switcher-en')).toHaveAttribute('aria-pressed', 'true');
  });

  it('flips Landing copy to Spanish', async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(screen.getByTestId('language-switcher-es'));
    expect(await screen.findByRole('heading', { name: /Les encanta lo que haces/i })).toBeInTheDocument();
    expect(screen.getByTestId('language-switcher-es')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render the switcher on untranslated owner routes', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <LocaleProvider>
          <LanguageSwitcher />
        </LocaleProvider>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('language-switcher')).not.toBeInTheDocument();
  });
});
