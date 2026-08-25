import { describe, it, expect } from 'vitest';
import { publicSiteContainsStreet, toPublicSiteData } from '../../src/utils/liveSiteContact.js';

const STREET = '99 Hidden Ln Unit 4B';

function leakingOwnerSite() {
  return {
    contact: {
      address: STREET,
      privateStreet: STREET,
      addressDisplay: 'area',
      serviceAreaLabel: 'Montclair, NJ',
      serviceRadiusMiles: 10,
      coordinates: { lat: 40.81111, lng: -74.20999 },
      geoSeed: 'abc123',
      publicGeo: { lat: 40.82, lng: -74.21 },
    },
    contactAddress: STREET,
    businessAddress: STREET,
    googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(STREET)}`,
    social: { maps: `https://maps.google.com/?q=${encodeURIComponent(STREET)}` },
    sections: [
      { type: 'contact', content: { address: STREET, mapUrl: `https://maps.google.com/?q=${encodeURIComponent(STREET)}` } },
      { type: 'location', content: { address: STREET, mapUrl: `https://maps.google.com/?q=${encodeURIComponent(STREET)}` } },
    ],
  };
}

describe('toPublicSiteData leak audit', () => {
  it('removes the private street from every public inventory key', () => {
    const owner = leakingOwnerSite();
    const publicData = toPublicSiteData(owner);

    expect(publicSiteContainsStreet(publicData, STREET)).toBe(false);
    expect(publicData.contact.address).toBe('Serving Montclair, NJ · within 10 miles');
    expect(publicData.contactAddress).toBe('Serving Montclair, NJ · within 10 miles');
    expect(publicData.contact.privateStreet).toBeUndefined();
    expect(publicData.contact.coordinates).toBeUndefined();
    expect(publicData.contact.geoSeed).toBeUndefined();
    expect(publicData.googleMapsUrl).toBe('');
    expect(publicData.social.maps).toBe('');
    expect(publicData.sections[0].content.address).toBe('Serving Montclair, NJ · within 10 miles');
    expect(publicData.sections[1].content.mapUrl).toBe('');
    expect(owner.contact.address).toBe(STREET);
  });

  it('leaves street mode unchanged', () => {
    const owner = { contact: { address: STREET, addressDisplay: 'street' } };
    const publicData = toPublicSiteData(owner);
    expect(publicData.contact.address).toBe(STREET);
  });
});
