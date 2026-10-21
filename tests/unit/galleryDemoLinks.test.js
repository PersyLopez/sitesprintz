/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { assembleSiteData, stripUnownedAccountLinks } from '../../scripts/seed-gallery-example-sites.js';

const ELECTRICIAN = {
  subdomain: 'gallery-electrician',
  niche: 'electrician',
  level: 'studio',
  featured: true,
  plan: 'starter',
  businessName: 'Brightline Electric',
  contactPhone: '(555) 410-2200',
  contactEmail: 'dispatch@brightlineelectric.com',
  themeId: 'onyx-ink',
};

describe('gallery demo account links (QA C-06)', () => {
  const siteData = assembleSiteData(ELECTRICIAN);
  const json = JSON.stringify(siteData);

  it('does not carry the template social accounts onto gallery-electrician', () => {
    expect(json).not.toContain('facebook.com/');
  });

  it('does not carry the template Calendly link onto gallery-electrician', () => {
    expect(json).not.toContain('calendly.com/');
  });
});

describe('stripUnownedAccountLinks', () => {
  it('blanks social, review, and booking account links', () => {
    const input = {
      social: { facebook: 'https://facebook.com/apexelectric', instagram: 'https://instagram.com/apexelectric' },
      booking: 'https://calendly.com/apexelectric',
      review: ['https://yelp.com/biz/apexelectric', 'https://tiktok.com/@apexelectric', 'https://twitter.com/apexelectric'],
    };
    expect(JSON.stringify(stripUnownedAccountLinks(input))).not.toContain('facebook.com/');
    expect(JSON.stringify(stripUnownedAccountLinks(input))).not.toContain('calendly.com/');
  });

  it('keeps maps search URLs and non-link strings', () => {
    const input = {
      address: '123 Tech Park Ave',
      map: 'https://maps.google.com/?q=electrician',
      hours: 'Mon-Fri 8am-6pm',
    };
    const output = stripUnownedAccountLinks(input);
    expect(output.map).toBe('https://maps.google.com/?q=electrician');
    expect(output.address).toBe('123 Tech Park Ave');
    expect(output.hours).toBe('Mon-Fri 8am-6pm');
  });

  it('does not mutate the value it is given', () => {
    const raw = { social: { facebook: 'https://facebook.com/apexelectric' } };
    stripUnownedAccountLinks(raw);
    expect(raw.social.facebook).toBe('https://facebook.com/apexelectric');
  });
});
