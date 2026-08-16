/**
 * Tests for LevelSelector.jsx — TDD red-green cycles
 *
 * Seams tested (component behavior):
 *   1. Renders three level cards (Solo / Studio / Established)
 *   2. Each card shows name, description, and sections it includes
 *   3. Calls onChange(levelKey) when a card is clicked
 *   4. Shows a "Recommended" badge on the suggested level when siteData is provided
 *   5. Shows no badge when siteData is omitted
 *   6. Highlights the selected level
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LevelSelector from '../../src/components/setup/LevelSelector';

describe('LevelSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three level cards with data-testid attributes', () => {
    render(<LevelSelector onChange={() => {}} />);

    expect(screen.getByTestId('level-solo')).toBeTruthy();
    expect(screen.getByTestId('level-studio')).toBeTruthy();
    expect(screen.getByTestId('level-established')).toBeTruthy();
  });

  it('each card shows the level name', () => {
    render(<LevelSelector onChange={() => {}} />);

    expect(screen.getByText('Solo')).toBeTruthy();
    expect(screen.getByText('Studio')).toBeTruthy();
    expect(screen.getByText('Established')).toBeTruthy();
  });

  it('each card shows a description', () => {
    render(<LevelSelector onChange={() => {}} />);

    // Each card should have descriptive text (not just the name)
    const solo = screen.getByTestId('level-solo');
    const studio = screen.getByTestId('level-studio');
    const established = screen.getByTestId('level-established');

    expect(solo.textContent.length).toBeGreaterThan('Solo'.length);
    expect(studio.textContent.length).toBeGreaterThan('Studio'.length);
    expect(established.textContent.length).toBeGreaterThan('Established'.length);
  });

  it('calls onChange with the level key when a card is clicked', () => {
    const onChange = vi.fn();
    render(<LevelSelector onChange={onChange} />);

    fireEvent.click(screen.getByTestId('level-studio'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('studio');
  });

  it('calls onChange for solo and established too', () => {
    const onChange = vi.fn();
    render(<LevelSelector onChange={onChange} />);

    fireEvent.click(screen.getByTestId('level-solo'));
    fireEvent.click(screen.getByTestId('level-established'));

    expect(onChange).toHaveBeenNthCalledWith(1, 'solo');
    expect(onChange).toHaveBeenNthCalledWith(2, 'established');
  });

  it('shows a Recommended badge on the suggested level when siteData is provided', () => {
    // suggestLevel returns 'studio' for 2+ staff or >3 services.
    const siteData = {
      team: [{}, {}],
      services: [{}, {}, {}, {}],
    };

    render(<LevelSelector onChange={() => {}} siteData={siteData} />);

    const studio = screen.getByTestId('level-studio');
    expect(studio.textContent).toContain('Recommended');
  });

  it('shows Recommended on solo for an empty siteData', () => {
    const siteData = { team: [], services: [] };

    render(<LevelSelector onChange={() => {}} siteData={siteData} />);

    const solo = screen.getByTestId('level-solo');
    expect(solo.textContent).toContain('Recommended');
  });

  it('does not show a Recommended badge when siteData is omitted', () => {
    render(<LevelSelector onChange={() => {}} />);

    expect(screen.queryByText('Recommended')).toBeNull();
  });

  it('highlights the selected level', () => {
    render(<LevelSelector onChange={() => {}} selected="studio" />);

    const studio = screen.getByTestId('level-studio');
    expect(studio.getAttribute('aria-pressed')).toBe('true');

    const solo = screen.getByTestId('level-solo');
    expect(solo.getAttribute('aria-pressed')).toBe('false');
  });

  it('lists the sections each level includes', () => {
    render(<LevelSelector onChange={() => {}} layout="atelier" />);

    // Atelier skeleton includes services, booking, contact — check that
    // at least one section name appears on the solo card.
    const solo = screen.getByTestId('level-solo');
    // The solo card should mention "services" or "contact" type section text
    expect(solo.textContent.toLowerCase()).toMatch(/services|contact|booking/);
  });

  it('explains picker vs dispatch when a niche is provided', () => {
    render(<LevelSelector onChange={() => {}} niche="salon" layout="atelier" />);
    const studio = screen.getByTestId('level-studio');
    expect(studio.textContent).toMatch(/pick/i);
  });
});