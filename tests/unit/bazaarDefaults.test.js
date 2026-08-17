/**
 * Tests for bazaarDefaults.js — TDD red-green cycles
 *
 * Seams tested:
 *   1. BAZAAR_TYPES — pop-up categories
 *   2. getBazaarDefaults() — smart content seed
 *   3. buildBazaarSiteData() — full siteData assembly
 *   4. "open until" countdown support
 */

import { describe, it, expect } from 'vitest';
import {
  BAZAAR_TYPES,
  getBazaarDefaults,
  buildBazaarSiteData,
  BAZAAR_ACCENTS,
} from '../../src/config/bazaarDefaults';

// ---------------------------------------------------------------------------
// 1. BAZAAR_TYPES
// ---------------------------------------------------------------------------

describe('bazaarDefaults — BAZAAR_TYPES', () => {
  it('defines pop-up categories with id, name, icon, description', () => {
    expect(BAZAAR_TYPES.length).toBeGreaterThan(0);
    for (const type of BAZAAR_TYPES) {
      expect(type.id).toBeTruthy();
      expect(type.name).toBeTruthy();
      expect(type.icon).toBeTruthy();
      expect(type.description).toBeTruthy();
    }
  });

  it('includes yard sale and food stall categories', () => {
    const ids = BAZAAR_TYPES.map((t) => t.id);
    expect(ids).toContain('yard-sale');
    expect(ids).toContain('food-stall');
  });

  it('each type has a default accent from the approachable palette', () => {
    for (const type of BAZAAR_TYPES) {
      expect(type.accent).toBeTruthy();
      expect(BAZAAR_ACCENTS[type.accent]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 2. getBazaarDefaults()
// ---------------------------------------------------------------------------

describe('bazaarDefaults — getBazaarDefaults()', () => {
  it('returns defaults for a known pop-up type', () => {
    const defaults = getBazaarDefaults('food-stall');
    expect(defaults).toBeDefined();
    expect(defaults.heroTitle).toBeTruthy();
    expect(defaults.items).toBeDefined();
    expect(Array.isArray(defaults.items)).toBe(true);
  });

  it('seeds hero title with the pop-up type name', () => {
    const defaults = getBazaarDefaults('yard-sale');
    expect(defaults.heroTitle).toContain('Yard Sale');
  });

  it('seeds 2-3 starter items', () => {
    const defaults = getBazaarDefaults('food-stall');
    expect(defaults.items.length).toBeGreaterThanOrEqual(2);
    expect(defaults.items.length).toBeLessThanOrEqual(4);
  });

  it('includes location and hours placeholders', () => {
    const defaults = getBazaarDefaults('food-stall');
    expect(defaults.contactAddress).toBeDefined();
    expect(defaults.businessHours).toBeDefined();
  });

  it('falls back to generic defaults for unknown type', () => {
    const defaults = getBazaarDefaults('unknown-pop-up');
    expect(defaults).toBeDefined();
    expect(defaults.heroTitle).toBeTruthy();
  });

  it('includes an accent from the approachable palette', () => {
    const defaults = getBazaarDefaults('food-stall');
    expect(defaults.accentKey).toBeTruthy();
    expect(BAZAAR_ACCENTS[defaults.accentKey]).toBeDefined();
  });

  it('supports optional openUntil date', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const defaults = getBazaarDefaults('food-stall', { openUntil: future });
    expect(defaults.openUntil).toBe(future);
  });
});

// ---------------------------------------------------------------------------
// 3. buildBazaarSiteData()
// ---------------------------------------------------------------------------

describe('bazaarDefaults — buildBazaarSiteData()', () => {
  it('assembles a complete siteData object with bazaar layout metadata', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Maria\'s Tacos',
      location: '123 Main St',
      hours: 'Sat 8am-2pm',
    });

    expect(siteData.businessName).toBe('Maria\'s Tacos');
    expect(siteData.contactAddress).toBe('123 Main St');
    expect(siteData.businessHours).toBe('Sat 8am-2pm');
    expect(siteData._layout).toBe('bazaar');
    expect(siteData._character).toBe('approachable');
    expect(siteData._level).toBe('solo');
  });

  it('includes hero content with what/where/when', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Maria\'s Tacos',
      location: '123 Main St',
      hours: 'Sat 8am-2pm',
    });

    expect(siteData.heroTitle).toBeTruthy();
    expect(siteData.heroSubtitle).toBeTruthy();
  });

  it('includes sections array in canonical format', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Test',
    });

    expect(Array.isArray(siteData.sections)).toBe(true);
    expect(siteData.sections.length).toBeGreaterThan(0);
    // Each section has id, type, enabled
    for (const section of siteData.sections) {
      expect(section.id).toBeTruthy();
      expect(section.type).toBeTruthy();
      expect(section.enabled).toBe(true);
    }
  });

  it('includes feature toggles with bazaar defaults (ordering on, no booking)', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Test',
    });

    expect(siteData._features).toBeDefined();
    expect(siteData._features.booking.offered).toBe(false);
    expect(siteData._features.onlineOrdering.enabled).toBe(true);
  });

  it('includes theme tokens resolved for approachable character', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Test',
    });

    expect(siteData._theme).toBeDefined();
    expect(siteData._theme.character).toBe('approachable');
    expect(siteData._theme.mode).toBe('ivory');
  });

  it('openUntil is preserved when provided', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Test',
      openUntil: future,
    });

    expect(siteData.openUntil).toBe(future);
  });

  it('works with minimal input (just name)', () => {
    const siteData = buildBazaarSiteData({
      businessName: 'Just A Name',
    });

    expect(siteData.businessName).toBe('Just A Name');
    expect(siteData._layout).toBe('bazaar');
  });

  it('seeds social after contact and siteData.social keys', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Maria\'s Tacos',
    });
    const types = siteData.sections.map((s) => s.type);
    const contactIdx = types.indexOf('contact');
    expect(types[contactIdx + 1]).toBe('social');
    expect(siteData.social).toEqual({
      facebook: '',
      instagram: '',
      whatsapp: '',
      tiktok: '',
      maps: '',
      website: '',
      linkedin: '',
    });
  });
});

// ---------------------------------------------------------------------------
// 4. BAZAAR_ACCENTS
// ---------------------------------------------------------------------------

describe('bazaarDefaults — BAZAAR_ACCENTS', () => {
  it('defines the four approachable accents', () => {
    expect(BAZAAR_ACCENTS.market).toBeDefined();
    expect(BAZAAR_ACCENTS.garage).toBeDefined();
    expect(BAZAAR_ACCENTS.stand).toBeDefined();
    expect(BAZAAR_ACCENTS.fair).toBeDefined();
  });

  it('each accent has a name and hex value', () => {
    for (const [key, accent] of Object.entries(BAZAAR_ACCENTS)) {
      expect(accent.name).toBeTruthy();
      expect(accent.value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});