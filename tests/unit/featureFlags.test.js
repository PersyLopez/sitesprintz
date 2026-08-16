/**
 * Tests for featureFlags.js — TDD red-green cycles
 *
 * Seams tested:
 *   1. FEATURE_DEFINITIONS structure
 *   2. getFeatureToggles() — editor UI descriptors
 *   3. resolveHeroCtaFromFeatures() — CTA resolution
 *   4. validateFeaturesForSave() — save validation with messages
 */

import { describe, it, expect } from 'vitest';
import {
  FEATURE_DEFINITIONS,
  getFeatureToggles,
  resolveHeroCtaFromFeatures,
  validateFeaturesForSave,
} from '../../src/config/featureFlags';

// ---------------------------------------------------------------------------
// 1. FEATURE_DEFINITIONS
// ---------------------------------------------------------------------------

describe('featureFlags — Definitions', () => {
  it('defines the four essential features', () => {
    expect(FEATURE_DEFINITIONS.booking).toBeDefined();
    expect(FEATURE_DEFINITIONS.onlineOrdering).toBeDefined();
    expect(FEATURE_DEFINITIONS.onlinePayment).toBeDefined();
    expect(FEATURE_DEFINITIONS.cashPayment).toBeDefined();
  });

  it('each feature has key, label, description, affectsSections', () => {
    for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
      expect(def.key).toBe(key);
      expect(def.label).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(Array.isArray(def.affectsSections)).toBe(true);
    }
  });

  it('booking has a ctaOverride with disabled text', () => {
    expect(FEATURE_DEFINITIONS.booking.ctaOverride).toBeDefined();
    expect(FEATURE_DEFINITIONS.booking.ctaOverride.disabled).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. getFeatureToggles()
// ---------------------------------------------------------------------------

describe('featureFlags — getFeatureToggles()', () => {
  it('returns all four features with offered/enabled/disabled state', () => {
    const toggles = getFeatureToggles('atelier');
    expect(toggles).toHaveLength(4);

    const keys = toggles.map((t) => t.key);
    expect(keys).toContain('booking');
    expect(keys).toContain('onlineOrdering');
    expect(keys).toContain('onlinePayment');
    expect(keys).toContain('cashPayment');
  });

  it('booking is offered and enabled by default in atelier', () => {
    const toggles = getFeatureToggles('atelier');
    const booking = toggles.find((t) => t.key === 'booking');
    expect(booking.offered).toBe(true);
    expect(booking.enabled).toBe(true);
    expect(booking.disabled).toBe(false);
  });

  it('booking is not offered in bazaar', () => {
    const toggles = getFeatureToggles('bazaar');
    const booking = toggles.find((t) => t.key === 'booking');
    expect(booking.offered).toBe(false);
    expect(booking.disabled).toBe(true);
  });

  it('user overrides change enabled state', () => {
    const toggles = getFeatureToggles('atelier', { booking: { enabled: false } });
    const booking = toggles.find((t) => t.key === 'booking');
    expect(booking.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. resolveHeroCtaFromFeatures()
// ---------------------------------------------------------------------------

describe('featureFlags — resolveHeroCtaFromFeatures()', () => {
  it('returns "Book Now" with #booking link when booking is enabled in atelier', () => {
    const features = { booking: { offered: true, enabled: true } };
    const cta = resolveHeroCtaFromFeatures(features, {}, 'atelier');
    expect(cta.ctaText).toBe('Book Now');
    expect(cta.ctaLink).toBe('#booking');
  });

  it('returns "Call to Book" with tel: link when booking is disabled and phone is provided', () => {
    const features = { booking: { offered: true, enabled: false }, onlineOrdering: { offered: true, enabled: false } };
    const cta = resolveHeroCtaFromFeatures(features, { contactPhone: '555-1234' }, 'atelier');
    expect(cta.ctaText).toBe('Call to Book');
    expect(cta.ctaLink).toBe('tel:555-1234');
  });

  it('returns "Order Now" when ordering is enabled but booking is off', () => {
    const features = {
      booking: { offered: true, enabled: false },
      onlineOrdering: { offered: true, enabled: true },
    };
    const cta = resolveHeroCtaFromFeatures(features, {}, 'mercantile');
    expect(cta.ctaText).toBe('Order Now');
    expect(cta.ctaLink).toBe('#catalog');
  });

  it('returns "Get a Quote" for craftsman with booking enabled', () => {
    const features = { booking: { offered: true, enabled: true } };
    const cta = resolveHeroCtaFromFeatures(features, {}, 'craftsman');
    expect(cta.ctaText).toBe('Get a Quote');
  });

  it('returns "Get in Touch" for counsel regardless of booking', () => {
    const features = { booking: { offered: true, enabled: true } };
    const cta = resolveHeroCtaFromFeatures(features, {}, 'counsel');
    expect(cta.ctaText).toBe('Get in Touch');
  });

  it('falls back to #contact when no phone and no booking', () => {
    const features = { booking: { offered: true, enabled: false }, onlineOrdering: { offered: true, enabled: false } };
    const cta = resolveHeroCtaFromFeatures(features, {}, 'atelier');
    expect(cta.ctaLink).toBe('#contact');
  });
});

// ---------------------------------------------------------------------------
// 4. validateFeaturesForSave()
// ---------------------------------------------------------------------------

describe('featureFlags — validateFeaturesForSave()', () => {
  it('returns valid for default atelier features', () => {
    const result = validateFeaturesForSave('atelier');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid when ordering on with cash payment', () => {
    const result = validateFeaturesForSave('mercantile', {
      onlinePayment: { enabled: false },
    });
    expect(result.valid).toBe(true);
  });

  it('returns invalid when ordering on but all payments disabled', () => {
    const result = validateFeaturesForSave('mercantile', {
      onlineOrdering: { enabled: true },
      onlinePayment: { enabled: false },
      cashPayment: { enabled: false },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('payment');
  });

  it('returns valid when everything is off (contact-only)', () => {
    const result = validateFeaturesForSave('atelier', {
      booking: { enabled: false },
      onlineOrdering: { enabled: false },
      onlinePayment: { enabled: false },
      cashPayment: { enabled: false },
    });
    expect(result.valid).toBe(true);
  });
});