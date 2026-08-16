/**
 * layoutParity.test.js — Regression guard for the layout engine.
 *
 * Proves:
 *   1. composePage() is deterministic — called twice with the same input it
 *      produces deep-equal sections, tokens, and features.
 *   2. Every section type in every layout's skeleton has a primitive (no nulls).
 *   3. composePage() for every niche in NICHE_CONFIGS produces a valid page
 *      with sections.length > 0.
 *   4. composePage() respects _features metadata — cash-only (booking off,
 *      cash on) and no-booking configurations both render valid pages.
 *
 * Preview and publish both call composePage(), so determinism here implies
 * preview/publish parity.
 */

import { describe, it, expect } from 'vitest';
import { composePage, sectionPrimitives } from '../../src/utils/layoutRenderer';
import { buildNicheSiteData, NICHE_CONFIGS } from '../../src/config/nicheTemplateBuilders';
import { buildBazaarSiteData } from '../../src/config/bazaarDefaults';
import { LAYOUTS, getSkeleton } from '../../src/config/layouts';

// Deep-equal helper that ignores non-deterministic fields (ids, timestamps)
function stableDeepEqual(a, b) {
  return JSON.stringify(stabilize(a)) === JSON.stringify(stabilize(b));
}

function stabilize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => stabilize(stripVolatile(v)));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      // Skip volatile fields that differ between calls (ids, dates)
      if (k === 'id' || k === 'order' || k === 'createdAt' || k === 'updatedAt') continue;
      out[k] = stabilize(stripVolatile(v));
    }
    return out;
  }
  return value;
}

function stripVolatile(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && 'id' in v) {
    // Omit the volatile id field
    const rest = { ...v };
    delete rest.id;
    return rest;
  }
  return v;
}

describe('layoutParity — determinism', () => {
  it('composePage() called twice with the same input produces deep-equal sections, tokens, features', () => {
    const siteData = buildNicheSiteData('salon', { businessName: 'Studio Luxe', level: 'studio' });

    const first = composePage({ siteData });
    const second = composePage({ siteData });

    expect(stableDeepEqual(first.sections, second.sections)).toBe(true);
    expect(stableDeepEqual(first.tokens, second.tokens)).toBe(true);
    expect(stableDeepEqual(first.features, second.features)).toBe(true);
    // Layout/character/level must match exactly
    expect(first.layout).toBe(second.layout);
    expect(first.character).toBe(second.character);
    expect(first.level).toBe(second.level);
  });

  it('composePage() is deterministic for a bazaar site too', () => {
    const siteData = buildBazaarSiteData({ popUpType: 'food-stall', businessName: 'Tacos' });

    const first = composePage({ siteData });
    const second = composePage({ siteData });

    expect(stableDeepEqual(first.sections, second.sections)).toBe(true);
    expect(stableDeepEqual(first.tokens, second.tokens)).toBe(true);
  });
});

describe('layoutParity — primitives', () => {
  it('every section type in every layout skeleton has a primitive (no nulls)', () => {
    const missing = [];
    for (const [layoutKey, layout] of Object.entries(LAYOUTS)) {
      const levelKeys = Object.keys(layout.levels || { solo: [] });
      for (const levelKey of levelKeys) {
        const skeleton = getSkeleton(layoutKey, levelKey);
        for (const sectionType of skeleton) {
          if (!sectionPrimitives[sectionType]) {
            missing.push(`${layoutKey}/${levelKey}: ${sectionType}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('layoutParity — every niche produces a valid page', () => {
  const refinedNiches = Object.keys(NICHE_CONFIGS);

  for (const niche of refinedNiches) {
    it(`composePage() for niche "${niche}" produces sections.length > 0`, () => {
      const siteData = buildNicheSiteData(niche, { businessName: 'Test Business', level: 'studio' });
      const page = composePage({ siteData });

      expect(page).toBeTruthy();
      expect(Array.isArray(page.sections)).toBe(true);
      expect(page.sections.length).toBeGreaterThan(0);
      // No section should be null
      for (const section of page.sections) {
        expect(section).not.toBeNull();
        expect(section).toBeDefined();
      }
    });
  }
});

describe('layoutParity — feature metadata', () => {
  it('cash-only config (booking off, cash on) renders a valid page', () => {
    const siteData = buildNicheSiteData('salon', {
      businessName: 'Cash Salon',
      level: 'solo',
      features: {
        booking: { enabled: false },
        onlinePayment: { enabled: false },
        cashPayment: { enabled: true },
      },
    });

    const page = composePage({ siteData });

    expect(page).toBeTruthy();
    expect(page.sections.length).toBeGreaterThan(0);
    expect(page.features.booking.enabled).toBe(false);
    expect(page.features.cashPayment.enabled).toBe(true);
  });

  it('booking-off config (no booking) renders a valid page without booking section', () => {
    const siteData = buildNicheSiteData('plumbing', {
      businessName: 'No-Booking Plumbing',
      level: 'solo',
      features: { booking: { enabled: false } },
    });

    const page = composePage({ siteData });

    expect(page).toBeTruthy();
    expect(page.sections.length).toBeGreaterThan(0);
    // When booking is off, no rendered section should be of type 'booking'
    const bookingSections = page.sections.filter((s) => s.type === 'booking');
    expect(bookingSections.length).toBe(0);
  });
});