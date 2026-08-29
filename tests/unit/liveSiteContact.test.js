import { describe, it, expect } from 'vitest';
import {
  ADDRESS_DISPLAY_AREA,
  assertPublishableLocation,
  formatServiceAreaLine,
  normalizeServiceRadiusMiles,
  publicSiteContainsStreet,
  resolvePrimaryCta,
  resolvePrivateAddressForBuyer,
  resolvePublicLocation,
  resolveSiteAddress,
  resolveSitePhone,
  shouldRemoveBranding,
  telHref,
  toPublicSiteData,
} from '../../src/utils/liveSiteContact.js';

describe('liveSiteContact', () => {
  it('builds a digit-only tel href', () => {
    expect(telHref('(555) 010-0')).toBe('tel:5550100');
    expect(telHref('')).toBe('');
  });

  it('maps layout intent to a header CTA', () => {
    expect(resolvePrimaryCta({ _layout: 'atelier' }).href).toBe('#booking');
    expect(resolvePrimaryCta({ _layout: 'craftsman' }).label).toBe('Get a Quote');
    expect(resolvePrimaryCta({ _layout: 'mercantile' }).href).toBe('#catalog');
  });

  it('reads phone from contact or a contact section', () => {
    expect(resolveSitePhone({ contactPhone: '555-1' })).toBe('555-1');
    expect(resolveSitePhone({
      sections: [{ type: 'contact', content: { phone: '555-2' } }],
    })).toBe('555-2');
  });

  it('keeps the SiteSprintz badge on Growth even if an old setting asks to hide it', () => {
    expect(shouldRemoveBranding({ plan: 'growth', settings: { removeBranding: true } })).toBe(false);
    expect(shouldRemoveBranding({ settings: { removeBranding: true } })).toBe(false);
    expect(shouldRemoveBranding({ plan: 'starter' })).toBe(false);
  });

  it('returns the street in street mode', () => {
    expect(resolveSiteAddress({ contactAddress: '12 Maple St' })).toBe('12 Maple St');
    expect(resolveSiteAddress({
      contact: { address: '99 Hidden Ln' },
    })).toBe('99 Hidden Ln');
  });

  it('never returns the street in area mode', () => {
    const siteData = {
      contact: {
        address: '99 Hidden Ln Unit 4B',
        addressDisplay: ADDRESS_DISPLAY_AREA,
        serviceAreaLabel: 'Montclair, NJ',
        serviceRadiusMiles: 10,
      },
    };
    expect(resolveSiteAddress(siteData)).toBe('Serving Montclair, NJ · within 10 miles');
    expect(resolveSiteAddress(siteData)).not.toContain('99 Hidden');
    expect(resolvePrivateAddressForBuyer(siteData)).toBe('99 Hidden Ln Unit 4B');
  });

  it('rewrites gallery demo contact email to platform support', () => {
    const publicData = toPublicSiteData({
      _demo: true,
      settings: { demoMode: true },
      contact: { email: 'hello@luxebeautystudio.com' },
      contactEmail: 'hello@luxebeautystudio.com',
      brand: { email: 'hello@luxebeautystudio.com' },
    });
    expect(publicData.contact.email).toBe('support@sitesprintz.com');
    expect(publicData.contactEmail).toBe('support@sitesprintz.com');
    expect(publicData.brand.email).toBe('support@sitesprintz.com');
  });

  it('leaves real site contact email alone', () => {
    const publicData = toPublicSiteData({
      contact: { email: 'owner@truecuts.example' },
    });
    expect(publicData.contact.email).toBe('owner@truecuts.example');
  });

  it('returns no buyer street unless area mode is on', () => {
    expect(resolvePrivateAddressForBuyer({
      contact: { address: '99 Hidden Ln', addressDisplay: 'street' },
    })).toBe('');
  });

  it('rejects incomplete area mode on publish', () => {
    expect(() => assertPublishableLocation({
      contact: { addressDisplay: ADDRESS_DISPLAY_AREA },
    })).toThrow(/service area and radius/i);
    expect(normalizeServiceRadiusMiles(12)).toBeNull();
    expect(formatServiceAreaLine('Montclair, NJ', 10)).toContain('10 miles');
  });

  it('exposes publicGeo on the public location when present', () => {
    const location = resolvePublicLocation({
      contact: {
        addressDisplay: ADDRESS_DISPLAY_AREA,
        serviceAreaLabel: 'Montclair, NJ',
        serviceRadiusMiles: 10,
        publicGeo: { lat: 40.8, lng: -74.2 },
      },
    });
    expect(location.showMapCircle).toBe(true);
    expect(location.publicGeo).toEqual({ lat: 40.8, lng: -74.2 });
  });
});
