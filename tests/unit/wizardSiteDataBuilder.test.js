/**
 * Tests for wizardSiteDataBuilder.js — TDD red-green cycles
 *
 * Seams tested:
 *   1. Exports buildSiteDataFromWizard
 *   2. Delegates to buildBazaarSiteData for bazaar niches (yard-sale, food-stall)
 *   3. Delegates to buildNicheSiteData for refined niches (salon, plumbing)
 *   4. Passes through businessName and contact info
 *   5. Passes through level for refined niches
 *   6. Throws / falls back when niche is unknown (returns null)
 *   7. Passes through features overrides
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSiteDataFromWizard } from '../../src/utils/wizardSiteDataBuilder';

describe('wizardSiteDataBuilder — buildSiteDataFromWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is a function', () => {
    expect(typeof buildSiteDataFromWizard).toBe('function');
  });

  it('delegates to buildBazaarSiteData for yard-sale (bazaar niche)', () => {
    const formState = {
      niche: 'yard-sale',
      businessName: 'Maple Street Yard Sale',
      level: 'solo',
      contactPhone: '555-1234',
      contactEmail: 'sale@example.com',
      location: '123 Maple St',
      hours: 'Sat 8am–2pm',
    };

    const siteData = buildSiteDataFromWizard(formState);

    expect(siteData).toBeTruthy();
    expect(siteData._layout).toBe('bazaar');
    expect(siteData._character).toBe('approachable');
    // businessName surfaces in hero eyebrow
    expect(JSON.stringify(siteData)).toContain('Maple Street Yard Sale');
  });

  it('delegates to buildBazaarSiteData for food-stall', () => {
    const formState = {
      niche: 'food-stall',
      businessName: 'Maria\'s Tacos',
    };

    const siteData = buildSiteDataFromWizard(formState);

    expect(siteData._layout).toBe('bazaar');
    expect(siteData._character).toBe('approachable');
  });

  it('delegates to buildNicheSiteData for salon (refined niche)', () => {
    const formState = {
      niche: 'salon',
      businessName: 'Studio Luxe',
      level: 'studio',
    };

    const siteData = buildSiteDataFromWizard(formState);

    expect(siteData).toBeTruthy();
    expect(siteData._layout).toBe('atelier');
    expect(siteData._character).toBe('refined');
    expect(siteData._level).toBe('studio');
  });

  it('delegates to buildNicheSiteData for plumbing (craftsman)', () => {
    const formState = {
      niche: 'plumbing',
      businessName: 'Reliable Pipes',
      level: 'established',
    };

    const siteData = buildSiteDataFromWizard(formState);

    expect(siteData._layout).toBe('craftsman');
    expect(siteData._character).toBe('refined');
    expect(siteData._level).toBe('established');
  });

  it('passes through contact info to refined niches', () => {
    const formState = {
      niche: 'salon',
      businessName: 'Studio Luxe',
      level: 'solo',
      contactPhone: '555-9999',
      contactEmail: 'hello@studioluxe.com',
      contactAddress: '1 Main St',
    };

    const siteData = buildSiteDataFromWizard(formState);

    const contactSection = siteData.sections?.find((s) => s.type === 'contact');
    expect(contactSection).toBeTruthy();
    expect(JSON.stringify(contactSection)).toContain('555-9999');
  });

  it('passes through features overrides to refined niches', () => {
    const formState = {
      niche: 'salon',
      businessName: 'Studio Luxe',
      level: 'solo',
      features: {
        booking: { enabled: true },
        onlinePayment: { enabled: false },
        cashPayment: { enabled: true },
      },
    };

    const siteData = buildSiteDataFromWizard(formState);

    expect(siteData._features).toBeTruthy();
    expect(siteData._features.booking.enabled).toBe(true);
    expect(siteData._features.onlinePayment.enabled).toBe(false);
    expect(siteData._features.cashPayment.enabled).toBe(true);
    expect(siteData.settings.payOnSite).toBe(true);
    expect(siteData.booking.enabled).toBe(true);
    expect(siteData.settings.bookingEnabled).toBe(true);
  });

  it('does not enable native booking for craftsman sites', () => {
    const siteData = buildSiteDataFromWizard({
      niche: 'plumbing',
      businessName: 'Reliable Pipes',
    });
    expect(siteData._features.booking.enabled).toBe(false);
    expect(siteData.booking?.enabled).not.toBe(true);
    expect(siteData.settings.bookingEnabled).not.toBe(true);
  });

  it('returns null for an unknown niche', () => {
    const formState = {
      niche: 'not-a-real-niche',
      businessName: 'Unknown',
    };

    const siteData = buildSiteDataFromWizard(formState);

    expect(siteData).toBeNull();
  });

  it('handles missing niche gracefully', () => {
    const siteData = buildSiteDataFromWizard({ businessName: 'No Niche' });
    expect(siteData).toBeNull();
  });

  it('passes location and hours to bazaar builder', () => {
    const formState = {
      niche: 'food-stall',
      businessName: 'Maria\'s Tacos',
      location: 'Corner of 5th & Main',
      hours: 'Tue–Sun 11am–9pm',
    };

    const siteData = buildSiteDataFromWizard(formState);

    expect(siteData._layout).toBe('bazaar');
    expect(JSON.stringify(siteData)).toContain('Corner of 5th & Main');
    expect(JSON.stringify(siteData)).toContain('Tue–Sun 11am–9pm');
  });

  it('applies the niche default curated theme when none is chosen', () => {
    const siteData = buildSiteDataFromWizard({
      niche: 'salon',
      businessName: 'Studio Luxe',
      level: 'studio',
    });

    expect(siteData._themeId).toBe('onyx-oxblood');
    expect(siteData.colors.themeId).toBe('onyx-oxblood');
    expect(siteData.colors.accent).toBe('#d16b6b');
    expect(siteData.colors.onAccent).toBe('#140808');
  });

  it('applies an explicit curated theme id', () => {
    const siteData = buildSiteDataFromWizard({
      niche: 'salon',
      businessName: 'Studio Luxe',
      level: 'studio',
      themeId: 'ivory-navy',
    });

    expect(siteData._themeId).toBe('ivory-navy');
    expect(siteData.colors.accent).toBe('#2c4a86');
    expect(siteData.colors.mode).toBe('light');
  });

  it('seeds canonical social keys and findability sections for salon', () => {
    const siteData = buildSiteDataFromWizard({
      niche: 'salon',
      businessName: 'Studio Luxe',
      level: 'solo',
    });
    const types = siteData.sections.map((s) => s.type);
    const contactIdx = types.indexOf('contact');
    expect(types[contactIdx - 2]).toBe('hours');
    expect(types[contactIdx - 1]).toBe('location');
    expect(types[contactIdx + 1]).toBe('social');
    expect(siteData.social).toMatchObject({
      facebook: '',
      instagram: '',
      whatsapp: '',
      tiktok: '',
      maps: '',
      website: '',
      linkedin: '',
    });
  });

  it('ignores unknown theme ids and falls back to the niche default', () => {
    const siteData = buildSiteDataFromWizard({
      niche: 'electrician',
      businessName: 'Brightline',
      themeId: 'tech-cyan',
    });

    expect(siteData._themeId).toBe('onyx-ink');
  });
});