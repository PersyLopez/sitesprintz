import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

describe('Landing Page', () => {
  it('renders header, footer, and main content', () => {
    renderLanding();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('hero-story-video')).toBeInTheDocument();
  });

  it('renders the story-driven hero headline', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: /They love what you make/i })).toBeInTheDocument();
    expect(screen.getByText(/so people who already love what you do can come back/i)).toBeInTheDocument();
  });

  it('renders brand as a hero-level signal', () => {
    renderLanding();
    const brand = document.querySelector('.hero-brand');
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveTextContent('SiteSprintz');
  });

  it('renders the primary CTA for unauthenticated visitors', () => {
    renderLanding();
    const hero = document.querySelector('.landing-hero');
    const heroCta = within(hero).getByRole('link', { name: /Get Your Page Free/i });
    expect(heroCta).toHaveAttribute('href', '/register');
  });

  it('renders the primary CTA for authenticated users', () => {
    renderLanding({ isAuthenticated: true });
    const hero = document.querySelector('.landing-hero');
    const heroCta = within(hero).getByRole('link', { name: /Create Your Page/i });
    expect(heroCta).toHaveAttribute('href', '/setup');
  });

  it('renders the customer stories section', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: /They had regulars\. Tomorrow nobody could find them\./i })).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText('James')).toBeInTheDocument();
    expect(screen.getByText('Aisha')).toBeInTheDocument();
  });

  it('renders each customer story with a before, turning point, and after', () => {
    renderLanding();
    const stories = document.getElementById('stories');
    expect(stories.querySelectorAll('.story-card').length).toBe(3);
    expect(screen.getByText(/Forgotten by noon/i)).toBeInTheDocument();
    expect(screen.getByText(/Empty chair, busy street/i)).toBeInTheDocument();
    expect(screen.getByText(/DMs instead of a door/i)).toBeInTheDocument();
    expect(screen.getByText(/sold out of mangoes by 10/i)).toBeInTheDocument();
    expect(screen.getByText(/remember which corner/i)).toBeInTheDocument();
    expect(screen.getByText(/Marcus waved through the window/i)).toBeInTheDocument();
    expect(screen.getByText(/today’s fruit/i)).toBeInTheDocument();
    expect(stories.querySelectorAll('.story-phase').length).toBe(0);
    expect(stories.querySelectorAll('.story-arc-label').length).toBeGreaterThanOrEqual(3);
  });

  it('renders the purpose story section', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: /Leave a light on for tomorrow’s customer/i })).toBeInTheDocument();
    expect(screen.getByText(/We built SiteSprintz so the smallest shop/i)).toBeInTheDocument();
  });

  it('renders the founder story block', () => {
    renderLanding();
    const purpose = document.getElementById('purpose');
    expect(screen.getByText(/Who we built this for/i)).toBeInTheDocument();
    expect(within(purpose).getByText(/We didn’t start this for agencies/i)).toBeInTheDocument();
    expect(within(purpose).getByText(/Maria, James, and Aisha/i)).toBeInTheDocument();
  });

  it('renders the template gallery section', () => {
    renderLanding();
    expect(screen.getByTestId('landing-gallery')).toBeInTheDocument();
  });

  it('renders the how-it-works section with all steps visible', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: /Three steps\. Then you’re findable\./i })).toBeInTheDocument();

    const howSection = document.getElementById('how-it-works');
    const stepTitles = Array.from(howSection.querySelectorAll('h3')).map((h) => h.textContent);
    expect(stepTitles).toContain('Tell us what you sell');
    expect(stepTitles).toContain('Show what customers need');
    expect(stepTitles).toContain('Share your link');
    expect(howSection.querySelectorAll('.how-arc-step').length).toBe(3);
  });

  it('renders the pricing section with three tiers', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: /Three plans\. Pick how you run it\./i })).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Growth Managed')).toBeInTheDocument();
  });

  it('renders the final CTA section', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: /Don’t let tomorrow’s customer forget you/i })).toBeInTheDocument();
  });

  it('has a jump nav linking to each major section', () => {
    renderLanding();
    const nav = screen.getByRole('navigation', { name: /Page sections/i });
    expect(nav).toBeInTheDocument();

    const chips = within(nav).getAllByRole('button');
    const labels = chips.map((chip) => chip.textContent);
    expect(labels).toEqual(['Stories', 'Purpose', 'Templates', 'How it works', 'Pricing']);
  });

  it('has a proper heading hierarchy', () => {
    renderLanding();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/They love what you make/i);

    const h2Headings = screen.getAllByRole('heading', { level: 2 });
    expect(h2Headings.length).toBeGreaterThanOrEqual(4);
  });

  it('renders the trust indicators in the trust strip', () => {
    renderLanding();
    const trustStrip = document.querySelector('.trust-strip-inner');
    expect(trustStrip).toBeInTheDocument();
    expect(within(trustStrip).getByText('Draft free')).toBeInTheDocument();
    expect(within(trustStrip).getByText('Preview fast')).toBeInTheDocument();
    expect(within(trustStrip).getByText('Cancel anytime')).toBeInTheDocument();
  });
});
