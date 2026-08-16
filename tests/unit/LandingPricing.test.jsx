/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Landing from '../../src/pages/Landing';
import { AuthContext } from '../../src/context/AuthContext';

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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLanding({ isAuthenticated = false } = {}) {
  return render(
    <BrowserRouter>
      <AuthContext.Provider
        value={{
          user: isAuthenticated ? { id: '1', name: 'Test User' } : null,
          loading: false,
          isAuthenticated,
          logout: vi.fn(),
        }}
      >
        <Landing />
      </AuthContext.Provider>
    </BrowserRouter>
  );
}

describe('Landing Page - Pricing', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the two published tiers', () => {
    renderLanding();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  it('displays the correct prices', () => {
    renderLanding();
    const prices = Array.from(document.querySelectorAll('.pricing-price')).map(
      (el) => el.textContent
    );
    expect(prices).toEqual(expect.arrayContaining([expect.stringContaining('10'), expect.stringContaining('35')]));
  });

  it('marks the Growth tier as the featured plan', () => {
    renderLanding();
    const cards = Array.from(document.querySelectorAll('.pricing-card'));
    const growthCard = cards.find((card) => card.textContent.includes('Growth'));
    expect(growthCard).toHaveClass('featured');

    const starterCard = cards.find((card) => card.textContent.includes('Starter'));
    expect(starterCard).not.toHaveClass('featured');
  });

  it('shows the starter tagline and features', () => {
    renderLanding();
    expect(screen.getByText('Get found')).toBeInTheDocument();
    expect(screen.getByText('Your website + templates')).toBeInTheDocument();
  });

  it('shows the growth tagline and features', () => {
    renderLanding();
    expect(screen.getByText('Get booked & paid')).toBeInTheDocument();
    expect(screen.getByText('Booking, cart & Stripe checkout')).toBeInTheDocument();
  });

  it('shows the trial note', () => {
    renderLanding();
    expect(screen.getByText(/7-day trial when you publish/i)).toBeInTheDocument();
  });

  it('pricing CTAs route unauthenticated users to register', () => {
    renderLanding();
    const ctas = screen.getAllByRole('link', { name: /Get Your Page Free/i });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((cta) => {
      expect(cta).toHaveAttribute('href', '/register');
    });
  });

  it('pricing CTAs route authenticated users to setup', () => {
    renderLanding({ isAuthenticated: true });
    const ctas = screen.getAllByRole('link', { name: /Create Your Page/i });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((cta) => {
      expect(cta).toHaveAttribute('href', '/setup');
    });
  });
});
