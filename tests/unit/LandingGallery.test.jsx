/**
 * Tests for LandingGallery component
 *
 * Seams:
 *   1. Renders all templates by default
 *   2. Category tabs filter correctly
 *   3. Section preview renders blocks per template
 *   4. Tags render on each card
 *   5. "See all" link present
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingGallery from '../../src/components/landing/LandingGallery';

// Mock useAuth
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

function renderGallery() {
  return render(
    <MemoryRouter>
      <LandingGallery />
    </MemoryRouter>
  );
}

describe('LandingGallery', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sites: [], total: 0 }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('renders all templates by default', () => {
    renderGallery();
    expect(screen.getByTestId('gallery-card-salon')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-restaurant')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-gym')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-consultant')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-freelancer')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-cleaning')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-electrician')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-auto-repair')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-pet-care')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-plumbing')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-tech-repair')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-tow-truck')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-product-showcase')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-product-ordering')).toBeTruthy();
  });

  it('renders category tabs', () => {
    renderGallery();
    expect(screen.getByTestId('gallery-tab-all')).toBeTruthy();
    expect(screen.getByTestId('gallery-tab-service')).toBeTruthy();
    expect(screen.getByTestId('gallery-tab-food')).toBeTruthy();
    expect(screen.getByTestId('gallery-tab-professional')).toBeTruthy();
    expect(screen.getByTestId('gallery-tab-shop')).toBeTruthy();
  });

  it('All tab is active by default', () => {
    renderGallery();
    expect(screen.getByTestId('gallery-tab-all').getAttribute('aria-selected')).toBe('true');
  });

  it('clicking Service tab filters to service templates', () => {
    renderGallery();
    fireEvent.click(screen.getByTestId('gallery-tab-service'));
    expect(screen.getByTestId('gallery-tab-service').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('gallery-card-salon')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-gym')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-cleaning')).toBeTruthy();
    // Food and professional should be gone
    expect(() => screen.getByTestId('gallery-card-restaurant')).toThrow();
    expect(() => screen.getByTestId('gallery-card-consultant')).toThrow();
  });

  it('clicking Food tab filters to food templates', () => {
    renderGallery();
    fireEvent.click(screen.getByTestId('gallery-tab-food'));
    expect(screen.getByTestId('gallery-card-restaurant')).toBeTruthy();
    expect(() => screen.getByTestId('gallery-card-salon')).toThrow();
  });

  it('clicking Professional tab filters to professional templates', () => {
    renderGallery();
    fireEvent.click(screen.getByTestId('gallery-tab-professional'));
    expect(screen.getByTestId('gallery-card-consultant')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-freelancer')).toBeTruthy();
    expect(() => screen.getByTestId('gallery-card-salon')).toThrow();
    expect(() => screen.getByTestId('gallery-card-restaurant')).toThrow();
  });

  it('clicking Shop tab filters to shop templates', () => {
    renderGallery();
    fireEvent.click(screen.getByTestId('gallery-tab-shop'));
    expect(screen.getByTestId('gallery-tab-shop').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('gallery-card-product-showcase')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-product-ordering')).toBeTruthy();
    expect(() => screen.getByTestId('gallery-card-salon')).toThrow();
    expect(() => screen.getByTestId('gallery-card-restaurant')).toThrow();
  });

  it('clicking All tab restores all templates', () => {
    renderGallery();
    fireEvent.click(screen.getByTestId('gallery-tab-service'));
    expect(() => screen.getByTestId('gallery-card-restaurant')).toThrow();
    fireEvent.click(screen.getByTestId('gallery-tab-all'));
    expect(screen.getByTestId('gallery-card-restaurant')).toBeTruthy();
    expect(screen.getByTestId('gallery-card-salon')).toBeTruthy();
  });

  it('each card has section preview blocks', () => {
    const { container } = renderGallery();
    const cards = container.querySelectorAll('.gl-card');
    expect(cards.length).toBe(14);
    // Each card should have section blocks
    for (const card of cards) {
      const blocks = card.querySelectorAll('.gl-section-block');
      expect(blocks.length).toBeGreaterThan(0);
    }
  });

  it('each card has tags', () => {
    renderGallery();
    // Check salon card has tags
    const salonCard = screen.getByTestId('gallery-card-salon');
    const tags = salonCard.querySelectorAll('.gl-tag');
    expect(tags.length).toBe(3);
    expect(tags[0].textContent).toBe('Hair');
  });

  it('renders link to the full showcase gallery', () => {
    renderGallery();
    expect(screen.getByTestId('landing-gallery-showcase-link')).toHaveAttribute('href', '/showcase');
    expect(screen.getByText(/Browse example sites/i)).toBeTruthy();
  });

  it('card example link goes to niche showcase when not authenticated', () => {
    renderGallery();
    const salonExample = screen.getByTestId('gallery-card-salon-example');
    expect(salonExample.getAttribute('href')).toBe('/showcase/gallery-salon');
  });

  it('card use-this-look link goes to /register with template when not authenticated', () => {
    renderGallery();
    const salonUse = screen.getByTestId('gallery-card-salon-use');
    expect(salonUse.getAttribute('href')).toBe('/register?template=salon');
  });
});
