/**
 * Integration tests — Bazaar (Approachable) end-to-end through the layout engine.
 *
 * Proves:
 *   1. A Bazaar site composed through composePage() resolves Approachable
 *      character tokens (Ivory base, Inter display, snappy motion).
 *   2. Bazaar excludes booking (not offered).
 *   3. Cash-only configuration renders a valid composed page.
 *   4. The Approachable character switch does NOT affect Refined layouts
 *      (an Atelier site composed alongside Bazaar still gets Onyx + Fraunces).
 */

import { describe, it, expect } from 'vitest';
import { composePage } from '../../src/utils/layoutRenderer';
import { buildBazaarSiteData } from '../../src/config/bazaarDefaults';

describe('Bazaar engine integration', () => {
  it('resolves Approachable character tokens for a Bazaar site', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Maria\'s Tacos',
    });

    const page = composePage({ siteData });

    expect(page.layout).toBe('bazaar');
    expect(page.character).toBe('approachable');
    expect(page.tokens.theme.mode).toBe('ivory');
    expect(page.tokens.theme.bg).toBe('#f6f4ef');
    expect(page.tokens.motion.type).toBe('snappy-hover');
    expect(page.tokens.radii.card).toBe('6px');
  });

  it('uses Inter display font for Approachable character', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'yard-sale',
      businessName: 'Smith Family Sale',
    });

    const page = composePage({ siteData });
    expect(page.tokens.typography.display.family).toContain('Inter');
    expect(page.tokens.typography.display.family).not.toContain('Fraunces');
  });

  it('excludes booking from composed sections (not offered)', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Test',
    });

    const page = composePage({ siteData });
    const types = page.sections.map((s) => s.type);
    expect(types).not.toContain('booking');
    expect(page.features.booking.offered).toBe(false);
  });

  it('includes catalog, how-to-order, hours, location, and contact sections', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Test',
    });

    const page = composePage({ siteData });
    const types = page.sections.map((s) => s.type);
    expect(types).toContain('catalog');
    expect(types).toContain('how-to-order');
    expect(types).toContain('hours');
    expect(types).toContain('location');
    expect(types).toContain('contact');
  });

  it('resolves curated ember theme for food-stall niche', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Test',
    });

    const page = composePage({ siteData });
    expect(page.tokens.themeId).toBe('ivory-grove');
    expect(page.tokens.theme.mode).toBe('ivory');
    expect(page.tokens.theme.accentValue).toBe('#2f6b4a');
  });

  it('cash-only Bazaar renders a valid composed page', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Cash Only Stall',
    });

    const page = composePage({
      siteData,
      userFeatures: { onlinePayment: { enabled: false } },
    });

    expect(page.paymentMethods).toEqual(['cash']);
    expect(page.features.onlinePayment.enabled).toBe(false);
    expect(page.features.cashPayment.enabled).toBe(true);
  });

  it('ordering-disabled Bazaar still composes (contact-only path)', () => {
    const siteData = buildBazaarSiteData({
      popUpType: 'pop-up-shop',
      businessName: 'Display Only Shop',
    });

    const page = composePage({
      siteData,
      userFeatures: { onlineOrdering: { enabled: false } },
    });

    expect(page.features.onlineOrdering.enabled).toBe(false);
    expect(page.sections.length).toBeGreaterThan(0);
  });
});

describe('Bazaar / Refined character isolation', () => {
  it('an Atelier site composed after a Bazaar site still uses Refined tokens', () => {
    const bazaarData = buildBazaarSiteData({
      popUpType: 'food-stall',
      businessName: 'Bazaar Test',
    });
    const bazaarPage = composePage({ siteData: bazaarData });

    const atelierData = {
      businessName: 'Salon Test',
      services: [{ name: 'Cut' }],
      team: [{ name: 'Stylist' }],
    };
    const atelierPage = composePage({
      siteData: atelierData,
      layout: 'atelier',
      character: 'refined',
      level: 'solo',
      niche: 'salon',
    });

    expect(bazaarPage.character).toBe('approachable');
    expect(bazaarPage.tokens.theme.mode).toBe('ivory');

    expect(atelierPage.character).toBe('refined');
    expect(atelierPage.tokens.theme.mode).toBe('onyx');
    expect(atelierPage.tokens.theme.bg).toBe('#0c0c0e');
    expect(atelierPage.tokens.typography.display.family).toContain('Fraunces');
  });
});