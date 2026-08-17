/**
 * Tests for layouts.js — TDD red-green cycles
 *
 * Seams tested:
 *   1. LAYOUTS structure — all 5 layouts, required keys
 *   2. getLayout() — lookup
 *   3. getLayoutForNiche() — niche → layout mapping
 *   4. getSkeleton() — per-level section ordering
 *   5. getSectionsForLevel() — filtered sections
 *   6. resolveFeatures() — default merging + user overrides
 *   7. validateFeatures() — at-least-one-payment guard
 *   8. resolvePaymentMethods() — payment method resolution
 */

import { describe, it, expect } from 'vitest';
import {
  LAYOUTS,
  getLayout,
  getLayoutForNiche,
  getSkeleton,
  getSectionsForLevel,
  resolveFeatures,
  validateFeatures,
  resolvePaymentMethods,
} from '../../src/config/layouts';

// ---------------------------------------------------------------------------
// 1. LAYOUTS structure
// ---------------------------------------------------------------------------

describe('layouts — Structure', () => {
  const REQUIRED_KEYS = ['name', 'description', 'character', 'niches', 'hero', 'sections', 'levels', 'features'];
  const LAYOUT_NAMES = ['atelier', 'craftsman', 'counsel', 'mercantile', 'bazaar'];

  it('defines all 5 layouts', () => {
    for (const name of LAYOUT_NAMES) {
      expect(LAYOUTS[name]).toBeDefined();
    }
    expect(Object.keys(LAYOUTS)).toHaveLength(5);
  });

  it('each layout has all required keys', () => {
    for (const [key, layout] of Object.entries(LAYOUTS)) {
      for (const rk of REQUIRED_KEYS) {
        expect(layout).toHaveProperty(rk);
      }
    }
  });

  it('each layout has at least one niche', () => {
    for (const [key, layout] of Object.entries(LAYOUTS)) {
      expect(layout.niches.length).toBeGreaterThan(0);
    }
  });

  it('no niche appears in two layouts', () => {
    const allNiches = Object.values(LAYOUTS).flatMap((l) => l.niches);
    expect(new Set(allNiches).size).toBe(allNiches.length);
  });

  it('each layout has a hero variant', () => {
    for (const layout of Object.values(LAYOUTS)) {
      expect(layout.hero.variant).toBeTruthy();
      expect(layout.hero.ctaDefault).toBeTruthy();
    }
  });

  it('each layout has required sections', () => {
    for (const layout of Object.values(LAYOUTS)) {
      const requiredSections = Object.values(layout.sections).filter((s) => s.required);
      expect(requiredSections.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each layout has feature definitions for booking, onlineOrdering, onlinePayment, cashPayment', () => {
    for (const [key, layout] of Object.entries(LAYOUTS)) {
      expect(layout.features).toHaveProperty('booking');
      expect(layout.features).toHaveProperty('onlineOrdering');
      expect(layout.features).toHaveProperty('onlinePayment');
      expect(layout.features).toHaveProperty('cashPayment');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. getLayout()
// ---------------------------------------------------------------------------

describe('layouts — getLayout()', () => {
  it('returns the layout definition for a valid key', () => {
    const atelier = getLayout('atelier');
    expect(atelier.name).toBe('Atelier');
  });

  it('returns undefined for an unknown key', () => {
    expect(getLayout('nonexistent')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. getLayoutForNiche()
// ---------------------------------------------------------------------------

describe('layouts — getLayoutForNiche()', () => {
  it('maps salon to atelier', () => {
    expect(getLayoutForNiche('salon')).toBe('atelier');
  });

  it('maps plumbing to craftsman', () => {
    expect(getLayoutForNiche('plumbing')).toBe('craftsman');
  });

  it('maps consultant to counsel', () => {
    expect(getLayoutForNiche('consultant')).toBe('counsel');
  });

  it('maps restaurant to mercantile', () => {
    expect(getLayoutForNiche('restaurant')).toBe('mercantile');
  });

  it('maps food-stall to bazaar', () => {
    expect(getLayoutForNiche('food-stall')).toBe('bazaar');
  });

  it('falls back to atelier for unknown niche', () => {
    expect(getLayoutForNiche('unknown-niche')).toBe('atelier');
  });
});

// ---------------------------------------------------------------------------
// 4. getSkeleton()
// ---------------------------------------------------------------------------

describe('layouts — getSkeleton()', () => {
  it('returns the correct section order for atelier/solo', () => {
    const skeleton = getSkeleton('atelier', 'solo');
    expect(skeleton).toEqual(['hero', 'services', 'gallery', 'booking', 'hours', 'location', 'contact', 'social']);
  });

  it('returns the correct section order for atelier/studio', () => {
    const skeleton = getSkeleton('atelier', 'studio');
    expect(skeleton).toContain('team');
    expect(skeleton).toContain('testimonials');
  });

  it('returns the correct section order for atelier/established', () => {
    const skeleton = getSkeleton('atelier', 'established');
    expect(skeleton).toContain('reviews');
    expect(skeleton).toContain('stats');
  });

  it('returns empty array for unknown layout', () => {
    expect(getSkeleton('nonexistent', 'solo')).toEqual([]);
  });

  it('falls back to solo for unknown level', () => {
    const skeleton = getSkeleton('atelier', 'nonexistent');
    expect(skeleton).toEqual(getSkeleton('atelier', 'solo'));
  });

  it('bazaar has only solo level', () => {
    expect(getSkeleton('bazaar', 'solo')).toBeDefined();
    // Bazaar always returns solo regardless of level input
    expect(getSkeleton('bazaar', 'established')).toEqual(getSkeleton('bazaar', 'solo'));
  });

  it('every layout/level skeleton ends with hours, location, contact, social', () => {
    for (const [key, layout] of Object.entries(LAYOUTS)) {
      for (const [level, skeleton] of Object.entries(layout.levels)) {
        expect(skeleton.slice(-4), `${key}/${level}`).toEqual(['hours', 'location', 'contact', 'social']);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5. getSectionsForLevel()
// ---------------------------------------------------------------------------

describe('layouts — getSectionsForLevel()', () => {
  it('always includes required sections regardless of level', () => {
    const sections = getSectionsForLevel('atelier', 'solo');
    expect(sections.services).toBeDefined();
    expect(sections.services.required).toBe(true);
    expect(sections.contact).toBeDefined();
  });

  it('includes team for studio but not solo in atelier', () => {
    const soloSections = getSectionsForLevel('atelier', 'solo');
    const studioSections = getSectionsForLevel('atelier', 'studio');
    expect(soloSections.team).toBeUndefined();
    expect(studioSections.team).toBeDefined();
  });

  it('includes team for studio craftsman, counsel, and mercantile', () => {
    expect(getSectionsForLevel('craftsman', 'solo').team).toBeUndefined();
    expect(getSectionsForLevel('craftsman', 'studio').team).toBeDefined();
    expect(getSectionsForLevel('counsel', 'studio').team).toBeDefined();
    expect(getSectionsForLevel('mercantile', 'studio').team).toBeDefined();
    expect(getSkeleton('mercantile', 'solo')).not.toContain('reviews');
    expect(getSkeleton('craftsman', 'studio')).toContain('team');
  });

  it('includes reviews and stats for established in atelier', () => {
    const sections = getSectionsForLevel('atelier', 'established');
    expect(sections.reviews).toBeDefined();
    expect(sections.stats).toBeDefined();
  });

  it('returns empty for unknown layout', () => {
    expect(getSectionsForLevel('nonexistent', 'solo')).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// 6. resolveFeatures()
// ---------------------------------------------------------------------------

describe('layouts — resolveFeatures()', () => {
  it('returns defaults from layout when no user overrides', () => {
    const features = resolveFeatures('atelier');
    expect(features.booking.enabled).toBe(true);
    expect(features.onlineOrdering.enabled).toBe(false);
    expect(features.onlinePayment.enabled).toBe(true);
    expect(features.cashPayment.enabled).toBe(true);
  });

  it('merges user overrides on top of layout defaults', () => {
    const features = resolveFeatures('atelier', {
      onlineOrdering: { enabled: true },
      booking: { enabled: false },
    });
    expect(features.booking.enabled).toBe(false);
    expect(features.onlineOrdering.enabled).toBe(true);
  });

  it('bazaar does not offer booking', () => {
    const features = resolveFeatures('bazaar');
    expect(features.booking.offered).toBe(false);
  });

  it('offered flag is preserved even when disabled', () => {
    const features = resolveFeatures('atelier', {
      booking: { enabled: false },
    });
    expect(features.booking.offered).toBe(true);
    expect(features.booking.enabled).toBe(false);
  });

  it('unknown layout returns default features', () => {
    const features = resolveFeatures('nonexistent');
    expect(features.booking).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. validateFeatures()
// ---------------------------------------------------------------------------

describe('layouts — validateFeatures()', () => {
  it('valid when booking enabled with cash payment', () => {
    const features = resolveFeatures('atelier');
    expect(validateFeatures(features).ok).toBe(true);
  });

  it('valid when ordering enabled with cash payment only', () => {
    const features = resolveFeatures('mercantile', {
      onlinePayment: { enabled: false },
    });
    expect(features.cashPayment.enabled).toBe(true);
    expect(validateFeatures(features).ok).toBe(true);
  });

  it('invalid when ordering enabled but all payments disabled', () => {
    const features = {
      booking: { offered: true, enabled: false },
      onlineOrdering: { offered: true, enabled: true },
      onlinePayment: { offered: true, enabled: false },
      cashPayment: { offered: true, enabled: false },
    };
    const result = validateFeatures(features);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('PICK_A_PAYMENT_METHOD');
  });

  it('valid when nothing needs payment (contact-only)', () => {
    const features = {
      booking: { offered: true, enabled: false },
      onlineOrdering: { offered: true, enabled: false },
      onlinePayment: { offered: true, enabled: false },
      cashPayment: { offered: true, enabled: false },
    };
    expect(validateFeatures(features).ok).toBe(true);
  });

  it('valid when booking on with online payment', () => {
    const features = {
      booking: { offered: true, enabled: true },
      onlineOrdering: { offered: true, enabled: false },
      onlinePayment: { offered: true, enabled: true },
      cashPayment: { offered: true, enabled: false },
    };
    expect(validateFeatures(features).ok).toBe(true);
  });

  it('returns ok for null features', () => {
    expect(validateFeatures(null).ok).toBe(true);
  });

  it('returns ok for empty features', () => {
    expect(validateFeatures({}).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. resolvePaymentMethods()
// ---------------------------------------------------------------------------

describe('layouts — resolvePaymentMethods()', () => {
  it('returns online and cash when both enabled', () => {
    const features = resolveFeatures('mercantile');
    const methods = resolvePaymentMethods(features);
    expect(methods).toContain('online');
    expect(methods).toContain('cash');
  });

  it('returns only cash when online payment disabled', () => {
    const features = resolveFeatures('mercantile', {
      onlinePayment: { enabled: false },
    });
    const methods = resolvePaymentMethods(features);
    expect(methods).toEqual(['cash']);
  });

  it('returns only online when cash disabled', () => {
    const features = resolveFeatures('mercantile', {
      cashPayment: { enabled: false },
    });
    const methods = resolvePaymentMethods(features);
    expect(methods).toEqual(['online']);
  });

  it('defaults to cash for null features', () => {
    expect(resolvePaymentMethods(null)).toEqual(['cash']);
  });

  it('bazaar does not offer booking in payment methods', () => {
    const features = resolveFeatures('bazaar');
    // Booking is not offered in bazaar
    expect(features.booking.offered).toBe(false);
  });
});