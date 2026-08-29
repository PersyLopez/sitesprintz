import { describe, it, expect } from 'vitest';
import { buildSiteData, PRIVATE_STREET } from '../../scripts/create-plants-and-threads-claimable.js';
import { applyLocaleOverlay } from '../../src/utils/localeOverlay.js';
import { publicSiteContainsStreet, toPublicSiteData } from '../../src/utils/liveSiteContact.js';

describe('plants-and-threads claimable', () => {
  it('keeps the street private on the public payload', () => {
    const site = buildSiteData();
    const pub = toPublicSiteData(site);
    expect(site.contact.privateStreet).toMatch(/Walnut/i);
    expect(publicSiteContainsStreet(pub, PRIVATE_STREET)).toBe(false);
    expect(publicSiteContainsStreet(pub, '429 Walnut')).toBe(false);
    expect(pub.contact.addressDisplay).toBe('area');
    expect(pub.settings.payOnSite).toBe(true);
    expect(site._demo).toBe(false);
  });

  it('overlays Spanish body copy without renaming the brand', () => {
    const site = buildSiteData();
    const es = applyLocaleOverlay(site, 'es');
    expect(es.brand.name).toBe('Plants & Threads');
    expect(JSON.stringify(es)).toMatch(/Plantas a la venta/);
    expect(JSON.stringify(es)).toMatch(/Servicios de costura/);
  });

  it('lists the four hibiscus grid photos as $20 products, not a collage', () => {
    const site = buildSiteData();
    const catalog = (site.sections || []).find((section) => section.type === 'catalog');
    const items = catalog?.content?.items || [];
    const gridNames = ['Orange hibiscus', 'Pink hibiscus', 'Coral hibiscus', 'Apricot hibiscus'];
    for (const name of gridNames) {
      const item = items.find((entry) => entry.name === name);
      expect(item?.price).toBe('$20');
      expect(item?.image).toMatch(/hibiscus-(orange|pink|coral|apricot)\.jpg$/);
    }
    expect(JSON.stringify(site)).not.toMatch(/hibiscus-grid/);
  });
});
