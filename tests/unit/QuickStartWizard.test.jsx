/**
 * Tests for QuickStartWizard.jsx — Quick Start flow
 *
 * Seams tested:
 *   1. Wizard renders with 4 steps (industry, basics, offers, style)
 *   2. The default solo level is passed through to the site builder
 *   3. Fallback to old template flow for unknown niches
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock buildSiteDataFromWizard so we can assert it receives the chosen level.
// vi.mock factories are hoisted; access mocks via getters referencing vi.fn()s.
vi.mock('../../src/utils/wizardSiteDataBuilder', () => {
  const fn = vi.fn((formState) => ({
    _layout: 'atelier',
    _character: 'refined',
    _level: formState.level,
    sections: [],
  }));
  return {
    buildSiteDataFromWizard: fn,
    REFINED_NICHE_IDS: [
      'restaurant', 'salon', 'gym', 'pet-care', 'tech-repair',
      'cleaning', 'electrician', 'plumbing', 'auto-repair', 'tow-truck',
      'consultant', 'freelancer', 'product-ordering', 'product-showcase',
    ],
    __mockBuild: fn,
  };
});

vi.mock('../../src/hooks/useSite', () => ({
  useSite: () => ({ loadTemplate: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('../../src/services/templates', () => ({
  templatesService: {
    getTemplate: vi.fn().mockResolvedValue({
      id: 'restaurant',
      name: 'Restaurant',
      sections: [],
      hero: {},
    }),
  },
}));

// Mock useToast
vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

import QuickStartWizard from '../../src/components/setup/QuickStartWizard';
import { buildSiteDataFromWizard } from '../../src/utils/wizardSiteDataBuilder';
import { templatesService } from '../../src/services/templates';

const getBuildMock = () => vi.mocked(buildSiteDataFromWizard);
const getGetTemplateMock = () => vi.mocked(templatesService.getTemplate);

function clickIndustry(id) {
  const cards = screen.getAllByRole('button');
  const card = cards.find((c) => c.getAttribute('class')?.includes('industry-card') && c.textContent.includes(id));
  if (!card) throw new Error(`industry card ${id} not found`);
  fireEvent.click(card);
}

function nextButton() {
  const btns = screen.getAllByRole('button', { name: /Next/i });
  return btns[btns.length - 1];
}

describe('QuickStartWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBuildMock().mockClear();
  });

  // 1. Renders the first step (industry)
  it('renders with the industry step visible', () => {
    render(<QuickStartWizard onComplete={() => {}} onSkip={() => {}} />);
    expect(screen.getByText(/What type of business are you creating/i)).toBeTruthy();
  });

  it('shows an inline error when basics are submitted without a business name', () => {
    render(<QuickStartWizard onComplete={() => {}} onSkip={() => {}} />);
    clickIndustry('Salon');

    fireEvent.change(screen.getByTestId('contact-phone-input'), { target: { value: '555-1234' } });
    fireEvent.click(nextButton());

    expect(screen.getByText('Please enter your business name')).toBeTruthy();
  });

  it('shows an inline error when basics are submitted without phone or email', () => {
    render(<QuickStartWizard onComplete={() => {}} onSkip={() => {}} />);
    clickIndustry('Salon');

    fireEvent.change(screen.getByTestId('business-name-input'), { target: { value: 'Studio Luxe' } });
    fireEvent.click(nextButton());

    expect(screen.getAllByText('Please enter at least a phone number or email address')).toHaveLength(2);
  });

  it('passes the default solo level through to buildSiteDataFromWizard on completion', async () => {
    const onComplete = vi.fn();
    render(<QuickStartWizard onComplete={onComplete} onSkip={() => {}} />);

    // Step 1: pick Salon
    clickIndustry('Salon');

    // Step 2: basics
    fireEvent.change(screen.getByTestId('business-name-input'), { target: { value: 'Studio Luxe' } });
    fireEvent.change(screen.getByTestId('contact-phone-input'), { target: { value: '555-1234' } });
    fireEvent.click(nextButton());

    expect(screen.getByTestId('wizard-offers-step')).toBeTruthy();
    fireEvent.click(nextButton());

    // Step 4: style — pick the first theme card
    await waitFor(() => {
      const themeCards = document.querySelectorAll('.theme-card');
      expect(themeCards.length).toBeGreaterThan(0);
    });
    fireEvent.click(document.querySelector('.theme-card'));

    // Complete
    const createBtn = screen.getByRole('button', { name: /Create My Website/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(getBuildMock()).toHaveBeenCalledTimes(1);
    });

    const callArg = getBuildMock().mock.calls[0][0];
    expect(callArg.niche).toBe('salon');
    expect(callArg.level).toBe('solo');
    expect(callArg.businessName).toBe('Studio Luxe');
    expect(callArg.kind).toBe('services');
    expect(callArg.catalogItems.some((item) => /Haircut/i.test(item.name))).toBe(true);
  });

  // Fallback path: unknown industry does not call buildSiteDataFromWizard
  it('falls back to templatesService for niches not in REFINED_NICHE_IDS', async () => {
    render(<QuickStartWizard onComplete={() => {}} onSkip={() => {}} />);

    clickIndustry('Salon');
    fireEvent.change(screen.getByTestId('business-name-input'), { target: { value: 'X' } });
    fireEvent.change(screen.getByTestId('contact-phone-input'), { target: { value: '555' } });
    fireEvent.click(nextButton());
    fireEvent.click(nextButton());

    await waitFor(() => {
      const themeCards = document.querySelectorAll('.theme-card');
      expect(themeCards.length).toBeGreaterThan(0);
    });
    fireEvent.click(document.querySelector('.theme-card'));

    fireEvent.click(screen.getByRole('button', { name: /Create My Website/i }));

    await waitFor(() => expect(getBuildMock()).toHaveBeenCalled());
    expect(getGetTemplateMock()).not.toHaveBeenCalled();
  });
});

describe('QuickStartWizard — initialTemplate from URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips industry step and opens basics when initialTemplate is salon', () => {
    render(<QuickStartWizard initialTemplate="salon" onComplete={() => {}} onSkip={() => {}} />);
    expect(screen.queryByText(/What type of business are you creating/i)).toBeNull();
    expect(screen.getByTestId('business-name-input')).toBeTruthy();
  });

  it('maps gym niche to fitness industry and opens basics', () => {
    render(<QuickStartWizard initialTemplate="gym" onComplete={() => {}} onSkip={() => {}} />);
    expect(screen.queryByText(/What type of business are you creating/i)).toBeNull();
    expect(screen.getByTestId('business-name-input')).toBeTruthy();
  });

  it('shows industry step for invalid initialTemplate', () => {
    render(<QuickStartWizard initialTemplate="invalid-xyz" onComplete={() => {}} onSkip={() => {}} />);
    expect(screen.getByText(/What type of business are you creating/i)).toBeTruthy();
    expect(screen.queryByTestId('business-name-input')).toBeNull();
  });
});
