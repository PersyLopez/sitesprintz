/**
 * Tests for BazaarWizard.jsx — TDD red-green cycles
 *
 * Seams tested (component behavior):
 *   1. Renders the wizard with step 1 (what)
 *   2. Type selection works
 *   3. Name required to proceed
 *   4. Advances to step 2 (where/when)
 *   5. Completes and calls onComplete with built siteData
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BazaarWizard from '../../src/components/setup/BazaarWizard';

// Mock useSite
const mockLoadTemplate = vi.fn().mockResolvedValue(undefined);
vi.mock('../../src/hooks/useSite', () => ({
  useSite: () => ({ loadTemplate: mockLoadTemplate }),
}));

// Mock useToast
const mockShowError = vi.fn();
vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: vi.fn() }),
}));

describe('BazaarWizard', () => {
  beforeEach(() => {
    mockLoadTemplate.mockClear();
    mockShowError.mockClear();
  });

  it('renders the wizard with step 1 (what)', () => {
    render(<BazaarWizard onComplete={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('heading', { name: 'What are you selling?' })).toBeTruthy();
    expect(screen.getByTestId('bazaar-name-input')).toBeTruthy();
    expect(screen.getByTestId('bazaar-type-food-stall')).toBeTruthy();
  });

  it('disables Next until a name is entered', () => {
    render(<BazaarWizard onComplete={() => {}} onCancel={() => {}} />);
    const nextBtn = screen.getByTestId('bazaar-next-btn');
    expect(nextBtn.disabled).toBe(true);
  });

  it('enables Next when a name is entered', () => {
    render(<BazaarWizard onComplete={() => {}} onCancel={() => {}} />);
    const input = screen.getByTestId('bazaar-name-input');
    fireEvent.change(input, { target: { value: 'My Pop-Up' } });
    const nextBtn = screen.getByTestId('bazaar-next-btn');
    expect(nextBtn.disabled).toBe(false);
  });

  it('selecting a pop-up type updates the selection', () => {
    render(<BazaarWizard onComplete={() => {}} onCancel={() => {}} />);
    const yardSaleBtn = screen.getByTestId('bazaar-type-yard-sale');
    fireEvent.click(yardSaleBtn);
    expect(yardSaleBtn.getAttribute('aria-checked')).toBe('true');
    // food-stall should be deselected
    const foodStallBtn = screen.getByTestId('bazaar-type-food-stall');
    expect(foodStallBtn.getAttribute('aria-checked')).toBe('false');
  });

  it('advances to step 2 (where/when) on Next', () => {
    render(<BazaarWizard onComplete={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByTestId('bazaar-name-input'), {
      target: { value: 'My Pop-Up' },
    });
    fireEvent.click(screen.getByTestId('bazaar-next-btn'));
    expect(screen.getByTestId('bazaar-location-input')).toBeTruthy();
    expect(screen.getByTestId('bazaar-hours-input')).toBeTruthy();
  });

  it('Back on step 1 calls onCancel', () => {
    const onCancel = vi.fn();
    render(<BazaarWizard onComplete={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('bazaar-back-btn'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('Back on step 2 returns to step 1', () => {
    render(<BazaarWizard onComplete={() => {}} onCancel={() => {}} />);
    // Go to step 2
    fireEvent.change(screen.getByTestId('bazaar-name-input'), {
      target: { value: 'My Pop-Up' },
    });
    fireEvent.click(screen.getByTestId('bazaar-next-btn'));
    expect(screen.getByTestId('bazaar-location-input')).toBeTruthy();
    // Back to step 1
    fireEvent.click(screen.getByTestId('bazaar-back-btn'));
    expect(screen.getByTestId('bazaar-name-input')).toBeTruthy();
    expect(() => screen.getByTestId('bazaar-location-input')).toThrow();
  });

  it('completes and calls onComplete with bazaar siteData', async () => {
    const onComplete = vi.fn();
    render(<BazaarWizard onComplete={onComplete} onCancel={() => {}} />);

    // Step 1
    fireEvent.change(screen.getByTestId('bazaar-name-input'), {
      target: { value: 'Maria\'s Tacos' },
    });
    fireEvent.click(screen.getByTestId('bazaar-type-food-stall'));
    fireEvent.click(screen.getByTestId('bazaar-next-btn'));

    // Step 2
    fireEvent.change(screen.getByTestId('bazaar-location-input'), {
      target: { value: '123 Main St' },
    });
    fireEvent.change(screen.getByTestId('bazaar-hours-input'), {
      target: { value: 'Sat 8am-2pm' },
    });
    fireEvent.click(screen.getByTestId('bazaar-next-btn'));

    await waitFor(() => {
      expect(mockLoadTemplate).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    const siteData = onComplete.mock.calls[0][0];
    expect(siteData.businessName).toBe('Maria\'s Tacos');
    expect(siteData._layout).toBe('bazaar');
    expect(siteData._character).toBe('approachable');
    expect(siteData._level).toBe('solo');
    expect(siteData._features.booking.offered).toBe(false);
    expect(siteData._features.onlineOrdering.enabled).toBe(true);
    expect(siteData.contactAddress).toBe('123 Main St');
    expect(siteData.businessHours).toBe('Sat 8am-2pm');
  });
});